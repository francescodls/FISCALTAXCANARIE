"""
Gestione Importi Tributari - API
Sezione admin per gestire importi da pagare per dichiarazioni/modelli tributari
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
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
    
    # Prossime scadenze (entro 30 giorni)
    from datetime import timedelta
    today = datetime.now(timezone.utc).date().isoformat()
    thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
    
    upcoming = await db.payment_assignments.count_documents({
        "due_date": {"$gte": today, "$lte": thirty_days},
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
