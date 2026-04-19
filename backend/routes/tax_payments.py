"""
Gestione Importi Tributari - API
Sezione admin per gestire importi da pagare per dichiarazioni/modelli tributari
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tax-payments", tags=["Tax Payments"])

# =============================================================================
# AUTENTICAZIONE
# =============================================================================

async def get_current_admin(authorization: str = None):
    """Verifica che l'utente sia admin/commercialista/super_admin"""
    from server import db, JWT_SECRET, JWT_ALGORITHM
    import jwt
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token mancante")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        
        # Verifica ruolo admin
        if user.get("role") not in ["commercialista", "super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

from fastapi import Header

async def get_admin_user(authorization: str = Header(None)):
    return await get_current_admin(authorization)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_id():
    return str(uuid.uuid4())

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_db():
    from server import db
    return db

# =============================================================================
# ENUMS E MODELLI
# =============================================================================

class Periodicity(str, Enum):
    MENSILE = "mensile"
    TRIMESTRALE = "trimestrale"
    ANNUALE = "annuale"
    UNA_TANTUM = "una_tantum"

class NotificationStatus(str, Enum):
    NON_INVIATA = "non_inviata"
    INVIATA = "inviata"
    VISUALIZZATA = "visualizzata"
    PAGATA = "pagata"

# --- Tax Models ---

class TaxModelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    applicable_categories: List[str] = Field(default_factory=list)  # es. ["autonomo", "societa"]
    periodicity: Periodicity = Periodicity.TRIMESTRALE
    default_due_day: Optional[int] = Field(None, ge=1, le=31)  # Giorno del mese
    is_active: bool = True

class TaxModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    applicable_categories: Optional[List[str]] = None
    periodicity: Optional[Periodicity] = None
    default_due_day: Optional[int] = None
    is_active: Optional[bool] = None

# --- Payment Assignments ---

class PaymentAssignmentCreate(BaseModel):
    client_id: str
    tax_model_id: str
    amount_due: float = Field(..., ge=0)
    due_date: str  # ISO date
    period: str  # es. "Q1 2025", "Gennaio 2025", "Anno 2025"
    internal_notes: Optional[str] = None

class PaymentAssignmentUpdate(BaseModel):
    amount_due: Optional[float] = None
    due_date: Optional[str] = None
    period: Optional[str] = None
    internal_notes: Optional[str] = None
    notification_status: Optional[NotificationStatus] = None

class BulkPaymentAssignment(BaseModel):
    """Per assegnazione massiva"""
    tax_model_id: str
    period: str
    due_date: str
    assignments: List[Dict[str, Any]]  # [{"client_id": "...", "amount_due": 100.00, "internal_notes": "..."}]

# =============================================================================
# API - TAX MODELS (Modelli Tributari)
# =============================================================================

@router.get("/models")
async def list_tax_models(
    include_inactive: bool = False,
    user: dict = Depends(get_admin_user)
):
    """Lista tutti i modelli tributari"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = True
    
    models = await db.tax_models.find(query, {"_id": 0}).sort("name", 1).to_list(None)
    return models

@router.post("/models")
async def create_tax_model(
    data: TaxModelCreate,
    user: dict = Depends(get_admin_user)
):
    """Crea un nuovo modello tributario"""
    db = get_db()
    
    # Verifica nome duplicato
    existing = await db.tax_models.find_one({"name": data.name.strip()})
    if existing:
        raise HTTPException(status_code=400, detail="Esiste già un modello con questo nome")
    
    model = {
        "id": generate_id(),
        "name": data.name.strip(),
        "description": data.description,
        "applicable_categories": data.applicable_categories,
        "periodicity": data.periodicity.value,
        "default_due_day": data.default_due_day,
        "is_active": data.is_active,
        "created_by": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    
    await db.tax_models.insert_one(model)
    del model["_id"]
    
    logger.info(f"Modello tributario creato: {model['name']} da {user['email']}")
    return model

@router.put("/models/{model_id}")
async def update_tax_model(
    model_id: str,
    data: TaxModelUpdate,
    user: dict = Depends(get_admin_user)
):
    """Aggiorna un modello tributario"""
    db = get_db()
    
    model = await db.tax_models.find_one({"id": model_id})
    if not model:
        raise HTTPException(status_code=404, detail="Modello non trovato")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "periodicity" in update_data:
        update_data["periodicity"] = update_data["periodicity"].value
    update_data["updated_at"] = now_iso()
    
    await db.tax_models.update_one({"id": model_id}, {"$set": update_data})
    
    updated = await db.tax_models.find_one({"id": model_id}, {"_id": 0})
    return updated

@router.delete("/models/{model_id}")
async def delete_tax_model(
    model_id: str,
    user: dict = Depends(get_admin_user)
):
    """Disattiva un modello tributario (soft delete)"""
    db = get_db()
    
    model = await db.tax_models.find_one({"id": model_id})
    if not model:
        raise HTTPException(status_code=404, detail="Modello non trovato")
    
    # Soft delete - disattiva invece di eliminare
    await db.tax_models.update_one(
        {"id": model_id}, 
        {"$set": {"is_active": False, "updated_at": now_iso()}}
    )
    
    return {"success": True, "message": "Modello disattivato"}

# =============================================================================
# API - PAYMENT ASSIGNMENTS (Assegnazioni Importi)
# =============================================================================

@router.get("/assignments")
async def list_payment_assignments(
    tax_model_id: Optional[str] = None,
    client_id: Optional[str] = None,
    client_category: Optional[str] = None,
    period: Optional[str] = None,
    notification_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_admin_user)
):
    """Lista assegnazioni importi con filtri"""
    db = get_db()
    
    query = {}
    
    if tax_model_id:
        query["tax_model_id"] = tax_model_id
    if client_id:
        query["client_id"] = client_id
    if client_category:
        query["client_category"] = client_category
    if period:
        query["period"] = period
    if notification_status:
        query["notification_status"] = notification_status
    if search:
        query["$or"] = [
            {"client_name": {"$regex": search, "$options": "i"}},
            {"client_email": {"$regex": search, "$options": "i"}},
            {"tax_model_name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.payment_assignments.count_documents(query)
    
    assignments = await db.payment_assignments.find(query, {"_id": 0}) \
        .sort([("due_date", 1), ("client_name", 1)]) \
        .skip(skip) \
        .limit(limit) \
        .to_list(None)
    
    return {
        "assignments": assignments,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/assignments")
async def create_payment_assignment(
    data: PaymentAssignmentCreate,
    user: dict = Depends(get_admin_user)
):
    """Crea una nuova assegnazione importo"""
    db = get_db()
    
    # Verifica cliente
    client = await db.users.find_one({"id": data.client_id, "role": "cliente"}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Verifica modello
    tax_model = await db.tax_models.find_one({"id": data.tax_model_id, "is_active": True}, {"_id": 0})
    if not tax_model:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato o non attivo")
    
    # Verifica duplicato (stesso cliente, modello, periodo)
    existing = await db.payment_assignments.find_one({
        "client_id": data.client_id,
        "tax_model_id": data.tax_model_id,
        "period": data.period
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Esiste già un'assegnazione per questo cliente, modello e periodo"
        )
    
    assignment = {
        "id": generate_id(),
        "client_id": data.client_id,
        "client_name": client.get("full_name", client.get("email")),
        "client_email": client.get("email"),
        "client_category": client.get("tipo_cliente", "autonomo"),
        "tax_model_id": data.tax_model_id,
        "tax_model_name": tax_model["name"],
        "amount_due": data.amount_due,
        "due_date": data.due_date,
        "period": data.period,
        "internal_notes": data.internal_notes,
        "notification_status": NotificationStatus.NON_INVIATA.value,
        "created_by": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    
    await db.payment_assignments.insert_one(assignment)
    del assignment["_id"]
    
    logger.info(f"Assegnazione creata: {client['email']} - {tax_model['name']} - €{data.amount_due}")
    return assignment

@router.put("/assignments/{assignment_id}")
async def update_payment_assignment(
    assignment_id: str,
    data: PaymentAssignmentUpdate,
    user: dict = Depends(get_admin_user)
):
    """Aggiorna un'assegnazione importo"""
    db = get_db()
    
    assignment = await db.payment_assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assegnazione non trovata")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if "notification_status" in update_data:
        update_data["notification_status"] = update_data["notification_status"].value
    update_data["updated_at"] = now_iso()
    update_data["updated_by"] = user["id"]
    
    await db.payment_assignments.update_one({"id": assignment_id}, {"$set": update_data})
    
    updated = await db.payment_assignments.find_one({"id": assignment_id}, {"_id": 0})
    return updated

@router.delete("/assignments/{assignment_id}")
async def delete_payment_assignment(
    assignment_id: str,
    user: dict = Depends(get_admin_user)
):
    """Elimina un'assegnazione importo"""
    db = get_db()
    
    result = await db.payment_assignments.delete_one({"id": assignment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assegnazione non trovata")
    
    return {"success": True, "message": "Assegnazione eliminata"}

# =============================================================================
# API - BULK OPERATIONS (Operazioni Massive)
# =============================================================================

@router.post("/assignments/bulk")
async def bulk_create_assignments(
    data: BulkPaymentAssignment,
    user: dict = Depends(get_admin_user)
):
    """Crea assegnazioni importi in modo massivo"""
    db = get_db()
    
    # Verifica modello
    tax_model = await db.tax_models.find_one({"id": data.tax_model_id, "is_active": True}, {"_id": 0})
    if not tax_model:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    
    created = 0
    updated = 0
    errors = []
    
    for item in data.assignments:
        client_id = item.get("client_id")
        amount_due = item.get("amount_due", 0)
        internal_notes = item.get("internal_notes", "")
        
        if not client_id:
            errors.append({"client_id": None, "error": "client_id mancante"})
            continue
        
        # Verifica cliente
        client = await db.users.find_one({"id": client_id, "role": "cliente"}, {"_id": 0})
        if not client:
            errors.append({"client_id": client_id, "error": "Cliente non trovato"})
            continue
        
        # Cerca esistente
        existing = await db.payment_assignments.find_one({
            "client_id": client_id,
            "tax_model_id": data.tax_model_id,
            "period": data.period
        })
        
        if existing:
            # Aggiorna esistente
            await db.payment_assignments.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "amount_due": amount_due,
                    "due_date": data.due_date,
                    "internal_notes": internal_notes,
                    "updated_at": now_iso(),
                    "updated_by": user["id"]
                }}
            )
            updated += 1
        else:
            # Crea nuovo
            assignment = {
                "id": generate_id(),
                "client_id": client_id,
                "client_name": client.get("full_name", client.get("email")),
                "client_email": client.get("email"),
                "client_category": client.get("tipo_cliente", "autonomo"),
                "tax_model_id": data.tax_model_id,
                "tax_model_name": tax_model["name"],
                "amount_due": amount_due,
                "due_date": data.due_date,
                "period": data.period,
                "internal_notes": internal_notes,
                "notification_status": NotificationStatus.NON_INVIATA.value,
                "created_by": user["id"],
                "created_at": now_iso(),
                "updated_at": now_iso()
            }
            await db.payment_assignments.insert_one(assignment)
            created += 1
    
    logger.info(f"Bulk assignment: creati {created}, aggiornati {updated}, errori {len(errors)}")
    
    return {
        "success": True,
        "created": created,
        "updated": updated,
        "errors": errors
    }

@router.delete("/assignments/bulk")
async def bulk_delete_assignments(
    assignment_ids: List[str] = Query(...),
    user: dict = Depends(get_admin_user)
):
    """Elimina assegnazioni in modo massivo"""
    db = get_db()
    
    result = await db.payment_assignments.delete_many({"id": {"$in": assignment_ids}})
    
    return {
        "success": True,
        "deleted": result.deleted_count
    }

# =============================================================================
# API - STATISTICHE E UTILITIES
# =============================================================================

@router.get("/stats")
async def get_tax_payment_stats(
    user: dict = Depends(get_admin_user)
):
    """Statistiche generali per la dashboard"""
    db = get_db()
    
    # Conteggi per stato notifica
    pipeline = [
        {"$group": {
            "_id": "$notification_status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount_due"}
        }}
    ]
    
    status_stats = await db.payment_assignments.aggregate(pipeline).to_list(None)
    
    # Conteggio modelli attivi
    models_count = await db.tax_models.count_documents({"is_active": True})
    
    # Totale assegnazioni
    total_assignments = await db.payment_assignments.count_documents({})
    
    # Importo totale
    total_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount_due"}}}]
    total_result = await db.payment_assignments.aggregate(total_pipeline).to_list(None)
    total_amount = total_result[0]["total"] if total_result else 0
    
    # Prossime scadenze (entro 7 giorni - urgenti)
    from datetime import timedelta
    today = datetime.now(timezone.utc).date().isoformat()
    seven_days = (datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat()
    
    upcoming = await db.payment_assignments.count_documents({
        "due_date": {"$gte": today, "$lte": seven_days},
        "notification_status": {"$ne": "pagata"}
    })
    
    return {
        "models_count": models_count,
        "total_assignments": total_assignments,
        "total_amount": total_amount,
        "upcoming_deadlines": upcoming,
        "by_status": {item["_id"]: {"count": item["count"], "amount": item["total_amount"]} for item in status_stats}
    }

@router.get("/client-categories")
async def get_client_categories(
    user: dict = Depends(get_admin_user)
):
    """Ottiene le categorie clienti esistenti (dinamiche dal DB)"""
    db = get_db()
    
    # Estrai categorie uniche dai clienti
    pipeline = [
        {"$match": {"role": "cliente"}},
        {"$group": {"_id": "$tipo_cliente"}},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(None)
    
    categories = [r["_id"] for r in results if r["_id"]]
    
    # Aggiungi categorie di default se non presenti
    default_categories = ["autonomo", "societa", "privato", "casa_vacanza"]
    for cat in default_categories:
        if cat not in categories:
            categories.append(cat)
    
    return sorted(categories)

@router.get("/clients-by-category/{category}")
async def get_clients_by_category(
    category: str,
    user: dict = Depends(get_admin_user)
):
    """Ottiene i clienti di una specifica categoria"""
    db = get_db()
    
    query = {"role": "cliente"}
    if category != "all":
        query["tipo_cliente"] = category
    
    clients = await db.users.find(
        query,
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "tipo_cliente": 1}
    ).sort("full_name", 1).to_list(None)
    
    return clients

@router.get("/periods")
async def get_available_periods():
    """Genera i periodi disponibili per selezione"""
    from datetime import datetime
    
    current_year = datetime.now().year
    years = [current_year - 1, current_year, current_year + 1]
    
    periods = []
    
    for year in years:
        # Trimestri
        periods.append(f"Q1 {year}")
        periods.append(f"Q2 {year}")
        periods.append(f"Q3 {year}")
        periods.append(f"Q4 {year}")
        
        # Mesi
        months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
        for month in months:
            periods.append(f"{month} {year}")
        
        # Anno completo
        periods.append(f"Anno {year}")
    
    return periods

# =============================================================================
# NOTIFICHE - EMAIL E PUSH
# =============================================================================

class NotificationRequest(BaseModel):
    """Richiesta invio notifica singola"""
    assignment_id: str
    custom_message: Optional[str] = None
    send_email: bool = True
    send_push: bool = True

class BulkNotificationRequest(BaseModel):
    """Richiesta invio notifiche massive"""
    assignment_ids: List[str]
    custom_message: Optional[str] = None
    send_email: bool = True
    send_push: bool = True

class NotificationTemplate(BaseModel):
    """Template notifica personalizzabile"""
    name: str
    subject: str
    body_template: str
    is_default: bool = False


def get_payment_email_template(
    client_name: str,
    tax_model_name: str,
    period: str,
    amount: float,
    due_date: str,
    custom_message: str = None
) -> tuple:
    """Genera template email per importo da pagare"""
    
    # Formatta la data
    try:
        date_obj = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        formatted_date = date_obj.strftime("%d/%m/%Y")
    except (ValueError, TypeError):
        formatted_date = due_date
    
    # Formatta importo
    formatted_amount = f"€{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    subject = f"Importo da pagare: {tax_model_name} - {period}"
    
    custom_section = ""
    if custom_message:
        custom_section = f"""
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #495057;">{custom_message}</p>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
            .amount-box {{ background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }}
            .amount {{ font-size: 36px; font-weight: bold; color: #166534; margin: 10px 0; }}
            .details {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }}
            .detail-row:last-child {{ border-bottom: none; }}
            .label {{ color: #64748b; }}
            .value {{ font-weight: 600; color: #1e293b; }}
            .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; }}
            .cta-button {{ display: inline-block; background: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 24px;">Fiscal Tax Canarie</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Comunicazione Importo da Pagare</p>
            </div>
            
            <div class="content">
                <p>Gentile <strong>{client_name}</strong>,</p>
                
                <p>Le comunichiamo l'importo da versare per il seguente adempimento fiscale:</p>
                
                {custom_section}
                
                <div class="amount-box">
                    <p style="margin: 0; color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Importo da Pagare</p>
                    <p class="amount">{formatted_amount}</p>
                    <p style="margin: 0; color: #166534;">Scadenza: <strong>{formatted_date}</strong></p>
                </div>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="label">Modello/Dichiarazione:</span>
                        <span class="value">{tax_model_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Periodo di riferimento:</span>
                        <span class="value">{period}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Data scadenza:</span>
                        <span class="value">{formatted_date}</span>
                    </div>
                </div>
                
                <p>Per qualsiasi chiarimento, non esiti a contattarci.</p>
                
                <p>Cordiali saluti,<br><strong>Fiscal Tax Canarie</strong></p>
            </div>
            
            <div class="footer">
                <p>Fiscal Tax Canarie<br>
                Email: info@fiscaltaxcanarie.com</p>
                <p style="color: #94a3b8; font-size: 11px;">Questa email è stata inviata automaticamente. Per favore non rispondere a questo indirizzo.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
Gentile {client_name},

Le comunichiamo l'importo da versare per il seguente adempimento fiscale:

{custom_message if custom_message else ''}

IMPORTO DA PAGARE: {formatted_amount}
SCADENZA: {formatted_date}

Dettagli:
- Modello/Dichiarazione: {tax_model_name}
- Periodo: {period}

Per qualsiasi chiarimento, non esiti a contattarci.

Cordiali saluti,
Fiscal Tax Canarie
info@fiscaltaxcanarie.com
    """
    
    return subject, html_content, text_content


@router.post("/notifications/send")
async def send_single_notification(
    data: NotificationRequest,
    user: dict = Depends(get_admin_user)
):
    """Invia notifica singola a un cliente per un importo assegnato"""
    db = get_db()
    from email_service import send_email
    from push_service import ExpoPushService
    
    # Trova assegnazione
    assignment = await db.payment_assignments.find_one({"id": data.assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assegnazione non trovata")
    
    # Trova cliente
    client = await db.users.find_one({"id": assignment["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    results = {
        "email": {"sent": False, "error": None},
        "push": {"sent": False, "error": None}
    }
    
    # Prepara dati
    client_name = client.get("full_name", client.get("email", "Cliente"))
    client_email = client.get("email")
    push_token = client.get("push_token")
    
    # Invia Email
    if data.send_email and client_email:
        try:
            subject, html_content, text_content = get_payment_email_template(
                client_name=client_name,
                tax_model_name=assignment["tax_model_name"],
                period=assignment["period"],
                amount=assignment["amount_due"],
                due_date=assignment["due_date"],
                custom_message=data.custom_message
            )
            
            email_result = await send_email(
                to_email=client_email,
                to_name=client_name,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            results["email"]["sent"] = email_result.get("success", False)
            if not email_result.get("success"):
                results["email"]["error"] = email_result.get("error")
                
        except Exception as e:
            logger.error(f"Errore invio email: {e}")
            results["email"]["error"] = str(e)
    
    # Invia Push Notification
    if data.send_push and push_token:
        try:
            # Formatta importo
            formatted_amount = f"€{assignment['amount_due']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            
            push_result = await ExpoPushService.send_push_notification(
                push_tokens=[push_token],
                title=f"Importo da pagare: {assignment['tax_model_name']}",
                body=f"{formatted_amount} - Scadenza: {assignment['due_date'][:10]}",
                data={
                    "type": "payment_due",
                    "assignment_id": assignment["id"],
                    "amount": assignment["amount_due"],
                    "tax_model": assignment["tax_model_name"],
                    "period": assignment["period"]
                }
            )
            
            results["push"]["sent"] = push_result.get("sent", 0) > 0
            if push_result.get("failed", 0) > 0:
                results["push"]["error"] = "Push notification failed"
                
        except Exception as e:
            logger.error(f"Errore invio push: {e}")
            results["push"]["error"] = str(e)
    
    # Aggiorna stato assegnazione
    update_data = {
        "notification_status": "inviata",
        "updated_at": now_iso()
    }
    
    if results["email"]["sent"]:
        update_data["email_sent_at"] = now_iso()
        update_data["email_sent_by"] = user["id"]
    
    if results["push"]["sent"]:
        update_data["push_sent_at"] = now_iso()
    
    if data.custom_message:
        update_data["last_custom_message"] = data.custom_message
    
    if results["email"]["error"] or results["push"]["error"]:
        update_data["last_notification_error"] = {
            "email": results["email"]["error"],
            "push": results["push"]["error"],
            "timestamp": now_iso()
        }
    
    await db.payment_assignments.update_one(
        {"id": data.assignment_id},
        {"$set": update_data}
    )
    
    logger.info(f"Notifica inviata per assegnazione {data.assignment_id}: email={results['email']['sent']}, push={results['push']['sent']}")
    
    return {
        "success": results["email"]["sent"] or results["push"]["sent"],
        "assignment_id": data.assignment_id,
        "client_name": client_name,
        "results": results
    }


@router.post("/notifications/send-bulk")
async def send_bulk_notifications(
    data: BulkNotificationRequest,
    user: dict = Depends(get_admin_user)
):
    """Invia notifiche massive a più clienti"""
    db = get_db()
    from email_service import send_email
    from push_service import ExpoPushService
    
    if not data.assignment_ids:
        raise HTTPException(status_code=400, detail="Nessuna assegnazione selezionata")
    
    # Trova tutte le assegnazioni
    assignments = await db.payment_assignments.find(
        {"id": {"$in": data.assignment_ids}},
        {"_id": 0}
    ).to_list(None)
    
    if not assignments:
        raise HTTPException(status_code=404, detail="Nessuna assegnazione trovata")
    
    # Raccogli tutti i client_id
    client_ids = list(set(a["client_id"] for a in assignments))
    
    # Trova tutti i clienti
    clients = await db.users.find(
        {"id": {"$in": client_ids}},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "push_token": 1}
    ).to_list(None)
    
    clients_map = {c["id"]: c for c in clients}
    
    results = {
        "total": len(assignments),
        "email_sent": 0,
        "email_failed": 0,
        "push_sent": 0,
        "push_failed": 0,
        "details": []
    }
    
    # Processa ogni assegnazione
    for assignment in assignments:
        client = clients_map.get(assignment["client_id"])
        if not client:
            results["details"].append({
                "assignment_id": assignment["id"],
                "status": "error",
                "error": "Cliente non trovato"
            })
            continue
        
        client_name = client.get("full_name", client.get("email", "Cliente"))
        client_email = client.get("email")
        push_token = client.get("push_token")
        
        detail = {
            "assignment_id": assignment["id"],
            "client_name": client_name,
            "email_sent": False,
            "push_sent": False
        }
        
        # Invia Email
        if data.send_email and client_email:
            try:
                subject, html_content, text_content = get_payment_email_template(
                    client_name=client_name,
                    tax_model_name=assignment["tax_model_name"],
                    period=assignment["period"],
                    amount=assignment["amount_due"],
                    due_date=assignment["due_date"],
                    custom_message=data.custom_message
                )
                
                email_result = await send_email(
                    to_email=client_email,
                    to_name=client_name,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content
                )
                
                if email_result.get("success"):
                    detail["email_sent"] = True
                    results["email_sent"] += 1
                else:
                    results["email_failed"] += 1
                    detail["email_error"] = email_result.get("error")
                    
            except Exception as e:
                results["email_failed"] += 1
                detail["email_error"] = str(e)
        
        # Invia Push
        if data.send_push and push_token:
            try:
                formatted_amount = f"€{assignment['amount_due']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                
                push_result = await ExpoPushService.send_push_notification(
                    push_tokens=[push_token],
                    title=f"Importo da pagare: {assignment['tax_model_name']}",
                    body=f"{formatted_amount} - Scadenza: {assignment['due_date'][:10]}",
                    data={
                        "type": "payment_due",
                        "assignment_id": assignment["id"]
                    }
                )
                
                if push_result.get("sent", 0) > 0:
                    detail["push_sent"] = True
                    results["push_sent"] += 1
                else:
                    results["push_failed"] += 1
                    
            except Exception as e:
                results["push_failed"] += 1
                detail["push_error"] = str(e)
        
        # Aggiorna stato assegnazione
        update_data = {
            "notification_status": "inviata",
            "updated_at": now_iso()
        }
        
        if detail["email_sent"]:
            update_data["email_sent_at"] = now_iso()
            update_data["email_sent_by"] = user["id"]
        
        if detail["push_sent"]:
            update_data["push_sent_at"] = now_iso()
        
        if data.custom_message:
            update_data["last_custom_message"] = data.custom_message
        
        await db.payment_assignments.update_one(
            {"id": assignment["id"]},
            {"$set": update_data}
        )
        
        results["details"].append(detail)
    
    logger.info(f"Notifiche massive inviate: {results['email_sent']} email, {results['push_sent']} push")
    
    return {
        "success": True,
        "summary": {
            "total": results["total"],
            "email_sent": results["email_sent"],
            "email_failed": results["email_failed"],
            "push_sent": results["push_sent"],
            "push_failed": results["push_failed"]
        },
        "details": results["details"]
    }


@router.get("/notifications/history/{assignment_id}")
async def get_notification_history(
    assignment_id: str,
    user: dict = Depends(get_admin_user)
):
    """Ottiene lo storico notifiche per un'assegnazione"""
    db = get_db()
    
    assignment = await db.payment_assignments.find_one(
        {"id": assignment_id},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assegnazione non trovata")
    
    return {
        "assignment_id": assignment_id,
        "notification_status": assignment.get("notification_status", "non_inviata"),
        "email_sent_at": assignment.get("email_sent_at"),
        "email_sent_by": assignment.get("email_sent_by"),
        "push_sent_at": assignment.get("push_sent_at"),
        "last_custom_message": assignment.get("last_custom_message"),
        "last_notification_error": assignment.get("last_notification_error")
    }


@router.post("/notifications/mark-as-paid")
async def mark_assignment_as_paid(
    assignment_ids: List[str],
    user: dict = Depends(get_admin_user)
):
    """Segna le assegnazioni come pagate"""
    db = get_db()
    
    result = await db.payment_assignments.update_many(
        {"id": {"$in": assignment_ids}},
        {"$set": {
            "notification_status": "pagata",
            "paid_at": now_iso(),
            "marked_paid_by": user["id"],
            "updated_at": now_iso()
        }}
    )
    
    return {
        "success": True,
        "updated": result.modified_count
    }


# =============================================================================
# API - CLIENT (Endpoint per l'app mobile cliente)
# =============================================================================

async def get_current_client(authorization: str = Header(None)):
    """Verifica che l'utente sia un cliente"""
    from server import db, JWT_SECRET, JWT_ALGORITHM
    import jwt
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token mancante")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


@router.get("/client/payments")
async def get_client_payments(
    status: Optional[str] = Query(None, description="upcoming, expired, all"),
    user: dict = Depends(get_current_client)
):
    """
    Ottiene gli importi da pagare per il cliente corrente.
    
    - status=upcoming: solo importi con scadenza futura (default per home)
    - status=expired: solo importi con scadenza passata (storico)
    - status=all: tutti gli importi
    """
    db = get_db()
    
    today = datetime.now(timezone.utc).date().isoformat()
    
    query = {"client_id": user["id"]}
    
    if status == "upcoming":
        query["due_date"] = {"$gte": today}
    elif status == "expired":
        query["due_date"] = {"$lt": today}
    
    assignments = await db.payment_assignments.find(
        query,
        {"_id": 0}
    ).sort("due_date", 1).to_list(None)
    
    # Calcola giorni mancanti e stato per ogni assegnazione
    result = []
    for a in assignments:
        try:
            due = datetime.fromisoformat(a["due_date"].replace('Z', '+00:00')).date()
            today_date = datetime.now(timezone.utc).date()
            days_left = (due - today_date).days
        except (ValueError, TypeError):
            days_left = 0
        
        # Determina urgenza
        if days_left < 0:
            urgency = "expired"
        elif days_left <= 3:
            urgency = "urgent"
        elif days_left <= 7:
            urgency = "warning"
        else:
            urgency = "normal"
        
        result.append({
            **a,
            "days_left": days_left,
            "urgency": urgency,
            "is_expired": days_left < 0
        })
    
    # Statistiche
    upcoming_count = sum(1 for r in result if r["days_left"] >= 0)
    expired_count = sum(1 for r in result if r["days_left"] < 0)
    total_upcoming = sum(r["amount_due"] for r in result if r["days_left"] >= 0)
    
    return {
        "payments": result,
        "stats": {
            "upcoming_count": upcoming_count,
            "expired_count": expired_count,
            "total_upcoming_amount": total_upcoming
        }
    }


@router.get("/client/payments/calendar")
async def get_client_payments_calendar(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    user: dict = Depends(get_current_client)
):
    """
    Ottiene gli importi da pagare per il calendario del cliente.
    Raggruppa per data di scadenza.
    """
    db = get_db()
    
    # Default: mese corrente
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    # Range date per il mese
    start_date = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        end_date = f"{target_year + 1}-01-01"
    else:
        end_date = f"{target_year}-{target_month + 1:02d}-01"
    
    query = {
        "client_id": user["id"],
        "due_date": {"$gte": start_date, "$lt": end_date}
    }
    
    assignments = await db.payment_assignments.find(
        query,
        {"_id": 0}
    ).sort("due_date", 1).to_list(None)
    
    # Raggruppa per data
    by_date = {}
    for a in assignments:
        date_key = a["due_date"][:10]  # YYYY-MM-DD
        if date_key not in by_date:
            by_date[date_key] = {
                "date": date_key,
                "payments": [],
                "total_amount": 0,
                "count": 0
            }
        by_date[date_key]["payments"].append(a)
        by_date[date_key]["total_amount"] += a["amount_due"]
        by_date[date_key]["count"] += 1
    
    # Converti in lista
    calendar_data = list(by_date.values())
    
    # Crea mappa date con pagamenti per il calendario
    marked_dates = {}
    today = datetime.now(timezone.utc).date().isoformat()
    
    for d in calendar_data:
        is_past = d["date"] < today
        is_urgent = not is_past and d["date"] <= (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat()
        
        marked_dates[d["date"]] = {
            "marked": True,
            "dotColor": "#ef4444" if is_urgent else ("#94a3b8" if is_past else "#0d9488"),
            "count": d["count"],
            "total": d["total_amount"],
            "is_past": is_past
        }
    
    return {
        "month": target_month,
        "year": target_year,
        "calendar_data": calendar_data,
        "marked_dates": marked_dates,
        "total_payments": len(assignments),
        "total_amount": sum(a["amount_due"] for a in assignments)
    }


@router.get("/client/payments/{payment_id}")
async def get_client_payment_detail(
    payment_id: str,
    user: dict = Depends(get_current_client)
):
    """Ottiene il dettaglio di un singolo pagamento per il cliente"""
    db = get_db()
    
    assignment = await db.payment_assignments.find_one(
        {"id": payment_id, "client_id": user["id"]},
        {"_id": 0}
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    
    # Calcola giorni mancanti
    try:
        due = datetime.fromisoformat(assignment["due_date"].replace('Z', '+00:00')).date()
        today_date = datetime.now(timezone.utc).date()
        days_left = (due - today_date).days
    except (ValueError, TypeError):
        days_left = 0
    
    return {
        **assignment,
        "days_left": days_left,
        "is_expired": days_left < 0
    }

