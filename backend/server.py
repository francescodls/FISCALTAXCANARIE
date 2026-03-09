from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64

# Import AI service
from ai_service import extract_text_from_pdf, analyze_document_with_ai, generate_standard_filename

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'fiscal-tax-canarie-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Commercialista predefinito
ADMIN_EMAIL = "info@fiscaltaxcanarie.com"
ADMIN_PASSWORD = "Triana48+"

app = FastAPI(title="Fiscal Tax Canarie API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    role: str
    stato: str = "attivo"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    indirizzo: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    stato: Optional[str] = None
    note_interne: Optional[str] = None

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    client_id: str

class DocumentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    client_id: str
    file_name: str
    file_data: Optional[str] = None
    uploaded_by: str
    created_at: str
    ai_description: Optional[str] = None
    tags: List[str] = []

class PayslipResponse(BaseModel):
    id: str
    title: str
    month: str
    year: int
    client_id: str
    file_name: str
    file_data: Optional[str] = None
    uploaded_by: str
    created_at: str

class NoteCreate(BaseModel):
    title: str
    content: str
    client_id: str
    is_internal: bool = False

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    client_id: str
    is_internal: bool
    created_by: str
    created_at: str
    updated_at: str

class DeadlineCreate(BaseModel):
    title: str
    description: str
    due_date: str
    category: str
    is_recurring: bool = False
    applies_to_all: bool = True
    client_ids: List[str] = []
    status: str = "da_fare"  # da_fare, in_lavorazione, completata, scaduta
    priority: str = "normale"  # bassa, normale, alta, urgente
    modello_tributario_id: Optional[str] = None

class DeadlineResponse(BaseModel):
    id: str
    title: str
    description: str
    due_date: str
    category: str
    is_recurring: bool
    applies_to_all: bool
    client_ids: List[str]
    status: str
    priority: str
    modello_tributario_id: Optional[str] = None
    created_at: Optional[str] = None

class ClientListResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    stato: str = "attivo"
    created_at: str
    documents_count: int = 0
    payslips_count: int = 0
    notes_count: int = 0

# Modello Tributario
class ModelloTributarioCreate(BaseModel):
    codice: str  # es: "Modelo-303", "IGIC"
    nome: str
    descrizione: str
    a_cosa_serve: str
    chi_deve_presentarlo: str
    periodicita: str  # trimestrale, mensile, annuale
    scadenza_tipica: str
    documenti_necessari: List[str] = []
    conseguenze_mancata_presentazione: str
    note_operative: Optional[str] = None

class ModelloTributarioResponse(BaseModel):
    id: str
    codice: str
    nome: str
    descrizione: str
    a_cosa_serve: str
    chi_deve_presentarlo: str
    periodicita: str
    scadenza_tipica: str
    documenti_necessari: List[str]
    conseguenze_mancata_presentazione: str
    note_operative: Optional[str] = None
    created_at: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def require_commercialista(user: dict = Depends(get_current_user)):
    if user["role"] != "commercialista":
        raise HTTPException(status_code=403, detail="Accesso riservato ai commercialisti")
    return user

# ==================== INIT ADMIN ====================

async def init_admin_user():
    """Crea l'account commercialista predefinito se non esiste"""
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "email": ADMIN_EMAIL,
            "password": hash_password(ADMIN_PASSWORD),
            "full_name": "Fiscal Tax Canarie",
            "phone": None,
            "codice_fiscale": None,
            "indirizzo": None,
            "regime_fiscale": None,
            "tipo_attivita": None,
            "role": "commercialista",
            "stato": "attivo",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Account commercialista creato: {ADMIN_EMAIL}")

@app.on_event("startup")
async def startup_event():
    await init_admin_user()
    await init_default_modelli_tributari()

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Registrazione SOLO per clienti"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # Sempre cliente - nessuna opzione per commercialista
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "codice_fiscale": user_data.codice_fiscale,
        "indirizzo": user_data.indirizzo,
        "regime_fiscale": user_data.regime_fiscale,
        "tipo_attivita": user_data.tipo_attivita,
        "role": "cliente",  # SEMPRE cliente
        "stato": "attivo",
        "note_interne": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Log attività
    await log_activity("registrazione", f"Nuovo cliente registrato: {user_data.email}", user_id)
    
    token = create_token(user_id, user_data.email, "cliente")
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        codice_fiscale=user_data.codice_fiscale,
        indirizzo=user_data.indirizzo,
        regime_fiscale=user_data.regime_fiscale,
        tipo_attivita=user_data.tipo_attivita,
        role="cliente",
        stato="attivo",
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Log attività
    await log_activity("login", f"Accesso utente: {credentials.email}", user["id"])
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        codice_fiscale=user.get("codice_fiscale"),
        indirizzo=user.get("indirizzo"),
        regime_fiscale=user.get("regime_fiscale"),
        tipo_attivita=user.get("tipo_attivita"),
        role=user["role"],
        stato=user.get("stato", "attivo"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        codice_fiscale=user.get("codice_fiscale"),
        indirizzo=user.get("indirizzo"),
        regime_fiscale=user.get("regime_fiscale"),
        tipo_attivita=user.get("tipo_attivita"),
        role=user["role"],
        stato=user.get("stato", "attivo"),
        created_at=user["created_at"]
    )

# ==================== CLIENTS ROUTES (COMMERCIALISTA) ====================

@api_router.get("/clients", response_model=List[ClientListResponse])
async def get_clients(user: dict = Depends(require_commercialista)):
    clients = await db.users.find({"role": "cliente"}, {"_id": 0, "password": 0}).to_list(1000)
    result = []
    for client in clients:
        docs_count = await db.documents.count_documents({"client_id": client["id"]})
        payslips_count = await db.payslips.count_documents({"client_id": client["id"]})
        notes_count = await db.notes.count_documents({"client_id": client["id"]})
        result.append(ClientListResponse(
            id=client["id"],
            email=client["email"],
            full_name=client["full_name"],
            phone=client.get("phone"),
            codice_fiscale=client.get("codice_fiscale"),
            stato=client.get("stato", "attivo"),
            created_at=client["created_at"],
            documents_count=docs_count,
            payslips_count=payslips_count,
            notes_count=notes_count
        ))
    return result

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(require_commercialista)):
    client = await db.users.find_one({"id": client_id, "role": "cliente"}, {"_id": 0, "password": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return client

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, update_data: ClientUpdate, user: dict = Depends(require_commercialista)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    result = await db.users.update_one({"id": client_id, "role": "cliente"}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    await log_activity("modifica_cliente", f"Cliente {client_id} modificato", user["id"])
    return {"message": "Cliente aggiornato"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_commercialista)):
    # Archivia invece di eliminare
    result = await db.users.update_one(
        {"id": client_id, "role": "cliente"},
        {"$set": {"stato": "cessato"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    await log_activity("eliminazione_cliente", f"Cliente {client_id} archiviato", user["id"])
    return {"message": "Cliente archiviato"}

# ==================== DOCUMENTS ROUTES ====================

@api_router.post("/documents")
async def upload_document(
    title: str = Form(...),
    description: str = Form(None),
    category: str = Form(...),
    client_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(require_commercialista)
):
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    doc_id = str(uuid.uuid4())
    document = {
        "id": doc_id,
        "title": title,
        "description": description,
        "category": category,
        "client_id": client_id,
        "file_name": file.filename,
        "file_data": file_base64,
        "file_type": file.content_type,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_description": None,
        "tags": [],
        "version": 1,
        "versions_history": []
    }
    await db.documents.insert_one(document)
    
    await log_activity("caricamento_documento", f"Documento {title} caricato per cliente {client_id}", user["id"])
    
    return {"id": doc_id, "message": "Documento caricato con successo"}

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
    elif client_id:
        query["client_id"] = client_id
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0, "versions_history": 0}).to_list(1000)
    return [DocumentResponse(**doc) for doc in documents]

@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
    document = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    if user["role"] == "cliente" and document["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    return document

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(require_commercialista)):
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    await log_activity("eliminazione_documento", f"Documento {doc_id} eliminato", user["id"])
    return {"message": "Documento eliminato"}

# ==================== AI DOCUMENT ANALYSIS ====================

@api_router.post("/documents/upload-auto")
async def upload_document_with_ai(
    file: UploadFile = File(...),
    client_id: Optional[str] = Form(None),
    user: dict = Depends(require_commercialista)
):
    """
    Carica un documento e lo analizza automaticamente con AI.
    - Estrae testo dal PDF
    - Identifica tipo documento, modello tributario
    - Suggerisce cliente se non specificato
    - Genera descrizione e tag
    - Rinomina automaticamente il file
    """
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    # Estrai testo dal PDF
    extracted_text = ""
    if file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
        extracted_text = await extract_text_from_pdf(file_base64)
    
    # Recupera lista clienti per matching
    clients = await db.users.find({"role": "cliente"}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Analizza con AI
    ai_result = await analyze_document_with_ai(
        file_content=extracted_text or f"File: {file.filename}",
        file_name=file.filename,
        clients_list=clients
    )
    
    # Determina cliente
    final_client_id = client_id
    client_confidence = "manuale"
    
    if not final_client_id and ai_result.get("success") and ai_result.get("cliente_identificato", {}).get("id"):
        final_client_id = ai_result["cliente_identificato"]["id"]
        client_confidence = ai_result["cliente_identificato"].get("confidenza", "bassa")
    
    # Se ancora nessun cliente, metti in "da verificare"
    needs_verification = not final_client_id or client_confidence == "bassa"
    
    # Genera nome file standardizzato
    suggested_filename = file.filename
    if ai_result.get("success") and ai_result.get("nome_file_suggerito"):
        suggested_filename = ai_result["nome_file_suggerito"]
    
    # Determina categoria
    category = "altro"
    if ai_result.get("success") and ai_result.get("categoria_suggerita"):
        category = ai_result["categoria_suggerita"]
    
    # Crea documento
    doc_id = str(uuid.uuid4())
    document = {
        "id": doc_id,
        "title": ai_result.get("descrizione", file.filename) if ai_result.get("success") else file.filename,
        "description": ai_result.get("descrizione_estesa") if ai_result.get("success") else None,
        "category": category,
        "client_id": final_client_id,
        "file_name": file.filename,
        "file_name_suggested": suggested_filename,
        "file_data": file_base64,
        "file_type": file.content_type,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_analysis": ai_result if ai_result.get("success") else None,
        "ai_description": ai_result.get("descrizione_estesa") if ai_result.get("success") else None,
        "tags": ai_result.get("tags", []) if ai_result.get("success") else [],
        "modello_tributario": ai_result.get("modello_tributario") if ai_result.get("success") else None,
        "data_documento": ai_result.get("data_documento") if ai_result.get("success") else None,
        "periodo_riferimento": ai_result.get("periodo_riferimento") if ai_result.get("success") else None,
        "needs_verification": needs_verification,
        "client_confidence": client_confidence,
        "version": 1,
        "versions_history": [],
        "extracted_text": extracted_text[:2000] if extracted_text else None
    }
    await db.documents.insert_one(document)
    
    await log_activity(
        "caricamento_documento_ai", 
        f"Documento {file.filename} caricato con analisi AI. Cliente: {final_client_id or 'da assegnare'}, Confidenza: {client_confidence}",
        user["id"]
    )
    
    return {
        "id": doc_id,
        "message": "Documento caricato e analizzato con successo",
        "ai_analysis": ai_result if ai_result.get("success") else None,
        "needs_verification": needs_verification,
        "client_id": final_client_id,
        "client_confidence": client_confidence,
        "suggested_filename": suggested_filename,
        "category": category
    }

@api_router.get("/documents/pending-verification")
async def get_documents_pending_verification(user: dict = Depends(require_commercialista)):
    """Recupera documenti che necessitano verifica manuale"""
    documents = await db.documents.find(
        {"needs_verification": True},
        {"_id": 0, "file_data": 0, "extracted_text": 0}
    ).to_list(100)
    return documents

@api_router.put("/documents/{doc_id}/verify")
async def verify_document(
    doc_id: str,
    client_id: str = Form(...),
    title: str = Form(None),
    category: str = Form(None),
    user: dict = Depends(require_commercialista)
):
    """Verifica e corregge l'assegnazione di un documento"""
    update_data = {
        "client_id": client_id,
        "needs_verification": False,
        "client_confidence": "verificato"
    }
    if title:
        update_data["title"] = title
    if category:
        update_data["category"] = category
    
    result = await db.documents.update_one({"id": doc_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    await log_activity("verifica_documento", f"Documento {doc_id} verificato e assegnato a {client_id}", user["id"])
    
    return {"message": "Documento verificato con successo"}

@api_router.put("/documents/{doc_id}/rename")
async def rename_document(
    doc_id: str,
    new_filename: str = Form(...),
    user: dict = Depends(require_commercialista)
):
    """Rinomina un documento"""
    result = await db.documents.update_one({"id": doc_id}, {"$set": {"file_name": new_filename}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    await log_activity("rinomina_documento", f"Documento {doc_id} rinominato in {new_filename}", user["id"])
    
    return {"message": "Documento rinominato con successo"}

# ==================== PAYSLIPS ROUTES ====================

@api_router.post("/payslips")
async def upload_payslip(
    title: str = Form(...),
    month: str = Form(...),
    year: int = Form(...),
    client_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(require_commercialista)
):
    file_content = await file.read()
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    payslip_id = str(uuid.uuid4())
    payslip = {
        "id": payslip_id,
        "title": title,
        "month": month,
        "year": year,
        "client_id": client_id,
        "file_name": file.filename,
        "file_data": file_base64,
        "file_type": file.content_type,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payslips.insert_one(payslip)
    
    await log_activity("caricamento_busta_paga", f"Busta paga {month}/{year} caricata per cliente {client_id}", user["id"])
    
    return {"id": payslip_id, "message": "Busta paga caricata con successo"}

@api_router.get("/payslips", response_model=List[PayslipResponse])
async def get_payslips(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
    elif client_id:
        query["client_id"] = client_id
    
    payslips = await db.payslips.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
    return [PayslipResponse(**p) for p in payslips]

@api_router.get("/payslips/{payslip_id}")
async def get_payslip(payslip_id: str, user: dict = Depends(get_current_user)):
    payslip = await db.payslips.find_one({"id": payslip_id}, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Busta paga non trovata")
    
    if user["role"] == "cliente" and payslip["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    return payslip

@api_router.delete("/payslips/{payslip_id}")
async def delete_payslip(payslip_id: str, user: dict = Depends(require_commercialista)):
    result = await db.payslips.delete_one({"id": payslip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Busta paga non trovata")
    return {"message": "Busta paga eliminata"}

# ==================== NOTES ROUTES ====================

@api_router.post("/notes", response_model=NoteResponse)
async def create_note(note_data: NoteCreate, user: dict = Depends(require_commercialista)):
    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": note_id,
        "title": note_data.title,
        "content": note_data.content,
        "client_id": note_data.client_id,
        "is_internal": note_data.is_internal,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.notes.insert_one(note)
    return NoteResponse(**note)

@api_router.get("/notes", response_model=List[NoteResponse])
async def get_notes(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
        query["is_internal"] = False
    elif client_id:
        query["client_id"] = client_id
    
    notes = await db.notes.find(query, {"_id": 0}).to_list(1000)
    return [NoteResponse(**n) for n in notes]

@api_router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_data: NoteCreate, user: dict = Depends(require_commercialista)):
    update_data = {
        "title": note_data.title,
        "content": note_data.content,
        "is_internal": note_data.is_internal,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.notes.update_one({"id": note_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nota non trovata")
    
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return NoteResponse(**note)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(require_commercialista)):
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nota non trovata")
    return {"message": "Nota eliminata"}

# ==================== DEADLINES ROUTES ====================

@api_router.get("/deadlines", response_model=List[DeadlineResponse])
async def get_deadlines(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "cliente":
        query = {
            "$or": [
                {"applies_to_all": True},
                {"client_ids": user["id"]}
            ]
        }
    
    deadlines = await db.deadlines.find(query, {"_id": 0}).to_list(1000)
    
    # Aggiorna stato scadenze scadute e aggiungi campi mancanti
    now = datetime.now(timezone.utc).date()
    result = []
    for deadline in deadlines:
        # Aggiungi valori di default per campi mancanti
        deadline.setdefault("status", "da_fare")
        deadline.setdefault("priority", "normale")
        deadline.setdefault("modello_tributario_id", None)
        deadline.setdefault("created_at", None)
        
        due_date = datetime.fromisoformat(deadline["due_date"]).date() if isinstance(deadline["due_date"], str) else deadline["due_date"]
        if due_date < now and deadline.get("status") not in ["completata", "scaduta"]:
            deadline["status"] = "scaduta"
            await db.deadlines.update_one({"id": deadline["id"]}, {"$set": {"status": "scaduta", "priority": deadline["priority"]}})
        
        result.append(DeadlineResponse(**deadline))
    
    return result

@api_router.post("/deadlines", response_model=DeadlineResponse)
async def create_deadline(deadline_data: DeadlineCreate, user: dict = Depends(require_commercialista)):
    deadline_id = str(uuid.uuid4())
    deadline = {
        "id": deadline_id,
        "title": deadline_data.title,
        "description": deadline_data.description,
        "due_date": deadline_data.due_date,
        "category": deadline_data.category,
        "is_recurring": deadline_data.is_recurring,
        "applies_to_all": deadline_data.applies_to_all,
        "client_ids": deadline_data.client_ids,
        "status": deadline_data.status,
        "priority": deadline_data.priority,
        "modello_tributario_id": deadline_data.modello_tributario_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deadlines.insert_one(deadline)
    
    await log_activity("creazione_scadenza", f"Scadenza {deadline_data.title} creata", user["id"])
    
    return DeadlineResponse(**deadline)

@api_router.put("/deadlines/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(deadline_id: str, deadline_data: DeadlineCreate, user: dict = Depends(require_commercialista)):
    update_dict = deadline_data.model_dump()
    result = await db.deadlines.update_one({"id": deadline_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    
    deadline = await db.deadlines.find_one({"id": deadline_id}, {"_id": 0})
    return DeadlineResponse(**deadline)

@api_router.patch("/deadlines/{deadline_id}/status")
async def update_deadline_status(deadline_id: str, status: str = Form(...), user: dict = Depends(get_current_user)):
    if status not in ["da_fare", "in_lavorazione", "completata", "scaduta"]:
        raise HTTPException(status_code=400, detail="Stato non valido")
    
    result = await db.deadlines.update_one({"id": deadline_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    
    await log_activity("modifica_stato_scadenza", f"Scadenza {deadline_id} stato cambiato a {status}", user["id"])
    
    return {"message": "Stato aggiornato"}

@api_router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: str, user: dict = Depends(require_commercialista)):
    result = await db.deadlines.delete_one({"id": deadline_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    return {"message": "Scadenza eliminata"}

# ==================== MODELLI TRIBUTARI ROUTES ====================

async def init_default_modelli_tributari():
    """Inizializza i modelli tributari predefiniti"""
    count = await db.modelli_tributari.count_documents({})
    if count > 0:
        return
    
    modelli = [
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-303",
            "nome": "Dichiarazione IVA Trimestrale",
            "descrizione": "Modello per la dichiarazione trimestrale dell'IVA (Impuesto sobre el Valor Añadido)",
            "a_cosa_serve": "Dichiarare l'IVA a debito o a credito del trimestre. Permette di calcolare la differenza tra IVA incassata e IVA pagata.",
            "chi_deve_presentarlo": "Tutti i soggetti passivi IVA: imprenditori, professionisti e società che realizzano operazioni soggette ad IVA.",
            "periodicita": "Trimestrale",
            "scadenza_tipica": "20 aprile, 20 luglio, 20 ottobre, 30 gennaio",
            "documenti_necessari": ["Fatture emesse", "Fatture ricevute", "Libro IVA vendite", "Libro IVA acquisti"],
            "conseguenze_mancata_presentazione": "Sanzioni dal 50% al 150% dell'importo non dichiarato. Interessi di mora. Possibili controlli fiscali.",
            "note_operative": "Verificare sempre la corrispondenza tra registri IVA e dichiarazione.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-111",
            "nome": "Ritenute IRPF su Lavoro",
            "descrizione": "Dichiarazione trimestrale delle ritenute effettuate su redditi da lavoro dipendente e autonomo.",
            "a_cosa_serve": "Dichiarare e versare le ritenute IRPF effettuate su stipendi, compensi professionali e altri redditi.",
            "chi_deve_presentarlo": "Datori di lavoro, imprese e professionisti che effettuano pagamenti soggetti a ritenuta.",
            "periodicita": "Trimestrale",
            "scadenza_tipica": "20 aprile, 20 luglio, 20 ottobre, 20 gennaio",
            "documenti_necessari": ["Buste paga", "Fatture professionisti", "Registro ritenute"],
            "conseguenze_mancata_presentazione": "Sanzioni dal 50% al 150% delle ritenute non dichiarate. Responsabilità solidale.",
            "note_operative": "Conservare tutta la documentazione relativa ai pagamenti effettuati.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-130",
            "nome": "Pagamento Frazionato IRPF",
            "descrizione": "Pagamento frazionato dell'IRPF per autonomi in regime di stima diretta.",
            "a_cosa_serve": "Anticipare trimestralmente l'IRPF dovuto sui redditi da attività economica.",
            "chi_deve_presentarlo": "Lavoratori autonomi e professionisti in regime di stima diretta (normale o semplificata).",
            "periodicita": "Trimestrale",
            "scadenza_tipica": "20 aprile, 20 luglio, 20 ottobre, 30 gennaio",
            "documenti_necessari": ["Libro entrate e uscite", "Fatture emesse", "Fatture ricevute"],
            "conseguenze_mancata_presentazione": "Sanzioni per mancato pagamento. Interessi di mora. Maggiori controlli nella dichiarazione annuale.",
            "note_operative": "Il 20% del rendimento netto trimestrale, con deduzione delle ritenute subite.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "IGIC",
            "nome": "Imposta Generale Indiretta Canarie",
            "descrizione": "Imposta indiretta delle Isole Canarie equivalente all'IVA peninsulare.",
            "a_cosa_serve": "Dichiarare l'IGIC a debito o credito. Le Canarie hanno un regime fiscale speciale con aliquote ridotte.",
            "chi_deve_presentarlo": "Tutti i soggetti passivi IGIC che operano nelle Isole Canarie.",
            "periodicita": "Trimestrale/Mensile",
            "scadenza_tipica": "20 del mese successivo al periodo",
            "documenti_necessari": ["Fatture con IGIC", "Registri IGIC", "Documenti import/export"],
            "conseguenze_mancata_presentazione": "Sanzioni equivalenti a quelle IVA. Perdita benefici fiscali canari.",
            "note_operative": "Aliquota generale 7%. Aliquote ridotte 0%, 3%. Verificare esenzioni specifiche Canarie.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-390",
            "nome": "Riepilogo Annuale IVA",
            "descrizione": "Dichiarazione riepilogativa annuale delle operazioni IVA.",
            "a_cosa_serve": "Riepilogare tutte le operazioni IVA dell'anno. Confronto con le dichiarazioni trimestrali.",
            "chi_deve_presentarlo": "Tutti i soggetti passivi IVA obbligati a presentare il Modelo 303.",
            "periodicita": "Annuale",
            "scadenza_tipica": "30 gennaio dell'anno successivo",
            "documenti_necessari": ["Modelli 303 trimestrali", "Libri IVA completi", "Fatture annuali"],
            "conseguenze_mancata_presentazione": "Sanzioni fisse e proporzionali. Impossibilità di ottenere certificati fiscali.",
            "note_operative": "Deve coincidere con la somma dei quattro trimestri. Verificare operazioni intracomunitarie.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-200",
            "nome": "Imposta sulle Società",
            "descrizione": "Dichiarazione annuale dell'Imposta sulle Società.",
            "a_cosa_serve": "Dichiarare il risultato fiscale della società e calcolare l'imposta dovuta.",
            "chi_deve_presentarlo": "Tutte le società e entità giuridiche residenti in Spagna.",
            "periodicita": "Annuale",
            "scadenza_tipica": "25 luglio (esercizio coincidente con anno solare)",
            "documenti_necessari": ["Bilancio", "Conto economico", "Libri contabili", "Documentazione fiscale"],
            "conseguenze_mancata_presentazione": "Sanzioni dal 50% al 150% della quota non dichiarata. Responsabilità amministratori.",
            "note_operative": "Aliquota generale 25%. Verificare incentivi ZEC per Canarie.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "Modelo-347",
            "nome": "Operazioni con Terzi",
            "descrizione": "Dichiarazione annuale delle operazioni con terzi superiori a 3.005,06€.",
            "a_cosa_serve": "Informare l'Agenzia delle Entrate delle operazioni significative con clienti e fornitori.",
            "chi_deve_presentarlo": "Tutti i soggetti che hanno realizzato operazioni superiori a 3.005,06€ con un singolo cliente/fornitore.",
            "periodicita": "Annuale",
            "scadenza_tipica": "28 febbraio",
            "documenti_necessari": ["Elenco clienti/fornitori", "Fatture superiori alla soglia", "NIF delle controparti"],
            "conseguenze_mancata_presentazione": "Sanzioni da 20€ per dato omesso fino a 20.000€. Controlli incrociati.",
            "note_operative": "Include operazioni in contanti superiori a 6.000€. Escluse operazioni intracomunitarie.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "codice": "IRPF-Renta",
            "nome": "Dichiarazione Redditi Persone Fisiche",
            "descrizione": "Dichiarazione annuale dei redditi delle persone fisiche (IRPF).",
            "a_cosa_serve": "Dichiarare tutti i redditi percepiti nell'anno e calcolare l'imposta definitiva.",
            "chi_deve_presentarlo": "Persone fisiche residenti con redditi superiori alle soglie di esenzione.",
            "periodicita": "Annuale",
            "scadenza_tipica": "30 giugno",
            "documenti_necessari": ["Certificati ritenute", "Dati immobiliari", "Spese deducibili", "Dati familiari"],
            "conseguenze_mancata_presentazione": "Sanzioni dal 50% al 150%. Perdita deduzioni. Maggiorazione interessi.",
            "note_operative": "Verificare sempre residenza fiscale. Deduzioni per investimenti Canarie.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for modello in modelli:
        await db.modelli_tributari.insert_one(modello)
    
    # NON creare scadenze predefinite - il commercialista le assegna per tipo cliente

async def init_default_deadlines():
    """Inizializza le scadenze predefinite"""
    count = await db.deadlines.count_documents({})
    if count > 0:
        return
    
    deadlines = [
        {"title": "Modelo 303 - IVA Trimestrale Q1", "description": "Dichiarazione trimestrale IVA primo trimestre", "due_date": "2025-04-20", "category": "IVA", "status": "da_fare", "priority": "alta"},
        {"title": "Modelo 111 - Ritenute IRPF Q1", "description": "Dichiarazione trimestrale ritenute primo trimestre", "due_date": "2025-04-20", "category": "IRPF", "status": "da_fare", "priority": "alta"},
        {"title": "Modelo 130 - Pagamento Frazionato Q1", "description": "Pagamento frazionato IRPF primo trimestre", "due_date": "2025-04-20", "category": "IRPF", "status": "da_fare", "priority": "normale"},
        {"title": "IGIC Trimestrale Q1", "description": "Dichiarazione IGIC primo trimestre", "due_date": "2025-04-20", "category": "IGIC", "status": "da_fare", "priority": "alta"},
        {"title": "Modelo 303 - IVA Trimestrale Q2", "description": "Dichiarazione trimestrale IVA secondo trimestre", "due_date": "2025-07-20", "category": "IVA", "status": "da_fare", "priority": "alta"},
        {"title": "Modelo 200 - Imposta Società", "description": "Dichiarazione annuale imposta sulle società", "due_date": "2025-07-25", "category": "Società", "status": "da_fare", "priority": "urgente"},
        {"title": "IRPF - Dichiarazione Annuale", "description": "Dichiarazione dei redditi persone fisiche", "due_date": "2025-06-30", "category": "IRPF", "status": "da_fare", "priority": "urgente"},
        {"title": "Modelo 347 - Operazioni con Terzi", "description": "Dichiarazione annuale operazioni con terzi", "due_date": "2025-02-28", "category": "Informativa", "status": "da_fare", "priority": "normale"},
        {"title": "Modelo 390 - Riepilogo Annuale IVA", "description": "Dichiarazione riepilogativa annuale IVA", "due_date": "2025-01-30", "category": "IVA", "status": "da_fare", "priority": "alta"},
    ]
    
    for d in deadlines:
        deadline = {
            "id": str(uuid.uuid4()),
            "title": d["title"],
            "description": d["description"],
            "due_date": d["due_date"],
            "category": d["category"],
            "is_recurring": True,
            "applies_to_all": True,
            "client_ids": [],
            "status": d["status"],
            "priority": d["priority"],
            "modello_tributario_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.deadlines.insert_one(deadline)

@api_router.get("/modelli-tributari", response_model=List[ModelloTributarioResponse])
async def get_modelli_tributari(user: dict = Depends(get_current_user)):
    modelli = await db.modelli_tributari.find({}, {"_id": 0}).to_list(100)
    return [ModelloTributarioResponse(**m) for m in modelli]

@api_router.get("/modelli-tributari/{modello_id}", response_model=ModelloTributarioResponse)
async def get_modello_tributario(modello_id: str, user: dict = Depends(get_current_user)):
    modello = await db.modelli_tributari.find_one({"id": modello_id}, {"_id": 0})
    if not modello:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    return ModelloTributarioResponse(**modello)

@api_router.post("/modelli-tributari", response_model=ModelloTributarioResponse)
async def create_modello_tributario(modello_data: ModelloTributarioCreate, user: dict = Depends(require_commercialista)):
    modello_id = str(uuid.uuid4())
    modello = {
        "id": modello_id,
        **modello_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.modelli_tributari.insert_one(modello)
    return ModelloTributarioResponse(**modello)

@api_router.put("/modelli-tributari/{modello_id}", response_model=ModelloTributarioResponse)
async def update_modello_tributario(modello_id: str, modello_data: ModelloTributarioCreate, user: dict = Depends(require_commercialista)):
    update_dict = modello_data.model_dump()
    result = await db.modelli_tributari.update_one({"id": modello_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    
    modello = await db.modelli_tributari.find_one({"id": modello_id}, {"_id": 0})
    return ModelloTributarioResponse(**modello)

@api_router.delete("/modelli-tributari/{modello_id}")
async def delete_modello_tributario(modello_id: str, user: dict = Depends(require_commercialista)):
    result = await db.modelli_tributari.delete_one({"id": modello_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modello tributario non trovato")
    return {"message": "Modello tributario eliminato"}

# ==================== ACTIVITY LOG ====================

async def log_activity(action: str, description: str, user_id: str):
    """Registra un'attività nel log"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "description": description,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(log_entry)

@api_router.get("/activity-logs")
async def get_activity_logs(limit: int = 50, user: dict = Depends(require_commercialista)):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs

# ==================== STATS ROUTES ====================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    if user["role"] == "commercialista":
        clients_count = await db.users.count_documents({"role": "cliente"})
        clients_active = await db.users.count_documents({"role": "cliente", "stato": "attivo"})
        documents_count = await db.documents.count_documents({})
        payslips_count = await db.payslips.count_documents({})
        notes_count = await db.notes.count_documents({})
        
        # Scadenze per stato
        deadlines_da_fare = await db.deadlines.count_documents({"status": "da_fare"})
        deadlines_in_lavorazione = await db.deadlines.count_documents({"status": "in_lavorazione"})
        deadlines_completate = await db.deadlines.count_documents({"status": "completata"})
        deadlines_scadute = await db.deadlines.count_documents({"status": "scaduta"})
        
        # Documenti da verificare (senza AI description)
        docs_da_verificare = await db.documents.count_documents({"ai_description": None})
        
        return {
            "clients_count": clients_count,
            "clients_active": clients_active,
            "documents_count": documents_count,
            "payslips_count": payslips_count,
            "notes_count": notes_count,
            "deadlines_da_fare": deadlines_da_fare,
            "deadlines_in_lavorazione": deadlines_in_lavorazione,
            "deadlines_completate": deadlines_completate,
            "deadlines_scadute": deadlines_scadute,
            "docs_da_verificare": docs_da_verificare
        }
    else:
        documents_count = await db.documents.count_documents({"client_id": user["id"]})
        payslips_count = await db.payslips.count_documents({"client_id": user["id"]})
        notes_count = await db.notes.count_documents({"client_id": user["id"], "is_internal": False})
        
        # Scadenze del cliente
        deadlines_query = {"$or": [{"applies_to_all": True}, {"client_ids": user["id"]}]}
        deadlines_da_fare = await db.deadlines.count_documents({**deadlines_query, "status": "da_fare"})
        deadlines_completate = await db.deadlines.count_documents({**deadlines_query, "status": "completata"})
        
        return {
            "documents_count": documents_count,
            "payslips_count": payslips_count,
            "notes_count": notes_count,
            "deadlines_da_fare": deadlines_da_fare,
            "deadlines_completate": deadlines_completate
        }

@api_router.get("/")
async def root():
    return {"message": "Fiscal Tax Canarie API"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
