"""
Modulo Tipi di Scadenza e Modelli Tributari
Gestione CRUD per tipi scadenza standard e modelli tributari
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from .deps import get_db, require_commercialista, require_admin

router = APIRouter(prefix="/deadline-types", tags=["deadline-types"])
tax_models_router = APIRouter(prefix="/tax-models", tags=["tax-models"])

# ==================== MODELS ====================

class DeadlineTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tax_model_id: Optional[str] = None
    frequency: str = "trimestrale"  # annuale, trimestrale, mensile, semestrale, una_tantum
    due_day: Optional[int] = None  # Giorno del mese (1-31)
    due_month: Optional[int] = None  # Mese (1-12) per scadenze annuali
    due_rule: Optional[str] = None  # "ultimo_giorno", "primo_giorno", "giorno_specifico"
    due_dates_description: Optional[str] = None  # Es: "20 aprile, 20 luglio, 20 ottobre, 30 gennaio"
    reminder_days: List[int] = [7, 3, 1, 0]
    assigned_category_ids: List[str] = []  # ["societa", "autonomo", "persona_fisica", "vivienda_vacacional"]
    assigned_client_ids: List[str] = []
    is_active: bool = True
    priority: str = "normale"  # bassa, normale, alta, urgente
    color: str = "#3caca4"
    icon: str = "calendar"

class DeadlineTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tax_model_id: Optional[str] = None
    frequency: Optional[str] = None
    due_day: Optional[int] = None
    due_month: Optional[int] = None
    due_rule: Optional[str] = None
    due_dates_description: Optional[str] = None
    reminder_days: Optional[List[int]] = None
    assigned_category_ids: Optional[List[str]] = None
    assigned_client_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class TaxModelCreate(BaseModel):
    codice: str
    nome: str
    descrizione: Optional[str] = None
    a_cosa_serve: Optional[str] = None
    chi_deve_presentarlo: Optional[str] = None
    periodicita: str = "Trimestrale"
    scadenza_tipica: Optional[str] = None
    documenti_necessari: List[str] = []
    conseguenze_mancata_presentazione: Optional[str] = None
    note_operative: Optional[str] = None
    is_custom: bool = True  # True per modelli creati dall'admin

class TaxModelUpdate(BaseModel):
    codice: Optional[str] = None
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    a_cosa_serve: Optional[str] = None
    chi_deve_presentarlo: Optional[str] = None
    periodicita: Optional[str] = None
    scadenza_tipica: Optional[str] = None
    documenti_necessari: Optional[List[str]] = None
    conseguenze_mancata_presentazione: Optional[str] = None
    note_operative: Optional[str] = None

# ==================== DEADLINE TYPES ENDPOINTS ====================

@router.get("")
async def get_deadline_types(
    is_active: Optional[bool] = None,
    category: Optional[str] = None,
    user: dict = Depends(require_commercialista)
):
    """Lista tutti i tipi di scadenza"""
    db = get_db()
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if category:
        query["assigned_category_ids"] = category
    
    types = await db.deadline_types.find(query, {"_id": 0}).sort("name", 1).to_list(200)
    
    # Arricchisci con info modello tributario
    for dt in types:
        if dt.get("tax_model_id"):
            tax_model = await db.modelli_tributari.find_one(
                {"id": dt["tax_model_id"]}, 
                {"_id": 0, "codice": 1, "nome": 1}
            )
            dt["tax_model"] = tax_model
    
    return types

@router.get("/{type_id}")
async def get_deadline_type(type_id: str, user: dict = Depends(require_commercialista)):
    """Ottieni un singolo tipo di scadenza"""
    db = get_db()
    
    dt = await db.deadline_types.find_one({"id": type_id}, {"_id": 0})
    if not dt:
        raise HTTPException(status_code=404, detail="Tipo scadenza non trovato")
    
    # Arricchisci con info modello tributario
    if dt.get("tax_model_id"):
        tax_model = await db.modelli_tributari.find_one(
            {"id": dt["tax_model_id"]}, 
            {"_id": 0}
        )
        dt["tax_model"] = tax_model
    
    # Arricchisci con info clienti assegnati
    if dt.get("assigned_client_ids"):
        clients = await db.users.find(
            {"id": {"$in": dt["assigned_client_ids"]}, "role": "cliente"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1}
        ).to_list(100)
        dt["assigned_clients"] = clients
    
    return dt

@router.post("")
async def create_deadline_type(data: DeadlineTypeCreate, user: dict = Depends(require_commercialista)):
    """Crea un nuovo tipo di scadenza"""
    db = get_db()
    
    # Verifica nome unico
    existing = await db.deadline_types.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Esiste già un tipo con questo nome")
    
    # Verifica modello tributario se specificato
    if data.tax_model_id:
        tax_model = await db.modelli_tributari.find_one({"id": data.tax_model_id})
        if not tax_model:
            raise HTTPException(status_code=400, detail="Modello tributario non trovato")
    
    deadline_type = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "tax_model_id": data.tax_model_id,
        "frequency": data.frequency,
        "due_day": data.due_day,
        "due_month": data.due_month,
        "due_rule": data.due_rule,
        "due_dates_description": data.due_dates_description,
        "reminder_days": data.reminder_days,
        "assigned_category_ids": data.assigned_category_ids,
        "assigned_client_ids": data.assigned_client_ids,
        "is_active": data.is_active,
        "priority": data.priority,
        "color": data.color,
        "icon": data.icon,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.deadline_types.insert_one(deadline_type)
    
    # Rimuovi _id prima di restituire
    if "_id" in deadline_type:
        del deadline_type["_id"]
    
    return deadline_type

@router.put("/{type_id}")
async def update_deadline_type(
    type_id: str, 
    data: DeadlineTypeUpdate, 
    user: dict = Depends(require_commercialista)
):
    """Modifica un tipo di scadenza"""
    db = get_db()
    
    existing = await db.deadline_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tipo scadenza non trovato")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    # Verifica modello tributario se modificato
    if "tax_model_id" in update_data and update_data["tax_model_id"]:
        tax_model = await db.modelli_tributari.find_one({"id": update_data["tax_model_id"]})
        if not tax_model:
            raise HTTPException(status_code=400, detail="Modello tributario non trovato")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.deadline_types.update_one({"id": type_id}, {"$set": update_data})
    
    updated = await db.deadline_types.find_one({"id": type_id}, {"_id": 0})
    return updated

@router.delete("/{type_id}")
async def delete_deadline_type(type_id: str, user: dict = Depends(require_commercialista)):
    """Elimina un tipo di scadenza"""
    db = get_db()
    
    existing = await db.deadline_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tipo scadenza non trovato")
    
    # Verifica se ci sono scadenze attive con questo tipo
    active_deadlines = await db.deadlines.count_documents({
        "deadline_type_id": type_id,
        "status": {"$nin": ["completata", "annullata"]}
    })
    
    if active_deadlines > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossibile eliminare: ci sono {active_deadlines} scadenze attive con questo tipo"
        )
    
    await db.deadline_types.delete_one({"id": type_id})
    return {"message": "Tipo scadenza eliminato"}

@router.post("/{type_id}/generate-deadlines")
async def generate_deadlines_from_type(
    type_id: str,
    year: int,
    user: dict = Depends(require_commercialista)
):
    """Genera scadenze per l'anno specificato basate sul tipo"""
    db = get_db()
    
    dt = await db.deadline_types.find_one({"id": type_id})
    if not dt:
        raise HTTPException(status_code=404, detail="Tipo scadenza non trovato")
    
    if not dt.get("is_active"):
        raise HTTPException(status_code=400, detail="Tipo scadenza non attivo")
    
    # Trova clienti target
    client_query = {"role": "cliente"}
    if dt.get("assigned_client_ids"):
        client_query["id"] = {"$in": dt["assigned_client_ids"]}
    elif dt.get("assigned_category_ids"):
        client_query["tipo_cliente"] = {"$in": dt["assigned_category_ids"]}
    else:
        raise HTTPException(status_code=400, detail="Nessun cliente assegnato a questo tipo")
    
    clients = await db.users.find(client_query, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(1000)
    
    if not clients:
        raise HTTPException(status_code=400, detail="Nessun cliente trovato per questo tipo")
    
    # Calcola date scadenza in base alla frequenza
    due_dates = calculate_due_dates(dt, year)
    
    created_count = 0
    for due_date in due_dates:
        for client in clients:
            # Verifica se esiste già
            existing = await db.deadlines.find_one({
                "deadline_type_id": type_id,
                "client_ids": client["id"],
                "due_date": due_date
            })
            
            if not existing:
                deadline = {
                    "id": str(uuid.uuid4()),
                    "deadline_type_id": type_id,
                    "title": dt["name"],
                    "description": dt.get("description", ""),
                    "due_date": due_date,
                    "category": dt.get("tax_model_id", "altro"),
                    "priority": dt.get("priority", "normale"),
                    "status": "da_fare",
                    "client_ids": [client["id"]],
                    "list_ids": [],
                    "applies_to_all": False,
                    "is_recurring": dt.get("frequency") != "una_tantum",
                    "recurrence_type": dt.get("frequency"),
                    "send_notification": True,
                    "send_reminders": True,
                    "reminder_days": dt.get("reminder_days", [7, 3, 1, 0]),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": user["id"]
                }
                await db.deadlines.insert_one(deadline)
                created_count += 1
    
    return {
        "message": f"Generate {created_count} scadenze per {len(clients)} clienti",
        "created_count": created_count,
        "clients_count": len(clients),
        "dates_count": len(due_dates)
    }

# ==================== TAX MODELS ENDPOINTS ====================

@tax_models_router.get("")
async def get_tax_models(user: dict = Depends(require_commercialista)):
    """Lista tutti i modelli tributari"""
    db = get_db()
    models = await db.modelli_tributari.find({}, {"_id": 0}).sort("codice", 1).to_list(100)
    return models

@tax_models_router.get("/{model_id}")
async def get_tax_model(model_id: str, user: dict = Depends(require_commercialista)):
    """Ottieni un singolo modello tributario"""
    db = get_db()
    model = await db.modelli_tributari.find_one({"id": model_id}, {"_id": 0})
    if not model:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    return model

@tax_models_router.post("")
async def create_tax_model(data: TaxModelCreate, user: dict = Depends(require_commercialista)):
    """Crea un nuovo modello tributario"""
    db = get_db()
    
    # Verifica codice unico
    existing = await db.modelli_tributari.find_one({"codice": data.codice})
    if existing:
        raise HTTPException(status_code=400, detail="Esiste già un modello con questo codice")
    
    model = {
        "id": str(uuid.uuid4()),
        "codice": data.codice,
        "nome": data.nome,
        "descrizione": data.descrizione,
        "a_cosa_serve": data.a_cosa_serve,
        "chi_deve_presentarlo": data.chi_deve_presentarlo,
        "periodicita": data.periodicita,
        "scadenza_tipica": data.scadenza_tipica,
        "documenti_necessari": data.documenti_necessari,
        "conseguenze_mancata_presentazione": data.conseguenze_mancata_presentazione,
        "note_operative": data.note_operative,
        "is_custom": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.modelli_tributari.insert_one(model)
    
    if "_id" in model:
        del model["_id"]
    
    return model

@tax_models_router.put("/{model_id}")
async def update_tax_model(
    model_id: str, 
    data: TaxModelUpdate, 
    user: dict = Depends(require_commercialista)
):
    """Modifica un modello tributario"""
    db = get_db()
    
    existing = await db.modelli_tributari.find_one({"id": model_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    # Verifica codice unico se modificato
    if "codice" in update_data:
        dup = await db.modelli_tributari.find_one({
            "codice": update_data["codice"],
            "id": {"$ne": model_id}
        })
        if dup:
            raise HTTPException(status_code=400, detail="Codice già in uso")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.modelli_tributari.update_one({"id": model_id}, {"$set": update_data})
    
    updated = await db.modelli_tributari.find_one({"id": model_id}, {"_id": 0})
    return updated

@tax_models_router.delete("/{model_id}")
async def delete_tax_model(model_id: str, user: dict = Depends(require_commercialista)):
    """Elimina un modello tributario (solo custom)"""
    db = get_db()
    
    existing = await db.modelli_tributari.find_one({"id": model_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    
    # Non permettere eliminazione modelli predefiniti
    if not existing.get("is_custom", False):
        raise HTTPException(status_code=400, detail="Non puoi eliminare un modello predefinito")
    
    # Verifica se ci sono tipi scadenza collegati
    linked_types = await db.deadline_types.count_documents({"tax_model_id": model_id})
    if linked_types > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossibile eliminare: ci sono {linked_types} tipi di scadenza collegati"
        )
    
    await db.modelli_tributari.delete_one({"id": model_id})
    return {"message": "Modello tributario eliminato"}

# ==================== HELPER FUNCTIONS ====================

def calculate_due_dates(deadline_type: dict, year: int) -> List[str]:
    """Calcola le date di scadenza per un anno basate sul tipo"""
    from datetime import date
    import calendar
    
    frequency = deadline_type.get("frequency", "trimestrale")
    due_day = deadline_type.get("due_day", 20)
    due_month = deadline_type.get("due_month")
    due_rule = deadline_type.get("due_rule", "giorno_specifico")
    
    dates = []
    
    if frequency == "annuale":
        # Una volta all'anno
        month = due_month or 6  # Default giugno
        day = min(due_day or 30, calendar.monthrange(year, month)[1])
        dates.append(date(year, month, day).isoformat())
        
    elif frequency == "semestrale":
        # Due volte all'anno
        for month in [6, 12]:
            day = min(due_day or 30, calendar.monthrange(year, month)[1])
            dates.append(date(year, month, day).isoformat())
            
    elif frequency == "trimestrale":
        # Quattro volte all'anno (tipico: 20 aprile, luglio, ottobre, gennaio successivo)
        quarters = [(4, year), (7, year), (10, year), (1, year + 1)]
        for month, y in quarters:
            day = min(due_day or 20, calendar.monthrange(y, month)[1])
            dates.append(date(y, month, day).isoformat())
            
    elif frequency == "mensile":
        # Ogni mese
        for month in range(1, 13):
            if due_rule == "ultimo_giorno":
                day = calendar.monthrange(year, month)[1]
            elif due_rule == "primo_giorno":
                day = 1
            else:
                day = min(due_day or 20, calendar.monthrange(year, month)[1])
            dates.append(date(year, month, day).isoformat())
            
    elif frequency == "una_tantum":
        # Singola occorrenza
        month = due_month or 12
        day = min(due_day or 31, calendar.monthrange(year, month)[1])
        dates.append(date(year, month, day).isoformat())
    
    return dates

# ==================== STATS ====================

@router.get("/stats/summary")
async def get_deadline_types_stats(user: dict = Depends(require_commercialista)):
    """Statistiche sui tipi di scadenza"""
    db = get_db()
    
    total = await db.deadline_types.count_documents({})
    active = await db.deadline_types.count_documents({"is_active": True})
    
    # Conta per frequenza
    by_frequency = await db.deadline_types.aggregate([
        {"$group": {"_id": "$frequency", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Conta per categoria
    by_category = await db.deadline_types.aggregate([
        {"$unwind": "$assigned_category_ids"},
        {"$group": {"_id": "$assigned_category_ids", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    return {
        "total": total,
        "active": active,
        "inactive": total - active,
        "by_frequency": {item["_id"]: item["count"] for item in by_frequency},
        "by_category": {item["_id"]: item["count"] for item in by_category}
    }
