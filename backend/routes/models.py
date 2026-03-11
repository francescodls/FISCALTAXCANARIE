"""
Modelli Pydantic condivisi per tutti i router
"""
from typing import List, Optional
from pydantic import BaseModel, EmailStr

# ==================== USER/AUTH MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    iban: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    tipo_cliente: Optional[str] = "autonomo"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    iban: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    tipo_cliente: Optional[str] = "autonomo"
    role: str
    stato: str = "attivo"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ClientSelfUpdate(BaseModel):
    """Campi che il cliente può aggiornare sul proprio profilo"""
    phone: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None

# ==================== CLIENT MODELS ====================

class ClientCreate(BaseModel):
    """Creazione cliente - crea immediatamente la cartella cliente"""
    full_name: str
    email: Optional[EmailStr] = None
    tipo_cliente: Optional[str] = "autonomo"
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    iban: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    note_interne: Optional[str] = None
    send_invite: Optional[bool] = True

class ClientInvite(BaseModel):
    """Invito cliente - crea immediatamente la cartella cliente"""
    email: EmailStr
    full_name: Optional[str] = None
    tipo_cliente: Optional[str] = "autonomo"
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    iban: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    note_interne: Optional[str] = None

class CompleteRegistration(BaseModel):
    token: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    cap: Optional[str] = None
    provincia: Optional[str] = None
    iban: Optional[str] = None
    regime_fiscale: Optional[str] = None
    tipo_attivita: Optional[str] = None
    tipo_cliente: Optional[str] = None
    stato: Optional[str] = None
    note_interne: Optional[str] = None
    additional_emails: Optional[List[str]] = None
    bank_credentials: Optional[List[dict]] = None

class ClientListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3caca4"

class ClientListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    color: str
    client_count: int = 0
    created_at: str

class ClientInListResponse(BaseModel):
    id: str
    email: Optional[str] = None
    email_notifica: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    codice_fiscale: Optional[str] = None
    nie: Optional[str] = None
    nif: Optional[str] = None
    cif: Optional[str] = None
    tipo_cliente: Optional[str] = "autonomo"
    stato: str = "attivo"
    created_at: str
    documents_count: int = 0
    payslips_count: int = 0
    notes_count: int = 0
    lists: List[str] = []

# ==================== DOCUMENT MODELS ====================

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    client_id: str
    folder_category: Optional[str] = "documenti"
    document_year: Optional[int] = None

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
    folder_category: Optional[str] = "documenti"
    document_year: Optional[int] = None

class FolderCategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = "folder"
    color: Optional[str] = "#6b7280"

class FolderCategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    color: str
    is_default: bool
    order: int
    created_at: Optional[str] = None
    created_by: Optional[str] = None

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

# ==================== NOTE MODELS ====================

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

# ==================== DEADLINE MODELS ====================

class DeadlineCreate(BaseModel):
    title: str
    description: str
    due_date: str
    category: str
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    applies_to_all: bool = False
    client_ids: List[str] = []
    list_ids: List[str] = []
    status: str = "da_fare"
    priority: str = "normale"
    modello_tributario_id: Optional[str] = None
    send_reminders: bool = True
    reminder_days: List[int] = [7, 3, 1, 0]

class DeadlineResponse(BaseModel):
    id: str
    title: str
    description: str
    due_date: str
    category: str
    is_recurring: bool
    recurrence_type: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    applies_to_all: bool
    client_ids: List[str]
    list_ids: List[str] = []
    status: str
    priority: str
    modello_tributario_id: Optional[str] = None
    send_reminders: bool = True
    reminder_days: List[int] = [7, 3, 1, 0]
    last_reminder_sent: Optional[str] = None
    next_occurrence: Optional[str] = None
    created_at: Optional[str] = None

# ==================== FEE MODELS ====================

class FeeCreate(BaseModel):
    description: str
    amount: float
    due_date: str
    status: str = "pending"
    notes: Optional[str] = None

class FeeUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    paid_date: Optional[str] = None
    notes: Optional[str] = None

class FeeResponse(BaseModel):
    id: str
    client_id: str
    description: str
    amount: float
    due_date: str
    status: str
    paid_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

# ==================== EMPLOYEE MODELS ====================

class EmployeeHireRequest(BaseModel):
    """Richiesta di assunzione dipendente dal cliente"""
    full_name: str
    start_date: str
    job_title: str
    work_hours: str
    work_location: str
    work_days: str
    weekly_hours: Optional[int] = None
    notes: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    work_hours: Optional[str] = None
    work_location: Optional[str] = None
    work_days: Optional[str] = None
    weekly_hours: Optional[int] = None
    status: Optional[str] = None
    termination_date: Optional[str] = None
    notes: Optional[str] = None

class EmployeeTerminationRequest(BaseModel):
    """Richiesta di licenziamento dipendente"""
    reason: Optional[str] = None
    termination_date: str

# ==================== CONSULENTE MODELS ====================

class ConsulenteCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class ConsulenteInvite(BaseModel):
    """Invito per consulente del lavoro"""
    email: EmailStr
    full_name: str

class ClientAssignment(BaseModel):
    client_ids: List[str]

# ==================== BANK MODELS ====================

class BankCredential(BaseModel):
    bank_entity_id: str
    username: str
    password: str

class BankCredentialUpdate(BaseModel):
    bank_entity_id: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

class BankEntity(BaseModel):
    name: str

# ==================== MODELLO TRIBUTARIO MODELS ====================

class ModelloTributarioCreate(BaseModel):
    codice: str
    nome: str
    descrizione: str
    a_cosa_serve: str
    chi_deve_presentarlo: str
    periodicita: str
    scadenza_tipica: str
    documenti_necessari: List[str] = []
    note_operative: Optional[str] = None
    video_youtube: Optional[str] = None

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
    note_operative: Optional[str] = None
    video_youtube: Optional[str] = None
    video_thumbnail: Optional[str] = None
    created_at: str

# ==================== NOTIFICATION MODELS ====================

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    client_id: str
    employee_id: Optional[str] = None

# Email destinatari per notifiche dipendenti
EMPLOYEE_NOTIFICATION_EMAILS = [
    "amministrazione@fiscaltaxcanarie.com",
    "segreteria@fiscaltaxcanarie.com",
    "bruno@fiscaltaxcanarie.com",
    "francesco@fiscaltaxcanarie.com"
]
