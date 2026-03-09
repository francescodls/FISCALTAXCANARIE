from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
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
    role: str = "cliente"  # cliente or commercialista

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str  # atto, imposta, contratto, altro
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

class PayslipCreate(BaseModel):
    title: str
    month: str
    year: int
    client_id: str

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
    is_internal: bool = False  # True = visible only to commercialista

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    client_id: str
    is_internal: bool
    created_by: str
    created_at: str
    updated_at: str

class DeadlineResponse(BaseModel):
    id: str
    title: str
    description: str
    due_date: str
    category: str
    is_recurring: bool
    applies_to_all: bool
    client_ids: List[str]

class ClientListResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    created_at: str
    documents_count: int = 0
    payslips_count: int = 0
    notes_count: int = 0

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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, user_data.role)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        role=user["role"],
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
        role=user["role"],
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
            created_at=client["created_at"],
            documents_count=docs_count,
            payslips_count=payslips_count,
            notes_count=notes_count
        ))
    return result

@api_router.get("/clients/{client_id}", response_model=UserResponse)
async def get_client(client_id: str, user: dict = Depends(require_commercialista)):
    client = await db.users.find_one({"id": client_id, "role": "cliente"}, {"_id": 0, "password": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return UserResponse(**client)

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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(document)
    return {"id": doc_id, "message": "Documento caricato con successo"}

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(client_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
    elif client_id:
        query["client_id"] = client_id
    
    documents = await db.documents.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
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
    return {"message": "Documento eliminato"}

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
        query["is_internal"] = False  # Clients can only see public notes
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
    # Get all deadlines that apply to all clients or specifically to this client
    query = {
        "$or": [
            {"applies_to_all": True},
            {"client_ids": user["id"]}
        ]
    }
    if user["role"] == "commercialista":
        query = {}  # Commercialista sees all deadlines
    
    deadlines = await db.deadlines.find(query, {"_id": 0}).to_list(1000)
    
    # If no deadlines exist, create default Canary Islands fiscal deadlines
    if not deadlines:
        default_deadlines = [
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 303 - IVA Trimestrale",
                "description": "Dichiarazione trimestrale IVA (Impuesto sobre el Valor Añadido)",
                "due_date": "2025-01-20",
                "category": "IVA",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 111 - Ritenute IRPF",
                "description": "Dichiarazione trimestrale ritenute su redditi da lavoro",
                "due_date": "2025-01-20",
                "category": "IRPF",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 130 - Pagamento Frazionato IRPF",
                "description": "Pagamento frazionato IRPF per autonomi",
                "due_date": "2025-01-20",
                "category": "IRPF",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 349 - Operazioni Intracomunitarie",
                "description": "Dichiarazione riepilogativa operazioni intracomunitarie",
                "due_date": "2025-01-30",
                "category": "Intracomunitario",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 390 - Riepilogo Annuale IVA",
                "description": "Dichiarazione riepilogativa annuale IVA",
                "due_date": "2025-01-30",
                "category": "IVA",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 190 - Riepilogo Ritenute",
                "description": "Riepilogo annuale ritenute e pagamenti a conto",
                "due_date": "2025-01-31",
                "category": "IRPF",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "IGIC Trimestrale",
                "description": "Imposta Generale Indiretta delle Canarie - Dichiarazione trimestrale",
                "due_date": "2025-01-20",
                "category": "IGIC",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Impuesto sobre Sociedades",
                "description": "Dichiarazione annuale imposta sulle società",
                "due_date": "2025-07-25",
                "category": "Società",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "IRPF - Dichiarazione Annuale",
                "description": "Dichiarazione dei redditi annuale persone fisiche",
                "due_date": "2025-06-30",
                "category": "IRPF",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 347 - Operazioni con Terzi",
                "description": "Dichiarazione annuale operazioni con terzi superiori a 3.005,06€",
                "due_date": "2025-02-28",
                "category": "Informativa",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 115 - Ritenute Affitti",
                "description": "Dichiarazione trimestrale ritenute su affitti immobili urbani",
                "due_date": "2025-04-20",
                "category": "Affitti",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Modelo 200 - Imposta Società",
                "description": "Dichiarazione annuale imposta sulle società",
                "due_date": "2025-07-25",
                "category": "Società",
                "is_recurring": True,
                "applies_to_all": True,
                "client_ids": []
            }
        ]
        for deadline in default_deadlines:
            await db.deadlines.insert_one(deadline)
        deadlines = default_deadlines
    
    return [DeadlineResponse(**d) for d in deadlines]

@api_router.post("/deadlines", response_model=DeadlineResponse)
async def create_deadline(
    title: str = Form(...),
    description: str = Form(...),
    due_date: str = Form(...),
    category: str = Form(...),
    is_recurring: bool = Form(False),
    applies_to_all: bool = Form(True),
    client_ids: str = Form(""),
    user: dict = Depends(require_commercialista)
):
    deadline_id = str(uuid.uuid4())
    client_ids_list = [cid.strip() for cid in client_ids.split(",") if cid.strip()] if client_ids else []
    
    deadline = {
        "id": deadline_id,
        "title": title,
        "description": description,
        "due_date": due_date,
        "category": category,
        "is_recurring": is_recurring,
        "applies_to_all": applies_to_all,
        "client_ids": client_ids_list
    }
    await db.deadlines.insert_one(deadline)
    return DeadlineResponse(**deadline)

@api_router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: str, user: dict = Depends(require_commercialista)):
    result = await db.deadlines.delete_one({"id": deadline_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scadenza non trovata")
    return {"message": "Scadenza eliminata"}

# ==================== STATS ROUTES ====================

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    if user["role"] == "commercialista":
        clients_count = await db.users.count_documents({"role": "cliente"})
        documents_count = await db.documents.count_documents({})
        payslips_count = await db.payslips.count_documents({})
        notes_count = await db.notes.count_documents({})
        return {
            "clients_count": clients_count,
            "documents_count": documents_count,
            "payslips_count": payslips_count,
            "notes_count": notes_count
        }
    else:
        documents_count = await db.documents.count_documents({"client_id": user["id"]})
        payslips_count = await db.payslips.count_documents({"client_id": user["id"]})
        notes_count = await db.notes.count_documents({"client_id": user["id"], "is_internal": False})
        deadlines_count = await db.deadlines.count_documents({
            "$or": [{"applies_to_all": True}, {"client_ids": user["id"]}]
        })
        return {
            "documents_count": documents_count,
            "payslips_count": payslips_count,
            "notes_count": notes_count,
            "deadlines_count": deadlines_count
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
