"""
Dichiarazioni dei Redditi - API v2
Nuova implementazione pulita e modulare
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Query
from fastapi.responses import Response
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
        "viewed_by_admin": False,  # Flag per nuove dichiarazioni
        "admin_first_view_at": None,
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
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = "updated_at",
    sort_order: Optional[str] = "desc",
    user: dict = Depends(get_current_user_v2)
):
    """
    Lista dichiarazioni per admin con filtri avanzati.
    Ricerca per: nome, cognome, ragione sociale, email, id pratica
    Filtri per: stato, anno, date creazione/modifica
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    query = {}
    
    # Filtro stato
    if status:
        query["status"] = status
    
    # Filtro anno fiscale
    if anno:
        query["anno_fiscale"] = anno
    
    # Filtro date
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["created_at"] = date_filter
    
    # Ricerca testuale avanzata
    if search:
        search_term = search.strip()
        query["$or"] = [
            {"client_name": {"$regex": search_term, "$options": "i"}},
            {"client_email": {"$regex": search_term, "$options": "i"}},
            {"ragione_sociale": {"$regex": search_term, "$options": "i"}},
            {"id": {"$regex": search_term, "$options": "i"}},
            {"sections.dati_personali.data.nome": {"$regex": search_term, "$options": "i"}},
            {"sections.dati_personali.data.cognome": {"$regex": search_term, "$options": "i"}},
            {"sections.dati_personali.data.codice_fiscale": {"$regex": search_term, "$options": "i"}}
        ]
    
    # Ordinamento
    sort_direction = -1 if sort_order == "desc" else 1
    valid_sort_fields = ["updated_at", "created_at", "client_name", "anno_fiscale", "status"]
    sort_field = sort_by if sort_by in valid_sort_fields else "updated_at"
    
    declarations = await db.declarations_v2.find(
        query,
        {"_id": 0}
    ).sort(sort_field, sort_direction).to_list(1000)
    
    # Arricchisci con dati cliente se disponibili
    enriched = []
    for decl in declarations:
        serialized = serialize_declaration(decl, include_sections=True)
        # Estrai dati personali per la visualizzazione
        dati_personali = decl.get("sections", {}).get("dati_personali", {}).get("data", {})
        serialized["client_nome"] = dati_personali.get("nome", "")
        serialized["client_cognome"] = dati_personali.get("cognome", "")
        serialized["client_codice_fiscale"] = dati_personali.get("codice_fiscale", "")
        serialized["client_telefono"] = dati_personali.get("telefono", "")
        serialized["ragione_sociale"] = decl.get("ragione_sociale", "")
        serialized["messages"] = decl.get("messages", [])
        enriched.append(serialized)
    
    return enriched


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


@router.get("/admin/declarations/stats", response_model=Dict)
async def get_admin_declarations_stats(
    user: dict = Depends(get_current_user_v2)
):
    """
    Statistiche dichiarazioni per dashboard admin.
    Restituisce totale dichiarazioni e conteggio nuove (non viste).
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    # Conteggio totale
    total = await db.declarations_v2.count_documents({})
    
    # Conteggio nuove (non viste dall'admin)
    new_count = await db.declarations_v2.count_documents({
        "$or": [
            {"viewed_by_admin": False},
            {"viewed_by_admin": {"$exists": False}}
        ]
    })
    
    # Conteggio per stato
    by_status = {}
    for status in ["bozza", "inviata", "documentazione_incompleta", "in_revisione", "pronta", "presentata", "rifiutata"]:
        by_status[status] = await db.declarations_v2.count_documents({"status": status})
    
    return {
        "total": total,
        "new_count": new_count,
        "by_status": by_status
    }


@router.post("/admin/declarations/mark-viewed", response_model=Dict)
async def mark_declarations_viewed(
    user: dict = Depends(get_current_user_v2)
):
    """
    Marca tutte le dichiarazioni come viste dall'admin.
    Chiamato quando l'admin entra nella sezione dichiarazioni.
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    result = await db.declarations_v2.update_many(
        {
            "$or": [
                {"viewed_by_admin": False},
                {"viewed_by_admin": {"$exists": False}}
            ]
        },
        {
            "$set": {
                "viewed_by_admin": True,
                "admin_first_view_at": now_iso()
            }
        }
    )
    
    logger.info(f"Marcate {result.modified_count} dichiarazioni come viste dall'admin")
    
    return {
        "success": True,
        "marked_count": result.modified_count
    }


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



# =============================================================================
# API DOCUMENTI
# =============================================================================

import base64
import io
import zipfile
from fastapi.responses import StreamingResponse

# Directory per upload documenti
UPLOAD_DIR = "/app/uploads/declarations"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/declarations/{declaration_id}/documents", response_model=Dict)
async def upload_document(
    declaration_id: str,
    file: UploadFile = File(...),
    category: str = Form(default="generale"),
    description: str = Form(default=""),
    user: dict = Depends(get_current_user_v2)
):
    """
    Upload documento alla dichiarazione.
    Permesso solo al proprietario e solo se in stato bozza o documentazione_incompleta.
    """
    db = get_db()
    
    # Verifica proprietà e stato
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query)
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Cliente può caricare solo in bozza o documentazione_incompleta
    if user.get("role") == "cliente" and declaration["status"] not in ["bozza", "documentazione_incompleta"]:
        raise HTTPException(
            status_code=400, 
            detail="Non puoi caricare documenti in questo stato della dichiarazione"
        )
    
    # Validazione file
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome file mancante")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo file non permesso. Formati accettati: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Leggi contenuto
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File troppo grande (max 10MB)")
    
    # Genera ID e salva file
    doc_id = generate_id()
    safe_filename = f"{doc_id}{ext}"
    decl_dir = os.path.join(UPLOAD_DIR, declaration_id)
    os.makedirs(decl_dir, exist_ok=True)
    file_path = os.path.join(decl_dir, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Crea record documento
    document = {
        "id": doc_id,
        "filename": file.filename,
        "stored_filename": safe_filename,
        "file_path": file_path,
        "file_size": len(content),
        "mime_type": file.content_type,
        "category": category,
        "description": description,
        "uploaded_by": user["id"],
        "uploaded_by_name": user.get("full_name", user.get("email")),
        "uploaded_by_role": "admin" if user.get("role") in ["commercialista", "super_admin", "admin"] else "cliente",
        "created_at": now_iso()
    }
    
    # Aggiorna dichiarazione
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$push": {"documents": document},
            "$inc": {"documents_count": 1},
            "$set": {"updated_at": now_iso()}
        }
    )
    
    logger.info(f"Documento {doc_id} caricato per dichiarazione {declaration_id}")
    
    return {
        "success": True,
        "document": document
    }


@router.get("/declarations/{declaration_id}/documents", response_model=List[Dict])
async def list_documents(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """Lista documenti della dichiarazione"""
    db = get_db()
    
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query, {"_id": 0, "documents": 1})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    return declaration.get("documents", [])


@router.get("/declarations/{declaration_id}/documents/{document_id}")
async def download_document(
    declaration_id: str,
    document_id: str,
    token: str = Query(None, description="Token JWT per autenticazione via URL"),
    preview: bool = Query(False, description="Se true, apre il file inline nel browser (anteprima)"),
    authorization: str = Header(None)
):
    """Download singolo documento - supporta sia header Authorization che query param token.
    Con preview=true restituisce il file per visualizzazione inline (PDF/immagini)."""
    from server import db as _db, JWT_SECRET, JWT_ALGORITHM
    db = _db
    
    # Prova prima con token da query param, poi con header
    jwt_token = None
    if token:
        jwt_token = token
    elif authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.replace("Bearer ", "")
    
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Token mancante")
    
    # Verifica token
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query)
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Trova documento
    document = None
    for doc in declaration.get("documents", []):
        if doc["id"] == document_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    file_path = document.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File non trovato sul server")
    
    # Leggi e restituisci file
    with open(file_path, "rb") as f:
        content = f.read()
    
    # Content-Disposition: inline per preview, attachment per download
    disposition = "inline" if preview else "attachment"
    
    return Response(
        content=content,
        media_type=document.get("mime_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f'{disposition}; filename="{document["filename"]}"'
        }
    )


@router.delete("/declarations/{declaration_id}/documents/{document_id}")
async def delete_document(
    declaration_id: str,
    document_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """Elimina documento (solo admin o proprietario in stato bozza)"""
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    is_admin = user.get("role") in ["commercialista", "super_admin", "admin"]
    is_owner = declaration.get("client_id") == user["id"]
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    if not is_admin and declaration["status"] not in ["bozza"]:
        raise HTTPException(status_code=400, detail="Non puoi eliminare documenti in questo stato")
    
    # Trova e rimuovi documento
    document = None
    for doc in declaration.get("documents", []):
        if doc["id"] == document_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Elimina file fisico
    file_path = document.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Rimuovi dal DB
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$pull": {"documents": {"id": document_id}},
            "$inc": {"documents_count": -1},
            "$set": {"updated_at": now_iso()}
        }
    )
    
    return {"success": True, "message": "Documento eliminato"}


@router.delete("/admin/declarations/{declaration_id}")
async def delete_declaration_admin(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """Elimina completamente una dichiarazione (solo admin)"""
    # Verifica che sia admin
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Solo gli admin possono eliminare dichiarazioni")
    
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Elimina documenti fisici
    for doc in declaration.get("documents", []):
        file_path = doc.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Errore eliminazione file {file_path}: {e}")
    
    # Elimina dal database
    result = await db.declarations_v2.delete_one({"id": declaration_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Errore eliminazione dichiarazione")
    
    # Log attività
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", user.get("email")),
        "action": "declaration_deleted",
        "entity_type": "declaration",
        "entity_id": declaration_id,
        "details": f"Dichiarazione {declaration.get('anno_fiscale')} di {declaration.get('client_name')} eliminata",
        "created_at": now_iso()
    })
    
    return {"success": True, "message": "Dichiarazione eliminata"}


# =============================================================================
# API DOWNLOAD PDF E ZIP
# =============================================================================

def generate_declaration_pdf_content(declaration: Dict) -> bytes:
    """Genera contenuto PDF della dichiarazione"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#0d9488'),
        spaceBefore=15,
        spaceAfter=10
    )
    normal_style = styles['Normal']
    
    elements = []
    
    # Header
    elements.append(Paragraph("FISCAL TAX CANARIE", title_style))
    elements.append(Paragraph("Dichiarazione dei Redditi", styles['Heading2']))
    elements.append(Spacer(1, 20))
    
    # Info pratica
    info_data = [
        ["ID Pratica:", declaration.get("id", "N/A")[:8] + "..."],
        ["Anno Fiscale:", str(declaration.get("anno_fiscale", "N/A"))],
        ["Cliente:", declaration.get("client_name", "N/A")],
        ["Email:", declaration.get("client_email", "N/A")],
        ["Stato:", declaration.get("status", "N/A").upper()],
        ["Completamento:", f"{declaration.get('completion_percentage', 0)}%"],
        ["Data Creazione:", declaration.get("created_at", "N/A")[:10] if declaration.get("created_at") else "N/A"],
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0fdfa')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Sezioni
    section_names = {
        'dati_personali': 'Dati Personali',
        'situazione_familiare': 'Situazione Familiare',
        'redditi_lavoro': 'Redditi da Lavoro Dipendente',
        'redditi_autonomo': 'Redditi Autonomo / Attivita Economica',
        'immobili': 'Immobili',
        'canoni_locazione': 'Canoni di Locazione',
        'plusvalenze': 'Plusvalenze',
        'investimenti_finanziari': 'Investimenti Finanziari',
        'criptomonete': 'Criptomonete',
        'spese_deducibili': 'Spese Deducibili',
        'deduzioni_agevolazioni': 'Deduzioni e Agevolazioni',
        'documenti_allegati': 'Documenti Allegati',
        'note_aggiuntive': 'Note Aggiuntive',
        'autorizzazione_firma': 'Autorizzazione e Firma'
    }
    
    sections = declaration.get("sections", {})
    
    for section_key, section_title in section_names.items():
        section = sections.get(section_key, {})
        
        elements.append(Paragraph(section_title, heading_style))
        
        if section.get("not_applicable"):
            elements.append(Paragraph("Il cliente ha indicato: Non applicabile / Non presente", normal_style))
        elif not section.get("data") or len(section.get("data", {})) == 0:
            elements.append(Paragraph("Sezione non compilata", normal_style))
        else:
            data = section.get("data", {})
            for key, value in data.items():
                if value is not None and value != "" and value != []:
                    field_name = key.replace("_", " ").title()
                    if isinstance(value, list):
                        value = ", ".join(str(v) for v in value)
                    elements.append(Paragraph(f"<b>{field_name}:</b> {value}", normal_style))
        
        elements.append(Spacer(1, 10))
    
    # Firma
    if declaration.get("is_signed"):
        signature = declaration.get("signature", {})
        elements.append(Paragraph("DICHIARAZIONE FIRMATA", heading_style))
        elements.append(Paragraph(f"Data firma: {signature.get('signed_at', 'N/A')[:19] if signature.get('signed_at') else 'N/A'}", normal_style))
        elements.append(Paragraph("Termini accettati: Si", normal_style))
        
        # Aggiungi immagine firma se presente
        if signature.get("signature_image") and signature["signature_image"].startswith("data:image"):
            try:
                # Estrai base64
                img_data = signature["signature_image"].split(",")[1]
                img_bytes = base64.b64decode(img_data)
                img_buffer = io.BytesIO(img_bytes)
                
                from reportlab.platypus import Image as RLImage
                img = RLImage(img_buffer, width=6*cm, height=2*cm)
                elements.append(Spacer(1, 10))
                elements.append(img)
            except Exception as e:
                logger.warning(f"Impossibile aggiungere immagine firma al PDF: {e}")
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "Documento generato automaticamente da Fiscal Tax Canarie",
        ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey)
    ))
    elements.append(Paragraph(
        f"Data generazione: {now_iso()[:19]}",
        ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey)
    ))
    
    doc.build(elements)
    return buffer.getvalue()


@router.get("/admin/declarations/{declaration_id}/pdf")
async def download_declaration_pdf(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Download PDF riepilogativo della dichiarazione (solo admin)
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    try:
        pdf_content = generate_declaration_pdf_content(declaration)
        
        filename = f"dichiarazione_{declaration['anno_fiscale']}_{declaration['client_name'].replace(' ', '_')}.pdf"
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Libreria reportlab non installata. Eseguire: pip install reportlab"
        )
    except Exception as e:
        logger.error(f"Errore generazione PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione PDF: {str(e)}")


@router.get("/admin/declarations/{declaration_id}/zip")
async def download_declaration_zip(
    declaration_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Download ZIP con PDF riepilogativo + tutti gli allegati (solo admin)
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Crea ZIP in memoria
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Aggiungi PDF riepilogativo
        try:
            pdf_content = generate_declaration_pdf_content(declaration)
            zf.writestr("riepilogo_dichiarazione.pdf", pdf_content)
        except Exception as e:
            logger.warning(f"Impossibile generare PDF per ZIP: {e}")
        
        # Aggiungi documenti allegati
        documents = declaration.get("documents", [])
        for doc in documents:
            file_path = doc.get("file_path")
            if file_path and os.path.exists(file_path):
                # Usa nome originale nel ZIP
                zf.write(file_path, f"allegati/{doc['filename']}")
    
    zip_buffer.seek(0)
    
    client_name = declaration.get("client_name", "cliente").replace(" ", "_")
    anno = declaration.get("anno_fiscale", "")
    filename = f"pratica_{anno}_{client_name}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


# =============================================================================
# API MESSAGGI CON ALLEGATI E NOTIFICHE
# =============================================================================

class MessageWithAttachment(BaseModel):
    """Messaggio con possibile allegato"""
    content: str
    is_integration_request: bool = False


@router.post("/declarations/{declaration_id}/messages/with-attachment", response_model=Dict)
async def add_message_with_attachment(
    declaration_id: str,
    content: str = Form(...),
    is_integration_request: bool = Form(default=False),
    file: Optional[UploadFile] = File(default=None),
    user: dict = Depends(get_current_user_v2)
):
    """
    Aggiungi messaggio con allegato opzionale.
    Se admin invia richiesta integrazione -> push + email al cliente.
    """
    db = get_db()
    
    # Import servizi notifica
    from push_service import get_client_push_tokens, ExpoPushService
    from email_service import send_email
    
    query = {"id": declaration_id}
    if user.get("role") == "cliente":
        query["client_id"] = user["id"]
    
    declaration = await db.declarations_v2.find_one(query)
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    is_admin = user.get("role") in ["commercialista", "super_admin", "admin"]
    
    # Gestione allegato
    attachment = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Tipo file non permesso")
        
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File troppo grande")
        
        # Salva allegato
        attach_id = generate_id()
        safe_filename = f"{attach_id}{ext}"
        decl_dir = os.path.join(UPLOAD_DIR, declaration_id, "messages")
        os.makedirs(decl_dir, exist_ok=True)
        file_path = os.path.join(decl_dir, safe_filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        attachment = {
            "id": attach_id,
            "filename": file.filename,
            "stored_filename": safe_filename,
            "file_path": file_path,
            "file_size": len(file_content),
            "mime_type": file.content_type
        }
    
    # Crea messaggio
    message = {
        "id": generate_id(),
        "sender_id": user["id"],
        "sender_name": user.get("full_name", user.get("email")),
        "sender_role": "admin" if is_admin else "cliente",
        "content": content,
        "is_integration_request": is_integration_request and is_admin,
        "is_resolved": False,
        "attachment": attachment,
        "created_at": now_iso()
    }
    
    update_ops = {
        "$push": {"messages": message},
        "$inc": {"messages_count": 1},
        "$set": {"updated_at": now_iso()}
    }
    
    # Se richiesta integrazione
    if is_integration_request and is_admin:
        update_ops["$inc"]["pending_integration_requests"] = 1
        update_ops["$set"]["status"] = "documentazione_incompleta"
    
    await db.declarations_v2.update_one({"id": declaration_id}, update_ops)
    
    # Invia notifiche se admin invia messaggio
    if is_admin:
        client_id = declaration.get("client_id")
        client_email = declaration.get("client_email")
        client_name = declaration.get("client_name", "Cliente")
        
        # Push notification
        try:
            tokens = await get_client_push_tokens(db, client_id)
            if tokens:
                push_title = "Richiesta Integrazione" if is_integration_request else "Nuovo messaggio"
                push_body = content[:100] + "..." if len(content) > 100 else content
                
                await ExpoPushService.send_push_notification(
                    push_tokens=tokens,
                    title=push_title,
                    body=push_body,
                    data={
                        "type": "declaration_message",
                        "declaration_id": declaration_id,
                        "is_integration_request": is_integration_request,
                        "screen": "DeclarationDetail"
                    }
                )
                logger.info(f"Push notification inviata a {client_id}")
        except Exception as e:
            logger.warning(f"Errore invio push: {e}")
        
        # Email
        try:
            email_subject = f"{'Richiesta Integrazione' if is_integration_request else 'Nuovo messaggio'} - Dichiarazione {declaration.get('anno_fiscale')}"
            email_html = f"""
            <h2>Ciao {client_name},</h2>
            <p>{'Hai ricevuto una richiesta di integrazione documenti' if is_integration_request else 'Hai ricevuto un nuovo messaggio'} 
               per la tua dichiarazione dei redditi {declaration.get('anno_fiscale')}:</p>
            <div style="background: {'#fff7ed' if is_integration_request else '#f0fafa'}; 
                        border-left: 4px solid {'#f97316' if is_integration_request else '#0d9488'}; 
                        padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; white-space: pre-wrap;">{content}</p>
            </div>
            <p>Accedi alla tua area clienti per rispondere o caricare i documenti richiesti.</p>
            """
            
            await send_email(
                to_email=client_email,
                to_name=client_name,
                subject=email_subject,
                html_content=email_html
            )
            logger.info(f"Email notifica inviata a {client_email}")
        except Exception as e:
            logger.warning(f"Errore invio email: {e}")
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)


@router.put("/declarations/{declaration_id}/messages/{message_id}/resolve")
async def resolve_integration_request(
    declaration_id: str,
    message_id: str,
    user: dict = Depends(get_current_user_v2)
):
    """
    Marca una richiesta di integrazione come risolta.
    """
    db = get_db()
    
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Solo admin può risolvere richieste")
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Trova e aggiorna messaggio
    messages = declaration.get("messages", [])
    found = False
    for msg in messages:
        if msg["id"] == message_id and msg.get("is_integration_request"):
            msg["is_resolved"] = True
            msg["resolved_at"] = now_iso()
            msg["resolved_by"] = user["id"]
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Richiesta integrazione non trovata")
    
    # Conta richieste pendenti
    pending = sum(1 for m in messages if m.get("is_integration_request") and not m.get("is_resolved"))
    
    await db.declarations_v2.update_one(
        {"id": declaration_id},
        {
            "$set": {
                "messages": messages,
                "pending_integration_requests": pending,
                "updated_at": now_iso()
            }
        }
    )
    
    return {"success": True, "pending_requests": pending}


# =============================================================================
# API NOTIFICHE CAMBIO STATO
# =============================================================================

@router.put("/admin/declarations/{declaration_id}/status-notify", response_model=Dict)
async def admin_update_status_with_notification(
    declaration_id: str,
    data: DeclarationStatusUpdate,
    user: dict = Depends(get_current_user_v2)
):
    """
    Admin aggiorna stato e invia notifica push + email al cliente.
    """
    if user.get("role") not in ["commercialista", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    db = get_db()
    
    from push_service import get_client_push_tokens, ExpoPushService
    from email_service import send_email
    
    declaration = await db.declarations_v2.find_one({"id": declaration_id})
    
    if not declaration:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    old_status = declaration.get("status")
    new_status = data.new_status.value
    
    update_data = {
        "status": new_status,
        "updated_at": now_iso()
    }
    
    # Aggiungi nota come messaggio di sistema
    if data.note:
        message = {
            "id": generate_id(),
            "sender_id": user["id"],
            "sender_name": user.get("full_name", user.get("email")),
            "sender_role": "admin",
            "content": f"Stato aggiornato da '{old_status}' a '{new_status}': {data.note}",
            "is_system_message": True,
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
    
    # Invia notifiche al cliente
    client_id = declaration.get("client_id")
    client_email = declaration.get("client_email")
    client_name = declaration.get("client_name", "Cliente")
    anno = declaration.get("anno_fiscale")
    
    status_labels = {
        "bozza": "Bozza",
        "inviata": "Inviata",
        "documentazione_incompleta": "Documentazione Incompleta",
        "in_revisione": "In Revisione",
        "pronta": "Pronta",
        "presentata": "Presentata",
        "rifiutata": "Rifiutata"
    }
    
    status_label = status_labels.get(new_status, new_status)
    
    # Push
    try:
        tokens = await get_client_push_tokens(db, client_id)
        if tokens:
            await ExpoPushService.send_push_notification(
                push_tokens=tokens,
                title=f"Dichiarazione {anno} - Aggiornamento",
                body=f"Lo stato della tua dichiarazione è ora: {status_label}",
                data={
                    "type": "declaration_status",
                    "declaration_id": declaration_id,
                    "new_status": new_status,
                    "screen": "DeclarationDetail"
                }
            )
    except Exception as e:
        logger.warning(f"Errore push cambio stato: {e}")
    
    # Email
    try:
        status_colors = {
            "bozza": "#eab308",
            "inviata": "#3b82f6",
            "documentazione_incompleta": "#f97316",
            "in_revisione": "#8b5cf6",
            "pronta": "#10b981",
            "presentata": "#22c55e",
            "rifiutata": "#ef4444"
        }
        color = status_colors.get(new_status, "#64748b")
        
        email_html = f"""
        <h2>Ciao {client_name},</h2>
        <p>La tua dichiarazione dei redditi {anno} ha un nuovo stato:</p>
        <div style="background: white; border: 2px solid {color}; padding: 20px; 
                    margin: 20px 0; border-radius: 12px; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; color: {color}; margin: 0;">
                {status_label}
            </p>
        </div>
        {f'<p style="background: #f8fafc; padding: 15px; border-radius: 8px;"><strong>Nota:</strong> {data.note}</p>' if data.note else ''}
        <p>Accedi alla tua area clienti per maggiori dettagli.</p>
        """
        
        await send_email(
            to_email=client_email,
            to_name=client_name,
            subject=f"Dichiarazione {anno} - Stato: {status_label}",
            html_content=email_html
        )
    except Exception as e:
        logger.warning(f"Errore email cambio stato: {e}")
    
    updated = await db.declarations_v2.find_one({"id": declaration_id}, {"_id": 0})
    return serialize_declaration(updated, include_sections=True)
