"""
Modulo Notifiche - Gestione completa notifiche admin
Supporta: tipi, template, invio email (Brevo) e in-app, programmazione
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import base64
import logging

from .deps import get_db, require_commercialista, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ==================== MODELS ====================

class NotificationTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "bell"
    color: str = "#3caca4"
    is_default: bool = False

class NotificationTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class NotificationTemplateCreate(BaseModel):
    name: str
    type_id: str
    subject: str
    body: str
    styles: Optional[Dict[str, Any]] = None

class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    type_id: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    styles: Optional[Dict[str, Any]] = None

class NotificationSettingsUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    logo_url: Optional[str] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    company_name: Optional[str] = None

class NotificationSend(BaseModel):
    type_id: str
    subject: str
    body: str
    target_type: str  # "all", "category", "specific"
    target_categories: Optional[List[str]] = None  # ["societa", "autonomo", ...]
    target_client_ids: Optional[List[str]] = None
    send_email: bool = True
    send_inapp: bool = True
    scheduled_at: Optional[datetime] = None  # None = invio immediato
    styles: Optional[Dict[str, Any]] = None
    template_id: Optional[str] = None

class NotificationPreview(BaseModel):
    subject: str
    body: str
    styles: Optional[Dict[str, Any]] = None

# ==================== DEFAULT DATA ====================

DEFAULT_NOTIFICATION_TYPES = [
    {"id": "generale", "name": "Notifica Generale", "description": "Comunicazioni generiche", "icon": "bell", "color": "#3caca4", "is_default": True},
    {"id": "informativa", "name": "Notifica Informativa", "description": "Informazioni importanti", "icon": "info", "color": "#3b82f6", "is_default": True},
    {"id": "scadenza", "name": "Notifica di Scadenza", "description": "Avvisi scadenze fiscali", "icon": "calendar", "color": "#f59e0b", "is_default": True},
    {"id": "documentale", "name": "Notifica Documentale", "description": "Richieste documenti", "icon": "file-text", "color": "#8b5cf6", "is_default": True},
    {"id": "amministrativa", "name": "Notifica Amministrativa", "description": "Comunicazioni amministrative", "icon": "briefcase", "color": "#64748b", "is_default": True},
    {"id": "urgente", "name": "Notifica Urgente", "description": "Comunicazioni urgenti", "icon": "alert-triangle", "color": "#ef4444", "is_default": True},
]

DEFAULT_SETTINGS = {
    "id": "default",
    "primary_color": "#3caca4",
    "secondary_color": "#1e293b",
    "accent_color": "#f59e0b",
    "logo_url": None,
    "header_text": "Fiscal Tax Canarie",
    "footer_text": "© 2026 Fiscal Tax Canarie - Tutti i diritti riservati",
    "company_name": "Fiscal Tax Canarie",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat()
}

# ==================== NOTIFICATION TYPES ====================

@router.get("/types")
async def get_notification_types(user: dict = Depends(require_commercialista)):
    """Lista tutti i tipi di notifica"""
    db = get_db()
    types = await db.notification_types.find({}, {"_id": 0}).to_list(100)
    
    # Crea tipi default se non esistono
    if not types:
        for nt in DEFAULT_NOTIFICATION_TYPES:
            nt["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.notification_types.insert_one(nt)
        types = await db.notification_types.find({}, {"_id": 0}).to_list(100)
    
    return types

@router.post("/types")
async def create_notification_type(data: NotificationTypeCreate, user: dict = Depends(require_admin)):
    """Crea un nuovo tipo di notifica"""
    db = get_db()
    
    # Verifica nome unico
    existing = await db.notification_types.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Tipo con questo nome già esistente")
    
    new_type = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "icon": data.icon,
        "color": data.color,
        "is_default": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.notification_types.insert_one(new_type)
    if "_id" in new_type:
        del new_type["_id"]
    return new_type

@router.put("/types/{type_id}")
async def update_notification_type(type_id: str, data: NotificationTypeUpdate, user: dict = Depends(require_admin)):
    """Modifica un tipo di notifica"""
    db = get_db()
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.notification_types.update_one({"id": type_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    
    return {"message": "Tipo aggiornato"}

@router.delete("/types/{type_id}")
async def delete_notification_type(type_id: str, user: dict = Depends(require_admin)):
    """Elimina un tipo di notifica (solo se non è default)"""
    db = get_db()
    
    nt = await db.notification_types.find_one({"id": type_id})
    if not nt:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    
    if nt.get("is_default"):
        raise HTTPException(status_code=400, detail="Non puoi eliminare un tipo predefinito")
    
    # Verifica se ci sono notifiche con questo tipo
    count = await db.notifications_sent.count_documents({"type_id": type_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Ci sono {count} notifiche con questo tipo. Impossibile eliminare.")
    
    await db.notification_types.delete_one({"id": type_id})
    return {"message": "Tipo eliminato"}

# ==================== TEMPLATES ====================

@router.get("/templates")
async def get_notification_templates(user: dict = Depends(require_commercialista)):
    """Lista tutti i template"""
    db = get_db()
    templates = await db.notification_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@router.post("/templates")
async def create_notification_template(data: NotificationTemplateCreate, user: dict = Depends(require_commercialista)):
    """Crea un nuovo template"""
    db = get_db()
    
    template = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "type_id": data.type_id,
        "subject": data.subject,
        "body": data.body,
        "styles": data.styles or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notification_templates.insert_one(template)
    return {"id": template["id"], "message": "Template creato"}

@router.get("/templates/{template_id}")
async def get_notification_template(template_id: str, user: dict = Depends(require_commercialista)):
    """Ottieni un singolo template"""
    db = get_db()
    template = await db.notification_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return template

@router.put("/templates/{template_id}")
async def update_notification_template(template_id: str, data: NotificationTemplateUpdate, user: dict = Depends(require_commercialista)):
    """Modifica un template"""
    db = get_db()
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.notification_templates.update_one({"id": template_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    
    return {"message": "Template aggiornato"}

@router.delete("/templates/{template_id}")
async def delete_notification_template(template_id: str, user: dict = Depends(require_commercialista)):
    """Elimina un template"""
    db = get_db()
    result = await db.notification_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"message": "Template eliminato"}

# ==================== SETTINGS ====================

@router.get("/settings")
async def get_notification_settings(user: dict = Depends(require_commercialista)):
    """Ottieni impostazioni grafiche notifiche"""
    db = get_db()
    settings = await db.notification_settings.find_one({"id": "default"}, {"_id": 0})
    
    if not settings:
        await db.notification_settings.insert_one(DEFAULT_SETTINGS.copy())
        settings = DEFAULT_SETTINGS.copy()
    
    return settings

@router.put("/settings")
async def update_notification_settings(data: NotificationSettingsUpdate, user: dict = Depends(require_admin)):
    """Aggiorna impostazioni grafiche"""
    db = get_db()
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Upsert
    await db.notification_settings.update_one(
        {"id": "default"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Impostazioni aggiornate"}

@router.post("/settings/logo")
async def upload_notification_logo(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Upload logo per notifiche"""
    db = get_db()
    
    # Verifica tipo file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    
    # Leggi e converti in base64
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # Max 2MB
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 2MB)")
    
    logo_data = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
    
    await db.notification_settings.update_one(
        {"id": "default"},
        {"$set": {"logo_url": logo_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Logo caricato", "logo_url": logo_data[:100] + "..."}

# ==================== PREVIEW ====================

@router.post("/preview")
async def preview_notification(data: NotificationPreview, user: dict = Depends(require_commercialista)):
    """Genera anteprima HTML della notifica"""
    db = get_db()
    
    # Ottieni settings
    settings = await db.notification_settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        settings = DEFAULT_SETTINGS.copy()
    
    # Merge styles
    styles = {**settings, **(data.styles or {})}
    
    html = generate_notification_html(data.subject, data.body, styles)
    
    return {"html": html, "styles": styles}

# ==================== SEND NOTIFICATION ====================

@router.post("/send")
async def send_notification(
    data: NotificationSend,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_commercialista)
):
    """Invia notifica a destinatari selezionati"""
    db = get_db()
    
    # Determina destinatari
    recipients = await get_notification_recipients(db, data.target_type, data.target_categories, data.target_client_ids)
    
    if not recipients:
        raise HTTPException(status_code=400, detail="Nessun destinatario trovato")
    
    # Ottieni settings
    settings = await db.notification_settings.find_one({"id": "default"}, {"_id": 0})
    if not settings:
        settings = DEFAULT_SETTINGS.copy()
    
    styles = {**settings, **(data.styles or {})}
    
    # Crea record notifica
    notification_id = str(uuid.uuid4())
    notification_record = {
        "id": notification_id,
        "type_id": data.type_id,
        "subject": data.subject,
        "body": data.body,
        "target_type": data.target_type,
        "target_categories": data.target_categories,
        "target_client_ids": data.target_client_ids,
        "recipients_count": len(recipients),
        "send_email": data.send_email,
        "send_inapp": data.send_inapp,
        "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
        "status": "scheduled" if data.scheduled_at else "sending",
        "styles": styles,
        "template_id": data.template_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "sent_count": 0,
        "failed_count": 0
    }
    
    await db.notifications_sent.insert_one(notification_record)
    
    # Se programmato, salva e basta
    if data.scheduled_at:
        return {
            "id": notification_id,
            "message": f"Notifica programmata per {data.scheduled_at.isoformat()}",
            "recipients_count": len(recipients),
            "status": "scheduled"
        }
    
    # Invio immediato in background
    background_tasks.add_task(
        process_notification_send,
        notification_id,
        data.subject,
        data.body,
        recipients,
        styles,
        data.send_email,
        data.send_inapp
    )
    
    return {
        "id": notification_id,
        "message": f"Invio in corso a {len(recipients)} destinatari",
        "recipients_count": len(recipients),
        "status": "sending"
    }

@router.get("/send/{notification_id}/status")
async def get_notification_status(notification_id: str, user: dict = Depends(require_commercialista)):
    """Ottieni stato invio notifica"""
    db = get_db()
    notification = await db.notifications_sent.find_one({"id": notification_id}, {"_id": 0})
    if not notification:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    return notification

# ==================== HISTORY ====================

@router.get("/history")
async def get_notifications_history_extended(
    limit: int = 50,
    skip: int = 0,
    status: Optional[str] = None,
    user: dict = Depends(require_commercialista)
):
    """Storico notifiche inviate con filtri"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    notifications = await db.notifications_sent.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.notifications_sent.count_documents(query)
    
    return {"items": notifications, "total": total}

@router.get("/scheduled")
async def get_scheduled_notifications(user: dict = Depends(require_commercialista)):
    """Lista notifiche programmate"""
    db = get_db()
    notifications = await db.notifications_sent.find(
        {"status": "scheduled"},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(50)
    return notifications

@router.delete("/scheduled/{notification_id}")
async def cancel_scheduled_notification(notification_id: str, user: dict = Depends(require_commercialista)):
    """Annulla notifica programmata"""
    db = get_db()
    
    notification = await db.notifications_sent.find_one({"id": notification_id, "status": "scheduled"})
    if not notification:
        raise HTTPException(status_code=404, detail="Notifica programmata non trovata")
    
    await db.notifications_sent.update_one(
        {"id": notification_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Notifica annullata"}

# ==================== CLIENT IN-APP NOTIFICATIONS ====================

@router.get("/client/inbox")
async def get_client_notifications(
    limit: int = 20,
    unread_only: bool = False,
    user: dict = Depends(require_commercialista)  # Will be overridden for clients
):
    """Ottieni notifiche in-app per il cliente corrente"""
    db = get_db()
    
    query = {"client_id": user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.client_notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    unread_count = await db.client_notifications.count_documents({"client_id": user["id"], "read": False})
    
    return {"items": notifications, "unread_count": unread_count}

@router.put("/client/inbox/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_commercialista)):
    """Segna notifica come letta"""
    db = get_db()
    
    result = await db.client_notifications.update_one(
        {"id": notification_id, "client_id": user["id"]},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    
    return {"message": "Notifica segnata come letta"}

@router.put("/client/inbox/read-all")
async def mark_all_notifications_read(user: dict = Depends(require_commercialista)):
    """Segna tutte le notifiche come lette"""
    db = get_db()
    
    await db.client_notifications.update_many(
        {"client_id": user["id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Tutte le notifiche segnate come lette"}

# ==================== HELPER FUNCTIONS ====================

async def get_notification_recipients(db, target_type: str, categories: Optional[List[str]], client_ids: Optional[List[str]]) -> List[Dict]:
    """Determina lista destinatari in base ai criteri"""
    
    # Nota: I clienti sono nella collection 'users' con role='cliente'
    base_query = {"role": "cliente"}
    
    if target_type == "all":
        # Tutti i clienti attivi
        clients = await db.users.find(
            {**base_query, "stato": {"$in": ["attivo", None, "Attivo"]}},
            {"_id": 0, "id": 1, "email": 1, "full_name": 1, "first_name": 1, "last_name": 1}
        ).to_list(1000)
        return clients
    
    elif target_type == "category" and categories:
        # Clienti per categoria
        clients = await db.users.find(
            {**base_query, "tipo_cliente": {"$in": categories}, "stato": {"$in": ["attivo", None, "Attivo"]}},
            {"_id": 0, "id": 1, "email": 1, "full_name": 1, "first_name": 1, "last_name": 1, "tipo_cliente": 1}
        ).to_list(1000)
        return clients
    
    elif target_type == "specific" and client_ids:
        # Clienti specifici
        clients = await db.users.find(
            {**base_query, "id": {"$in": client_ids}},
            {"_id": 0, "id": 1, "email": 1, "full_name": 1, "first_name": 1, "last_name": 1}
        ).to_list(len(client_ids))
        return clients
    
    return []

async def process_notification_send(
    notification_id: str,
    subject: str,
    body: str,
    recipients: List[Dict],
    styles: Dict,
    send_email: bool,
    send_inapp: bool
):
    """Processa invio notifica in background"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    
    # Nuova connessione DB per task background
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    sent_count = 0
    failed_count = 0
    
    html_content = generate_notification_html(subject, body, styles)
    
    for recipient in recipients:
        try:
            # Notifica in-app
            if send_inapp:
                inapp_notification = {
                    "id": str(uuid.uuid4()),
                    "notification_id": notification_id,
                    "client_id": recipient["id"],
                    "subject": subject,
                    "body": body,
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.client_notifications.insert_one(inapp_notification)
            
            # Email
            if send_email and recipient.get("email"):
                from email_service import send_email
                result = await send_email(
                    to_email=recipient["email"],
                    to_name=recipient.get("full_name") or f"{recipient.get('first_name', '')} {recipient.get('last_name', '')}".strip(),
                    subject=subject,
                    html_content=html_content
                )
                if not result.get("success"):
                    logger.warning(f"Email fallita per {recipient['email']}: {result.get('error')}")
                    failed_count += 1
                    continue
            
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Errore invio a {recipient.get('email', recipient['id'])}: {e}")
            failed_count += 1
    
    # Aggiorna stato notifica
    await db.notifications_sent.update_one(
        {"id": notification_id},
        {"$set": {
            "status": "completed",
            "sent_count": sent_count,
            "failed_count": failed_count,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    client.close()
    logger.info(f"Notifica {notification_id} completata: {sent_count} inviate, {failed_count} fallite")

def generate_notification_html(subject: str, body: str, styles: Dict) -> str:
    """Genera HTML email con stili personalizzati"""
    
    primary_color = styles.get("primary_color", "#3caca4")
    secondary_color = styles.get("secondary_color", "#1e293b")
    accent_color = styles.get("accent_color", "#f59e0b")
    logo_url = styles.get("logo_url", "")
    header_text = styles.get("header_text", "Fiscal Tax Canarie")
    footer_text = styles.get("footer_text", "© 2026 Fiscal Tax Canarie")
    company_name = styles.get("company_name", "Fiscal Tax Canarie")
    
    # Converti newline in <br> e paragrafi
    body_html = body.replace("\n\n", "</p><p>").replace("\n", "<br>")
    body_html = f"<p>{body_html}</p>"
    
    logo_section = ""
    if logo_url:
        logo_section = f'<img src="{logo_url}" alt="{company_name}" style="max-height: 60px; margin-bottom: 20px;">'
    
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {primary_color} 0%, {secondary_color} 100%); padding: 30px 40px; text-align: center;">
                            {logo_section}
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{header_text}</h1>
                        </td>
                    </tr>
                    
                    <!-- Subject -->
                    <tr>
                        <td style="padding: 30px 40px 20px; border-bottom: 3px solid {primary_color};">
                            <h2 style="color: {secondary_color}; margin: 0; font-size: 20px; font-weight: 600;">{subject}</h2>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 30px 40px; color: #374151; font-size: 16px; line-height: 1.6;">
                            {body_html}
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 30px; text-align: center;">
                            <a href="https://app.fiscaltaxcanarie.com" style="display: inline-block; background-color: {primary_color}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                Accedi all'Area Clienti
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: {secondary_color}; padding: 25px 40px; text-align: center;">
                            <p style="color: #9ca3af; margin: 0; font-size: 13px;">{footer_text}</p>
                            <p style="color: #6b7280; margin: 10px 0 0; font-size: 12px;">
                                Questa email è stata inviata automaticamente. Per assistenza: info@fiscaltaxcanarie.com
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html
