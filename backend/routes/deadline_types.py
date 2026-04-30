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
    # Nuovi campi per configurazione notifiche avanzate
    notification_config: Optional[Dict[str, Any]] = None  # Configurazione notifiche
    # Formato: {
    #   "enabled": true,
    #   "channels": ["push", "email"],
    #   "relative_reminders": [20, 15, 7, 3, 1, 0],  # Giorni prima della scadenza
    #   "fixed_dates": [],  # Liste di date fisse specifiche
    #   "message_template": "..."
    # }
    auto_assign_to_category: bool = True  # Se true, genera automaticamente le scadenze per i clienti della categoria

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
    notification_config: Optional[Dict[str, Any]] = None
    auto_assign_to_category: Optional[bool] = None

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
    
    # Configurazione notifiche di default se non specificata
    notification_config = data.notification_config or {
        "enabled": True,
        "channels": ["push", "email"],
        "relative_reminders": data.reminder_days or [7, 3, 1, 0],
        "fixed_dates": [],
        "message_template": "Promemoria: {deadline_name} scade il {due_date}"
    }
    
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
        "notification_config": notification_config,
        "auto_assign_to_category": data.auto_assign_to_category,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.deadline_types.insert_one(deadline_type)
    
    # Rimuovi _id prima di restituire
    if "_id" in deadline_type:
        del deadline_type["_id"]
    
    # Se auto_assign_to_category è abilitato, genera le scadenze per tutti i clienti delle categorie
    if data.auto_assign_to_category and data.assigned_category_ids:
        await auto_generate_deadlines_for_category(db, deadline_type, user["id"])
    
    return deadline_type


async def auto_generate_deadlines_for_category(db, deadline_type: dict, created_by: str):
    """
    Genera automaticamente le scadenze per tutti i clienti delle categorie specificate.
    Questa funzione crea le istanze delle scadenze nel calendario di ogni cliente.
    """
    from datetime import date
    
    category_ids = deadline_type.get("assigned_category_ids", [])
    if not category_ids:
        return
    
    # Trova tutti i clienti attivi delle categorie specificate (escludi archiviati)
    query = {
        "role": "cliente",
        "stato": {"$ne": "cessato"},
        "tipo_cliente": {"$in": category_ids}
    }
    
    clients = await db.users.find(query, {"_id": 0, "id": 1, "full_name": 1}).to_list(None)
    
    if not clients:
        return
    
    # Calcola le date di scadenza per l'anno corrente e prossimo
    current_year = date.today().year
    due_dates = calculate_deadline_dates(deadline_type, current_year)
    due_dates.extend(calculate_deadline_dates(deadline_type, current_year + 1))
    
    # Crea le scadenze per ogni cliente
    deadlines_to_insert = []
    
    for client in clients:
        for due_date in due_dates:
            # Determina il periodo (es: "1T 2026", "2T 2026", etc.)
            period = get_period_label(deadline_type["frequency"], due_date)
            
            deadline = {
                "id": str(uuid.uuid4()),
                "title": f"{deadline_type['name']} - {period}",
                "description": deadline_type.get("description", ""),
                "due_date": due_date.isoformat(),
                "date": due_date.isoformat(),
                "category": deadline_type.get("name", "Fiscale"),
                "status": "da_fare",
                "priority": deadline_type.get("priority", "normale"),
                "color": deadline_type.get("color", "#3caca4"),
                "client_ids": [client["id"]],
                "deadline_type_id": deadline_type["id"],
                "tax_model_id": deadline_type.get("tax_model_id"),
                "notification_config": deadline_type.get("notification_config"),
                "auto_generated": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": created_by
            }
            deadlines_to_insert.append(deadline)
    
    if deadlines_to_insert:
        await db.deadlines.insert_many(deadlines_to_insert)
        
    return len(deadlines_to_insert)


def calculate_deadline_dates(deadline_type: dict, year: int) -> list:
    """Calcola le date di scadenza per un anno specifico in base alla frequenza"""
    from datetime import date
    import calendar
    
    dates = []
    frequency = deadline_type.get("frequency", "trimestrale")
    due_day = deadline_type.get("due_day") or 20
    
    if frequency == "annuale":
        due_month = deadline_type.get("due_month") or 4
        # Gestisci il giorno corretto per il mese
        last_day = calendar.monthrange(year, due_month)[1]
        actual_day = min(due_day, last_day)
        dates.append(date(year, due_month, actual_day))
        
    elif frequency == "semestrale":
        for month in [6, 12]:
            last_day = calendar.monthrange(year, month)[1]
            actual_day = min(due_day, last_day)
            dates.append(date(year, month, actual_day))
            
    elif frequency == "trimestrale":
        # Scadenze tipiche: aprile, luglio, ottobre, gennaio (dell'anno dopo per il 4T)
        quarters = [(4, year), (7, year), (10, year), (1, year + 1)]
        for month, y in quarters:
            if y == year or (y == year + 1 and month == 1):
                last_day = calendar.monthrange(y, month)[1]
                actual_day = min(due_day, last_day)
                dates.append(date(y, month, actual_day))
                
    elif frequency == "mensile":
        for month in range(1, 13):
            last_day = calendar.monthrange(year, month)[1]
            actual_day = min(due_day, last_day)
            dates.append(date(year, month, actual_day))
            
    elif frequency == "una_tantum":
        due_month = deadline_type.get("due_month") or date.today().month
        last_day = calendar.monthrange(year, due_month)[1]
        actual_day = min(due_day, last_day)
        dates.append(date(year, due_month, actual_day))
    
    # Filtra date passate di più di 30 giorni
    today = date.today()
    from datetime import timedelta
    cutoff = today - timedelta(days=30)
    dates = [d for d in dates if d >= cutoff]
    
    return dates


def get_period_label(frequency: str, due_date) -> str:
    """Genera un'etichetta per il periodo basata sulla frequenza e data"""
    year = due_date.year
    month = due_date.month
    
    if frequency == "trimestrale":
        if month in [1, 2, 3]:
            return f"4T {year - 1}"  # Gennaio è il 4T dell'anno precedente
        elif month in [4, 5, 6]:
            return f"1T {year}"
        elif month in [7, 8, 9]:
            return f"2T {year}"
        else:
            return f"3T {year}"
    elif frequency == "semestrale":
        return f"{'1S' if month <= 6 else '2S'} {year}"
    elif frequency == "mensile":
        mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
        return f"{mesi[month-1]} {year}"
    elif frequency == "annuale":
        return str(year)
    else:
        return f"{due_date.strftime('%d/%m/%Y')}"

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


@router.post("/assign-to-client/{client_id}")
async def assign_deadlines_to_client(
    client_id: str,
    user: dict = Depends(require_commercialista)
):
    """
    Assegna automaticamente tutte le scadenze pertinenti a un cliente.
    Utile quando un cliente viene creato o cambia categoria.
    """
    db = get_db()
    from datetime import date
    
    # Trova il cliente
    client = await db.users.find_one({"id": client_id, "role": "cliente"}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    if client.get("stato") == "cessato":
        raise HTTPException(status_code=400, detail="Cliente archiviato, impossibile assegnare scadenze")
    
    client_category = client.get("tipo_cliente")
    if not client_category:
        return {"message": "Cliente senza categoria, nessuna scadenza assegnata", "count": 0}
    
    # Trova tutti i tipi di scadenza attivi per la categoria del cliente
    deadline_types = await db.deadline_types.find({
        "is_active": True,
        "auto_assign_to_category": True,
        "assigned_category_ids": client_category
    }, {"_id": 0}).to_list(None)
    
    if not deadline_types:
        return {"message": "Nessun tipo di scadenza configurato per questa categoria", "count": 0}
    
    current_year = date.today().year
    deadlines_created = 0
    
    for dt in deadline_types:
        # Calcola le date per l'anno corrente e prossimo
        due_dates = calculate_deadline_dates(dt, current_year)
        due_dates.extend(calculate_deadline_dates(dt, current_year + 1))
        
        for due_date in due_dates:
            # Verifica se esiste già questa scadenza per questo cliente
            existing = await db.deadlines.find_one({
                "client_ids": client_id,
                "deadline_type_id": dt["id"],
                "due_date": due_date.isoformat()
            })
            
            if existing:
                continue
            
            period = get_period_label(dt["frequency"], due_date)
            
            deadline = {
                "id": str(uuid.uuid4()),
                "title": f"{dt['name']} - {period}",
                "description": dt.get("description", ""),
                "due_date": due_date.isoformat(),
                "date": due_date.isoformat(),
                "category": dt.get("name", "Fiscale"),
                "status": "da_fare",
                "priority": dt.get("priority", "normale"),
                "color": dt.get("color", "#3caca4"),
                "client_ids": [client_id],
                "deadline_type_id": dt["id"],
                "tax_model_id": dt.get("tax_model_id"),
                "notification_config": dt.get("notification_config"),
                "auto_generated": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user["id"]
            }
            
            await db.deadlines.insert_one(deadline)
            deadlines_created += 1
    
    return {
        "message": f"Scadenze assegnate al cliente {client.get('full_name', client_id)}",
        "count": deadlines_created
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
