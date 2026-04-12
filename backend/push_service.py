"""
Push Notification Service - Expo Push Notifications
Gestisce l'invio di notifiche push tramite Expo Push API
"""
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

class ExpoPushService:
    """Servizio per invio notifiche push tramite Expo"""
    
    @staticmethod
    async def send_push_notification(
        push_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: Optional[int] = None,
        sound: str = "default",
        priority: str = "high",
        channel_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Invia notifica push a uno o più dispositivi
        
        Args:
            push_tokens: Lista di Expo push token (ExponentPushToken[xxx])
            title: Titolo della notifica
            body: Corpo della notifica
            data: Dati aggiuntivi per deep linking
            badge: Numero badge da mostrare (iOS)
            sound: Suono da riprodurre
            priority: Priorità notifica (high/normal/default)
            channel_id: ID canale Android
        
        Returns:
            Dict con risultati invio
        """
        if not push_tokens:
            logger.warning("Nessun push token fornito")
            return {"success": False, "error": "No push tokens provided", "sent": 0, "failed": 0}
        
        # Filtra token validi (Expo push tokens iniziano con ExponentPushToken[)
        valid_tokens = [t for t in push_tokens if t and t.startswith("ExponentPushToken[")]
        
        if not valid_tokens:
            logger.warning(f"Nessun token valido tra {len(push_tokens)} forniti")
            return {"success": False, "error": "No valid Expo push tokens", "sent": 0, "failed": 0}
        
        # Prepara messaggi (Expo accetta max 100 per richiesta)
        messages = []
        for token in valid_tokens:
            message = {
                "to": token,
                "title": title,
                "body": body,
                "sound": sound,
                "priority": priority,
                "channelId": channel_id,
            }
            
            if data:
                message["data"] = data
            
            if badge is not None:
                message["badge"] = badge
            
            messages.append(message)
        
        # Invia in batch
        results = {"success": True, "sent": 0, "failed": 0, "errors": [], "tickets": []}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Expo accetta max 100 messaggi per richiesta
                for i in range(0, len(messages), 100):
                    batch = messages[i:i+100]
                    
                    response = await client.post(
                        EXPO_PUSH_URL,
                        json=batch,
                        headers={
                            "Accept": "application/json",
                            "Accept-Encoding": "gzip, deflate",
                            "Content-Type": "application/json",
                        }
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        tickets = response_data.get("data", [])
                        
                        for ticket in tickets:
                            if ticket.get("status") == "ok":
                                results["sent"] += 1
                                results["tickets"].append(ticket.get("id"))
                            else:
                                results["failed"] += 1
                                error_msg = ticket.get("message", "Unknown error")
                                error_details = ticket.get("details", {})
                                results["errors"].append({
                                    "message": error_msg,
                                    "details": error_details
                                })
                                logger.warning(f"Push failed: {error_msg} - {error_details}")
                    else:
                        logger.error(f"Expo API error: {response.status_code} - {response.text}")
                        results["failed"] += len(batch)
                        results["errors"].append({
                            "message": f"HTTP {response.status_code}",
                            "details": response.text[:200]
                        })
            
            results["success"] = results["sent"] > 0
            logger.info(f"Push notification results: {results['sent']} sent, {results['failed']} failed")
            
        except Exception as e:
            logger.error(f"Error sending push notifications: {e}")
            results["success"] = False
            results["failed"] = len(valid_tokens)
            results["errors"].append({"message": str(e)})
        
        return results

    @staticmethod
    async def send_single_push(
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        badge: Optional[int] = None
    ) -> Dict[str, Any]:
        """Convenience method per inviare a singolo dispositivo"""
        return await ExpoPushService.send_push_notification(
            push_tokens=[push_token],
            title=title,
            body=body,
            data=data,
            badge=badge
        )


# Funzioni helper per eventi specifici

async def send_document_notification(db, client_id: str, document_name: str, document_id: str):
    """Invia notifica per nuovo documento"""
    # Trova push tokens del cliente
    tokens = await get_client_push_tokens(db, client_id)
    if not tokens:
        logger.info(f"No push tokens for client {client_id}")
        return
    
    await ExpoPushService.send_push_notification(
        push_tokens=tokens,
        title="Nuovo documento disponibile",
        body=f"È stato caricato un nuovo documento: {document_name}",
        data={
            "type": "document",
            "document_id": document_id,
            "screen": "Documents",
            "action": "open_document"
        }
    )

async def send_deadline_notification(db, client_id: str, deadline_title: str, deadline_id: str, due_date: str):
    """Invia notifica per nuova scadenza"""
    tokens = await get_client_push_tokens(db, client_id)
    if not tokens:
        return
    
    await ExpoPushService.send_push_notification(
        push_tokens=tokens,
        title="Nuova scadenza fiscale",
        body=f"Hai una nuova scadenza: {deadline_title}",
        data={
            "type": "deadline",
            "deadline_id": deadline_id,
            "screen": "Calendar",
            "action": "open_deadline"
        }
    )

async def send_message_notification(db, client_id: str, sender_name: str, message_preview: str):
    """Invia notifica per nuovo messaggio"""
    tokens = await get_client_push_tokens(db, client_id)
    if not tokens:
        return
    
    preview = message_preview[:100] + "..." if len(message_preview) > 100 else message_preview
    
    await ExpoPushService.send_push_notification(
        push_tokens=tokens,
        title=f"Nuovo messaggio da {sender_name}",
        body=preview,
        data={
            "type": "message",
            "screen": "Communications",
            "action": "open_messages"
        }
    )

async def send_ticket_reply_notification(db, client_id: str, ticket_id: str, ticket_subject: str):
    """Invia notifica per risposta ticket"""
    tokens = await get_client_push_tokens(db, client_id)
    if not tokens:
        return
    
    await ExpoPushService.send_push_notification(
        push_tokens=tokens,
        title="Risposta al tuo ticket",
        body=f"Il tuo ticket '{ticket_subject}' ha ricevuto una nuova risposta",
        data={
            "type": "ticket",
            "ticket_id": ticket_id,
            "screen": "TicketDetail",
            "action": "open_ticket"
        }
    )

async def send_custom_notification(db, client_id: str, title: str, body: str, notification_id: str):
    """Invia notifica personalizzata dall'admin"""
    tokens = await get_client_push_tokens(db, client_id)
    if not tokens:
        return
    
    await ExpoPushService.send_push_notification(
        push_tokens=tokens,
        title=title,
        body=body,
        data={
            "type": "notification",
            "notification_id": notification_id,
            "screen": "Notifications",
            "action": "open_notification"
        }
    )

async def get_client_push_tokens(db, client_id: str) -> List[str]:
    """Recupera tutti i push token attivi di un cliente"""
    # Verifica preferenze notifiche del cliente
    user = await db.users.find_one({"id": client_id}, {"_id": 0, "push_notifications_enabled": 1})
    if user and user.get("push_notifications_enabled") == False:
        logger.info(f"Push notifications disabled for client {client_id}")
        return []
    
    # Recupera token attivi
    tokens_cursor = db.push_tokens.find(
        {"client_id": client_id, "active": True},
        {"_id": 0, "token": 1}
    )
    tokens = await tokens_cursor.to_list(10)  # Max 10 dispositivi per cliente
    
    return [t["token"] for t in tokens if t.get("token")]

async def send_push_to_multiple_clients(db, client_ids: List[str], title: str, body: str, data: Optional[Dict] = None):
    """Invia push a più clienti"""
    all_tokens = []
    
    for client_id in client_ids:
        tokens = await get_client_push_tokens(db, client_id)
        all_tokens.extend(tokens)
    
    if not all_tokens:
        logger.info(f"No push tokens found for {len(client_ids)} clients")
        return {"success": False, "sent": 0, "failed": 0}
    
    return await ExpoPushService.send_push_notification(
        push_tokens=all_tokens,
        title=title,
        body=body,
        data=data
    )
