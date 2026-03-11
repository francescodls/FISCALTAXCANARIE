"""
Auth Router - Gestione autenticazione e registrazione
"""
import os
import uuid
import secrets
import logging
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException

from .deps import (
    db, get_db, get_current_user, 
    hash_password, verify_password, create_token, log_activity
)
from .models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    PasswordResetRequest, PasswordResetConfirm, ClientSelfUpdate
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# Import email service
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from email_service import send_welcome_email, send_generic_email


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Registrazione SOLO per clienti"""
    database = get_db()
    existing = await database.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
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
        "role": "cliente",
        "stato": "attivo",
        "note_interne": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await database.users.insert_one(user_doc)
    
    await log_activity("registrazione", f"Nuovo cliente registrato: {user_data.email}", user_id)
    
    try:
        await send_welcome_email(user_data.email, user_data.full_name)
    except Exception as e:
        logger.error(f"Errore invio email benvenuto: {e}")
    
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


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    database = get_db()
    user = await database.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
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


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        codice_fiscale=user.get("codice_fiscale"),
        nie=user.get("nie"),
        nif=user.get("nif"),
        cif=user.get("cif"),
        indirizzo=user.get("indirizzo"),
        citta=user.get("citta"),
        cap=user.get("cap"),
        provincia=user.get("provincia"),
        iban=user.get("iban"),
        regime_fiscale=user.get("regime_fiscale"),
        tipo_attivita=user.get("tipo_attivita"),
        tipo_cliente=user.get("tipo_cliente", "autonomo"),
        role=user["role"],
        stato=user.get("stato", "attivo"),
        created_at=user["created_at"]
    )


@router.put("/me")
async def update_my_profile(update_data: ClientSelfUpdate, user: dict = Depends(get_current_user)):
    """Permette al cliente di modificare la propria anagrafica"""
    database = get_db()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    await database.users.update_one({"id": user["id"]}, {"$set": update_dict})
    await log_activity("aggiornamento_profilo", f"Profilo aggiornato da {user['full_name']}", user["id"])
    
    updated_user = await database.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return {"message": "Profilo aggiornato", "user": updated_user}


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Richiesta di reset password - invia email con link"""
    database = get_db()
    user = await database.users.find_one({"email": request.email.lower()}, {"_id": 0})
    
    if not user:
        return {"message": "Se l'email esiste nel sistema, riceverai un link per reimpostare la password"}
    
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await database.password_resets.delete_many({"user_id": user["id"]})
    await database.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": user["email"],
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.fiscaltaxcanarie.com")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    try:
        email_subject = "Recupero Password - Fiscal Tax Canarie"
        email_content = f"""
        <h2>Richiesta di Recupero Password</h2>
        <p>Ciao {user.get('full_name', '')},</p>
        <p>Hai richiesto di reimpostare la password del tuo account Fiscal Tax Canarie.</p>
        <p>Clicca sul link seguente per creare una nuova password:</p>
        <p><a href="{reset_link}" style="display: inline-block; background-color: #3caca4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reimposta Password</a></p>
        <p>Oppure copia e incolla questo link nel browser:</p>
        <p>{reset_link}</p>
        <hr>
        <p><strong>Importante:</strong> Questo link è valido per 1 ora.</p>
        <p>Se non hai richiesto tu il reset della password, ignora questa email.</p>
        <br>
        <p>Fiscal Tax Canarie</p>
        """
        await send_generic_email(user["email"], email_subject, email_content, user.get("full_name"))
    except Exception as e:
        logger.error(f"Errore invio email reset password: {e}")
    
    return {"message": "Se l'email esiste nel sistema, riceverai un link per reimpostare la password"}


@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Conferma reset password con token"""
    database = get_db()
    reset_record = await database.password_resets.find_one({
        "token": request.token,
        "used": False
    }, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Link non valido o già utilizzato")
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Il link è scaduto. Richiedi un nuovo reset")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La password deve essere di almeno 6 caratteri")
    
    hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt())
    await database.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password": hashed_password.decode('utf-8')}}
    )
    
    await database.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity("reset_password", f"Password reimpostata per {reset_record['email']}", reset_record["user_id"])
    
    return {"message": "Password reimpostata con successo. Ora puoi accedere con la nuova password"}


@router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    """Verifica se un token di reset è valido"""
    database = get_db()
    reset_record = await database.password_resets.find_one({
        "token": token,
        "used": False
    }, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Link non valido o già utilizzato")
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Il link è scaduto")
    
    return {"valid": True, "email": reset_record["email"]}
