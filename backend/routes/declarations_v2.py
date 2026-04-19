"""
Dichiarazioni dei Redditi - API v2
Nuova implementazione pulita e modulare
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid
import os
import logging
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/declarations/v2", tags=["Declarations V2"])

# =============================================================================
# AUTENTICAZIONE LOCALE
# =============================================================================

async def get_current_user_v2(authorization: str = Header(None)):
    """Verifica token JWT e ritorna utente"""
    from server import db, JWT_SECRET, JWT_ALGORITHM
    
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

# =============================================================================
# ENUMS E COSTANTI
# =============================================================================

class DeclarationStatus(str, Enum):
    BOZZA = "bozza"
    INVIATA = "inviata"
    DOCUMENTAZIONE_INCOMPLETA = "documentazione_incompleta"
    IN_REVISIONE = "in_revisione"
    PRONTA = "pronta"
    PRESENTATA = "presentata"
    RIFIUTATA = "rifiutata"

# Colori per gli stati
STATUS_COLORS = {
    "bozza": "yellow",
    "inviata": "yellow",
    "documentazione_incompleta": "yellow",
    "in_revisione": "yellow",
    "pronta": "green",
    "presentata": "green",
    "rifiutata": "red"
}

# Ordine degli stati (per transizioni valide)
STATUS_ORDER = [
    "bozza",
    "inviata",
    "documentazione_incompleta",
    "in_revisione",
    "pronta",
    "presentata",
    "rifiutata"
]

# Sezioni della dichiarazione
DECLARATION_SECTIONS = [
    "dati_personali",
    "situazione_familiare",
    "redditi_lavoro",
    "redditi_autonomo",
    "immobili",
    "canoni_locazione",
    "plusvalenze",
    "investimenti_finanziari",
    "criptomonete",
    "spese_deducibili",
    "deduzioni_agevolazioni",
    "documenti_allegati",
    "note_aggiuntive",
    "autorizzazione_firma"
]

# =============================================================================
# MODELLI PYDANTIC
# =============================================================================

class SectionData(BaseModel):
    """Dati generici di una sezione"""
    completed: bool = False
    not_applicable: bool = False  # "Non ho questa tipologia"
    data: Dict[str, Any] = {}
    updated_at: Optional[str] = None

class SignatureData(BaseModel):
    """Dati firma autorizzazione"""
    accepted_terms: bool = False
    signature_image: Optional[str] = None  # Base64 dell'immagine firma
    signed_at: Optional[str] = None
    ip_address: Optional[str] = None

class DeclarationCreate(BaseModel):
    """Creazione nuova dichiarazione"""
    anno_fiscale: int = Field(..., ge=2020, le=2030)
    tipo_dichiarazione: str = "redditi"

class DeclarationUpdate(BaseModel):
    """Aggiornamento sezione dichiarazione"""
    section_name: str
    section_data: Dict[str, Any]

class DeclarationStatusUpdate(BaseModel):
    """Aggiornamento stato (solo admin)"""
    new_status: DeclarationStatus
    note: Optional[str] = None

class MessageCreate(BaseModel):
    """Nuovo messaggio nella pratica"""
    content: str
    is_integration_request: bool = False  # Richiesta integrazione

# =============================================================================
# HELPERS
# =============================================================================

def get_db():
    """Ottieni connessione database"""
    from server import db
    return db

def get_auth_dependency():
    """Ottieni dipendenza autenticazione"""
    from server import get_current_user
    return Depends(get_current_user_v2)

def generate_id() -> str:
    """Genera UUID univoco"""
    return str(uuid.uuid4())

def now_iso() -> str:
    """Timestamp ISO corrente"""
    return datetime.now(timezone.utc).isoformat()

def create_empty_declaration_template() -> Dict[str, Any]:
    """Crea template vuoto per nuova dichiarazione"""
    sections = {}
    for section in DECLARATION_SECTIONS:
        sections[section] = {
            "completed": False,
            "not_applicable": False,
            "data": {},
            "updated_at": None
        }
    return sections

def calculate_completion_percentage(sections: Dict) -> int:
    """Calcola percentuale completamento"""
    if not sections:
        return 0
    
    total = len(DECLARATION_SECTIONS) - 1  # Escludi autorizzazione_firma
    completed = 0
    
    for section_name in DECLARATION_SECTIONS:
        if section_name == "autorizzazione_firma":
            continue
        section = sections.get(section_name, {})
        if section.get("completed") or section.get("not_applicable"):
            completed += 1
    
    return int((completed / total) * 100) if total > 0 else 0

def serialize_declaration(decl: Dict, include_sections: bool = False) -> Dict:
    """Serializza dichiarazione per risposta API"""
    result = {
        "id": decl.get("id"),
        "client_id": decl.get("client_id"),
        "client_name": decl.get("client_name"),
        "client_email": decl.get("client_email"),
        "anno_fiscale": decl.get("anno_fiscale"),
        "tipo_dichiarazione": decl.get("tipo_dichiarazione"),
        "status": decl.get("status", "bozza"),
        "status_color": STATUS_COLORS.get(decl.get("status", "bozza"), "yellow"),
        "completion_percentage": decl.get("completion_percentage", 0),
        "is_signed": decl.get("is_signed", False),
        "documents_count": decl.get("documents_count", 0),
        "messages_count": decl.get("messages_count", 0),
        "pending_integration_requests": decl.get("pending_integration_requests", 0),
        "created_at": decl.get("created_at"),
        "updated_at": decl.get("updated_at"),
        "submitted_at": decl.get("submitted_at"),
    }
    
    if include_sections:
        result["sections"] = decl.get("sections", {})
        result["signature"] = decl.get("signature", {})
    
    return result

# =============================================================================
# API ENDPOINTS - CLIENTE
# =============================================================================

@router.post("/declarations", response_model=Dict)
async def create_declaration(
    data: DeclarationCreate,
    user: dict = Depends(get_current_user_v2)
):
    """
    Crea una nuova dichiarazione dei redditi.
    Solo i clienti possono creare dichiarazioni.
    """
    db = get_db()
    
    # Verifica se esiste già una dichiarazione per lo stesso anno
    existing = await db.declarations_v2.find_one({
        "client_id": user["id"],
        "anno_fiscale": data.anno_fiscale
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Esiste già una dichiarazione per l'anno {data.anno_fiscale}"
        )
    
    # Crea nuova dichiarazione
    declaration = {
        "id": generate_id(),
        "client_id": user["id"],
        "client_name": user.get("full_name", user.get("email")),
        "client_email": user.get("email"),
        "anno_fiscale": data.anno_fiscale,
        "tipo_dichiarazione": data.tipo_dichiarazione,
        "status": "bozza",
        "sections": create_empty_declaration_template(),
        "signature": {
            "accepted_terms": False,
            "signature_image": None,
            "signed_at": None,
            "ip_address": None
        },
        "documents": [],
        "messages": [],
        "completion_percentage": 0,
        "is_signed": False,
        "documents_count": 0,
        "messages_count": 0,
        "pending_integration_requests": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "submitted_at": None
    }
    
    await db.declarations_v2.insert_one(declaration)
    
    logger.info(f"Nuova dichiarazione creata: {declaration['id']} per cliente {user['id']}")
    
    return serialize_declaration(declaration, include_sections=True)


@router.get("/declarations", response_model=List[Dict])
async def list_declarations(
    user: dict = Depends(get_current_user_v2)
):
    """
    Lista dichiarazioni.
    - Cliente: vede solo le proprie
    - Admin: vede tutte
    """
    db = get_db()
    
    query = {}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declarations = await db.declarations_v2.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [serialize_declaration(d) for d in declarations]


@router.get("/declarations/{declaration_id}", response_model=Dict)
async def get_declaration(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Ottieni dettaglio dichiarazione con tutte le sezioni.
    """
    db = get_db()
    
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query, {"_id": 0})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    return serialize_declaration(declaration, include_sections=True)


@router.put("/declarations/{declaration_id}/section", response_model=Dict)
async def update_section(
    declaration_id: str,
    data: DeclarationUpdate,
    user: dict = Depends(get_current_user_v2)
):
    """
    Aggiorna una sezione della dichiarazione.
    Salva automaticamente come bozza.
    """
    db = get_db()
    
    # Verifica proprietà
    declaration = await db.declarations_v2.find_one({
        "id": declaration_id,
        "client_id": user["id"]
    })
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Non permettere modifiche se già inviata (tranne integrazioni)
    if declaration["status"] not in ["bozza", "documentazione_incompleta"]:
        raise HTTPException(
            status_code=400,
            detail="Non puoi modificare una dichiarazione già inviata"
        )
    
    # Valida nome sezione
    if data.section_name not in DECLARATION_SECTIONS:
        raise HTTPException(status_code=400, detail="Sezione non valida")
    
    # Aggiorna sezione
    section_path = f"sections.{data.section_name}"
    section_data = {
        "completed": data.section_data.get("completed", False),
        "not_applicable": data.section_data.get("not_applicable", False),
        "data": data.section_data.get("data", {}),
        "updated_at": now_iso()
    }
    
    # Calcola nuova percentuale completamento
    sections = declaration.get("sections", {})
    sections[data.section_name] = section_data
    completion = calculate_completion_percentage(sections)
    
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$set": {
                section_path: section_data,
                "completion_percentage": completion,
                "updated_at": now_iso()
            }
        }
    )
    
    logger.info(f"Sezione {data.section_name} aggiornata per dichiarazione {declaration_id}")
    
    # Ritorna dichiarazione aggiornata
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


@router.post("/declarations/{declaration_id}/sign", response_model=Dict)
async def sign_declaration(
    declaration_id: str,
    accepted_terms: bool = Form(...),
    signature_image: str = Form(...),  # Base64
    user: dict = Depends(get_current_user_v2)
):
    """
    Firma la dichiarazione.
    Richiede accettazione termini e firma digitale.
    """
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({
        "id": declaration_id,
        "client_id": user["id"]
    })
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    if not accepted_terms:
        raise HTTPException(status_code=400, detail="Devi accettare i termini")
    
    if not signature_image:
        raise HTTPException(status_code=400, detail="Firma richiesta")
    
    signature_data = {
        "accepted_terms": True,
        "signature_image": signature_image,
        "signed_at": now_iso(),
        "ip_address": None  # TODO: estrarre da request
    }
    
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$set": {
                "signature": signature_data,
                "is_signed": True,
                "sections.autorizzazione_firma.completed": True,
                "sections.autorizzazione_firma.updated_at": now_iso(),
                "updated_at": now_iso()
            }
        }
    )
    
    logger.info(f"Dichiarazione {declaration_id} firmata da {user['id']}")
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


@router.post("/declarations/{declaration_id}/submit", response_model=Dict)
async def submit_declaration(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Invia la dichiarazione a Fiscal Tax Canarie.
    Richiede firma completata.
    """
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({
        "id": declaration_id,
        "client_id": user["id"]
    })
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    if declaration["status"] != "bozza":
        raise HTTPException(status_code=400, detail="La dichiarazione è già stata inviata")
    
    if not declaration.get("is_signed"):
        raise HTTPException(status_code=400, detail="Devi firmare prima di inviare")
    
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$set": {
                "status": "inviata",
                "submitted_at": now_iso(),
                "updated_at": now_iso()
            }
        }
    )
    
    logger.info(f"Dichiarazione {declaration_id} inviata")
    
    # TODO: Inviare notifica push + email all'admin
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


# =============================================================================
# API ENDPOINTS - ADMIN
# =============================================================================

@router.get("/admin/declarations", response_model=List[Dict])
async def admin_list_declarations(
    status: Optional[str] = None,
    search: Optional[str] = None,
    anno: Optional[int] = None,
    user: dict = Depends(get_current_user_v2)
):
    """
    Lista dichiarazioni per admin con filtri.
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    query = {}
    
    if status:
        query["status"] = status
    
    if anno:
        query["anno_fiscale"] = anno
    
    if search:
        query["$or"] = [
            {"client_name": {"$regex": search, "$options": "i"}},
            {"client_email": {"$regex": search, "$options": "i"}}
        ]
    
    declarations = await db.declarations_v2.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).to_list(1000)
    
    return [serialize_declaration(d) for d in declarations]


@router.put("/admin/declarations/{declaration_id}/status", response_model=Dict)
async def admin_update_status(
    declaration_id: str,
    data: DeclarationStatusUpdate,
    user: dict = Depends(get_current_user_v2)
):
    """
    Admin aggiorna stato dichiarazione.
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    update_data = {
        "status": data.new_status.value,
        "updated_at": now_iso()
    }
    
    # Se c'è una nota, aggiungila ai messaggi
    if data.note:
        message = {
            "id": generate_id(),
            "sender_id": user["id"],
            "sender_name": user.get("full_name", user.get("email")),
            "sender_role": "admin",
            "content": f"Stato aggiornato a '{data.new_status.value}': {data.note}",
            "is_integration_request": False,
            "created_at": now_iso()
        }
        await db.declarations_v2.update_one(
            {"id": declaration_id},
            {"$push": {"messages": message}, "$inc": {"messages_count": 1}}
        )
    
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {"$set": update_data}
    )
    
    logger.info(f"Stato dichiarazione {declaration_id} aggiornato a {data.new_status.value}")
    
    # TODO: Inviare notifica al cliente
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


# =============================================================================
# API MESSAGGI
# =============================================================================

@router.post("/declarations/{declaration_id}/messages", response_model=Dict)
async def add_message(
    declaration_id: str,
    data: MessageCreate,
    user: dict = Depends(get_current_user_v2)
):
    """
    Aggiungi messaggio alla pratica.
    """
    db = get_db()
    
    # Verifica accesso
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query)
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    is_admin = user.get("role") in ["commercialista", "super_admin", "admin"]
    
    message = {
        "id": generate_id(),
        "sender_id": user["id"],
        "sender_name": user.get("full_name", user.get("email")),
        "sender_role": "admin" if is_admin else "cliente",
        "content": data.content,
        "is_integration_request": data.is_integration_request and is_admin,
        "is_resolved": False,
        "created_at": now_iso()
    }
    
    update_ops = {
        "$push": {"messages": message},
        "$inc": {"messages_count": 1},
        "$set": {"updated_at": now_iso()}
    }
    
    # Se è richiesta integrazione, incrementa contatore
    if data.is_integration_request and is_admin:
        update_ops["$inc"]["pending_integration_requests"] = 1
        # Cambia stato a documentazione_incompleta
        update_ops["$set"]["status"] = "documentazione_incompleta"
    
    await db.declarations_v2.update_one({"id": declaration_id}, update_ops)
    
    logger.info(f"Messaggio aggiunto a dichiarazione {declaration_id}")
    
    # TODO: Inviare notifica push + email
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


@router.get("/declarations/{declaration_id}/messages", response_model=List[Dict])
async def get_messages(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Ottieni messaggi della pratica.
    """
    db = get_db()
    
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query, {"_id": 0, "messages": 1})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    return declaration.get("messages", [])


# =============================================================================
# API STATISTICHE
# =============================================================================

@router.get("/admin/stats", response_model=Dict)
async def admin_stats(
    user: dict = Depends(get_current_user_v2)
):
    """
    Statistiche per dashboard admin.
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    # Conta per stato
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    status_counts = {}
    async for doc in db.declarations_v2.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]
    
    total = sum(status_counts.values())
    
    # Conta nuove (inviate negli ultimi 7 giorni)
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_count = await db.declarations_v2.count_documents({
        "status": "inviata",
        "submitted_at": {"$gte": week_ago}
    })
    
    return {
        "total": total,
        "by_status": status_counts,
        "new_submissions": new_count,
        "pending_review": status_counts.get("inviata", 0) + status_counts.get("in_revisione", 0)
    }
