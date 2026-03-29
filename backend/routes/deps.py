"""
Dipendenze condivise per tutti i router
"""
import os
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Database connection (inizializzata da server.py)
db = None

def set_db(database):
    """Imposta la connessione al database"""
    global db
    db = database

def get_db():
    """Ottieni la connessione al database"""
    global db
    return db

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
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 giorni
    }
    return jwt.encode(payload, os.environ.get('JWT_SECRET', 'fallback-secret'), algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials, 
            os.environ.get('JWT_SECRET', 'fallback-secret'), 
            algorithms=["HS256"]
        )
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def require_commercialista(user: dict = Depends(get_current_user)):
    # Allow commercialista, admin, and super_admin roles
    if user["role"] not in ["commercialista", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accesso riservato al commercialista")
    return user

async def require_commercialista_or_consulente(user: dict = Depends(get_current_user)):
    if user["role"] not in ["commercialista", "consulente_lavoro"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return user

async def require_consulente_lavoro(user: dict = Depends(get_current_user)):
    if user["role"] != "consulente_lavoro":
        raise HTTPException(status_code=403, detail="Accesso riservato al consulente del lavoro")
    return user

async def get_accessible_clients(user: dict) -> List[str]:
    """Restituisce la lista di client_id accessibili dall'utente"""
    if user["role"] == "commercialista":
        clients = await db.users.find({"role": "cliente"}, {"id": 1, "_id": 0}).to_list(1000)
        return [c["id"] for c in clients]
    elif user["role"] == "consulente_lavoro":
        return user.get("assigned_clients", [])
    elif user["role"] == "cliente":
        return [user["id"]]
    return []

# ==================== ACTIVITY LOG ====================

async def log_activity(action: str, description: str, user_id: str, metadata: dict = None):
    """Log delle attività per audit trail"""
    log_entry = {
        "action": action,
        "description": description,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {}
    }
    await db.activity_logs.insert_one(log_entry)
