"""
Scheduler per task automatici - Fiscal Tax Canarie
Gestisce i promemoria automatici delle scadenze
"""
import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

# Scheduler globale
scheduler = AsyncIOScheduler()

async def check_deadline_reminders():
    """
    Controlla le scadenze e invia promemoria automatici.
    Eseguito ogni giorno alle 9:00.
    """
    from server import db, notify_deadline_reminder
    from push_service import send_deadline_notification
    
    logger.info("[Scheduler] Controllo promemoria scadenze...")
    
    try:
        today = datetime.now(timezone.utc).date()
        reminder_days = [7, 3, 1, 0]  # Giorni prima della scadenza
        sent_count = 0
        errors = []
        
        # Trova tutte le scadenze attive
        deadlines = await db.deadlines.find({
            "status": {"$ne": "completed"}
        }).to_list(1000)
        
        for deadline in deadlines:
            due_date_str = deadline.get("due_date") or deadline.get("date")
            if not due_date_str:
                continue
                
            try:
                if isinstance(due_date_str, str):
                    due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')).date()
                else:
                    due_date = due_date_str.date() if hasattr(due_date_str, 'date') else due_date_str
                    
                days_until = (due_date - today).days
                
                # Verifica se oggi è un giorno di promemoria
                if days_until in reminder_days:
                    # Ottieni i clienti associati
                    client_ids = deadline.get("client_ids", [])
                    if not client_ids and deadline.get("client_id"):
                        client_ids = [deadline.get("client_id")]
                    
                    if not client_ids:
                        continue
                    
                    # Carica i clienti
                    clients = await db.clients.find({
                        "$or": [
                            {"id": {"$in": client_ids}},
                            {"_id": {"$in": client_ids}}
                        ]
                    }).to_list(100)
                    
                    days_text = "oggi" if days_until == 0 else f"tra {days_until} giorni"
                    
                    for client in clients:
                        client_id = client.get("id") or str(client.get("_id"))
                        
                        try:
                            # Push notification
                            await send_deadline_notification(
                                db,
                                client_id,
                                f"[Promemoria] {deadline['title']} - {days_text}",
                                deadline.get("id") or str(deadline.get("_id")),
                                due_date_str
                            )
                            
                            # Notifica in-app
                            import uuid
                            await db.client_notifications.insert_one({
                                "id": str(uuid.uuid4()),
                                "notification_id": str(uuid.uuid4()),
                                "client_id": client_id,
                                "subject": "Promemoria scadenza",
                                "body": f"La scadenza '{deadline['title']}' è {days_text}",
                                "type": "deadline_reminder",
                                "data": {"deadline_id": deadline.get("id") or str(deadline.get("_id"))},
                                "read": False,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                            
                            # Email (se disponibile)
                            if client.get("email"):
                                try:
                                    await notify_deadline_reminder(
                                        client_email=client["email"],
                                        client_name=client.get("full_name", "Cliente"),
                                        deadline_title=f"[PROMEMORIA] {deadline['title']}",
                                        deadline_date=due_date_str,
                                        deadline_description=f"La scadenza è {days_text}. {deadline.get('description', '')}"
                                    )
                                except Exception as email_err:
                                    logger.warning(f"Email reminder failed: {email_err}")
                            
                            sent_count += 1
                            
                        except Exception as client_err:
                            errors.append(f"Client {client_id}: {str(client_err)}")
                            
            except Exception as date_err:
                logger.warning(f"Error parsing date for deadline {deadline.get('id')}: {date_err}")
                continue
        
        logger.info(f"[Scheduler] Promemoria completato: {sent_count} inviati, {len(errors)} errori")
        
        # Log risultato nel database
        await db.scheduler_logs.insert_one({
            "task": "check_deadline_reminders",
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "sent_count": sent_count,
            "errors": errors[:10] if errors else [],
            "status": "success" if not errors else "partial"
        })
        
    except Exception as e:
        logger.error(f"[Scheduler] Errore durante controllo promemoria: {e}")
        

def setup_scheduler():
    """Configura e avvia lo scheduler."""
    
    # Promemoria scadenze - ogni giorno alle 9:00 UTC
    scheduler.add_job(
        check_deadline_reminders,
        CronTrigger(hour=9, minute=0),
        id='deadline_reminders_daily',
        name='Daily Deadline Reminders',
        replace_existing=True
    )
    
    # Promemoria scadenze - anche alle 18:00 per scadenze urgenti
    scheduler.add_job(
        check_deadline_reminders,
        CronTrigger(hour=18, minute=0),
        id='deadline_reminders_evening',
        name='Evening Deadline Reminders',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("[Scheduler] Avviato - Promemoria alle 9:00 e 18:00 UTC")


def shutdown_scheduler():
    """Ferma lo scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] Fermato")
