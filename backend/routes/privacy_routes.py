"""
Privacy Routes - Gestione consensi e richieste privacy
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/privacy", tags=["privacy"])

# Models
class PrivacyConsentCreate(BaseModel):
    consent_type: str = Field(..., description="Tipo di consenso: privacy_policy, marketing, etc.")
    accepted: bool
    policy_url: Optional[str] = None

class PrivacyConsentResponse(BaseModel):
    id: str
    user_id: str
    consent_type: str
    accepted: bool
    accepted_at: Optional[str] = None
    policy_url: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class PrivacyRequestCreate(BaseModel):
    request_type: str = Field(..., description="access, rectification, erasure, restriction, portability, info, other")
    subject: Optional[str] = None
    message: str

class PrivacyRequestResponse(BaseModel):
    id: str
    user_id: str
    request_type: str
    subject: Optional[str] = None
    message: str
    status: str = "pending"
    created_at: str
    updated_at: Optional[str] = None
    response: Optional[str] = None


def get_privacy_router(db, get_current_user, send_generic_email):
    """Factory function to create the privacy router with dependencies"""
    
    @router.get("/consent", response_model=PrivacyConsentResponse)
    async def get_privacy_consent(current_user: dict = Depends(get_current_user)):
        """Recupera lo stato del consenso privacy dell'utente"""
        consent = await db.privacy_consents.find_one(
            {"user_id": current_user["id"], "consent_type": "privacy_policy"},
            {"_id": 0}
        )
        
        if not consent:
            return PrivacyConsentResponse(
                id="",
                user_id=current_user["id"],
                consent_type="privacy_policy",
                accepted=False
            )
        
        return PrivacyConsentResponse(**consent)
    
    @router.post("/consent", response_model=PrivacyConsentResponse)
    async def save_privacy_consent(
        request: Request,
        consent_data: PrivacyConsentCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Salva o aggiorna il consenso privacy dell'utente"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Recupera IP e User Agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        consent = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "consent_type": consent_data.consent_type,
            "accepted": consent_data.accepted,
            "accepted_at": now if consent_data.accepted else None,
            "policy_url": consent_data.policy_url,
            "ip_address": ip_address,
            "user_agent": user_agent[:500] if user_agent else None,  # Limita lunghezza
            "created_at": now,
            "updated_at": now
        }
        
        # Upsert: aggiorna se esiste, crea se non esiste
        await db.privacy_consents.update_one(
            {"user_id": current_user["id"], "consent_type": consent_data.consent_type},
            {"$set": consent},
            upsert=True
        )
        
        # Log dell'azione
        await db.audit_log.insert_one({
            "action": "privacy_consent_accepted" if consent_data.accepted else "privacy_consent_revoked",
            "user_id": current_user["id"],
            "user_email": current_user.get("email"),
            "consent_type": consent_data.consent_type,
            "ip_address": ip_address,
            "user_agent": user_agent[:200] if user_agent else None,
            "timestamp": now
        })
        
        return PrivacyConsentResponse(**consent)
    
    @router.get("/requests", response_model=List[PrivacyRequestResponse])
    async def get_privacy_requests(current_user: dict = Depends(get_current_user)):
        """Recupera le richieste privacy dell'utente"""
        cursor = db.privacy_requests.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1)
        requests = await cursor.to_list(length=100)
        
        return requests
    
    @router.post("/requests", response_model=PrivacyRequestResponse)
    async def create_privacy_request(
        request: Request,
        request_data: PrivacyRequestCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Crea una nuova richiesta privacy e invia email a info@fiscaltaxcanarie.com"""
        now = datetime.now(timezone.utc).isoformat()
        
        privacy_request = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "user_email": current_user.get("email"),
            "user_name": current_user.get("full_name", current_user.get("email")),
            "request_type": request_data.request_type,
            "subject": request_data.subject,
            "message": request_data.message,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
            "response": None
        }
        
        await db.privacy_requests.insert_one({**privacy_request, "_id": privacy_request["id"]})
        
        # Mappa tipo richiesta
        request_type_labels = {
            "access": "Accesso ai dati",
            "rectification": "Rettifica dati",
            "erasure": "Cancellazione dati",
            "restriction": "Limitazione trattamento",
            "portability": "Portabilità dati",
            "info": "Informazioni sul trattamento",
            "other": "Altra richiesta"
        }
        request_type_label = request_type_labels.get(request_data.request_type, request_data.request_type)
        
        # Invia email a info@fiscaltaxcanarie.com
        email_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Nuova Richiesta Privacy</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                    <h2 style="color: #0d9488; margin-top: 0;">Dettagli Richiesta</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Cliente:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{privacy_request["user_name"]}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{privacy_request["user_email"]}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Tipo Richiesta:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{request_type_label}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Oggetto:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{request_data.subject or "Non specificato"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Data:</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">{datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")}</td>
                        </tr>
                    </table>
                    
                    <h3 style="color: #475569; margin-top: 20px;">Messaggio:</h3>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        {request_data.message}
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <strong>Nota:</strong> Secondo il GDPR, la risposta deve essere fornita entro 30 giorni dalla richiesta.
                    </div>
                </div>
                
                <div style="text-align: center; padding: 15px; color: #64748b; font-size: 12px;">
                    <p>Fiscal Tax Canarie SLP - Sistema Gestionale</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            await send_generic_email(
                to_email="info@fiscaltaxcanarie.com",
                subject=f"[Richiesta Privacy] {request_type_label} - {privacy_request['user_name']}",
                html_body=email_body
            )
        except Exception as e:
            print(f"Errore invio email richiesta privacy: {e}")
            # Non blocchiamo la richiesta se l'email fallisce
        
        # Invia anche notifica al cliente
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "title": "Richiesta Privacy Inviata",
            "message": f"La tua richiesta di '{request_type_label}' è stata inviata con successo. Riceverai una risposta entro 30 giorni.",
            "type": "privacy",
            "read": False,
            "created_at": now
        })
        
        # Log dell'azione
        await db.audit_log.insert_one({
            "action": "privacy_request_created",
            "user_id": current_user["id"],
            "user_email": current_user.get("email"),
            "request_type": request_data.request_type,
            "request_id": privacy_request["id"],
            "timestamp": now
        })
        
        return PrivacyRequestResponse(**privacy_request)
    
    # Admin endpoints
    @router.get("/admin/requests", response_model=List[PrivacyRequestResponse])
    async def get_all_privacy_requests(current_user: dict = Depends(get_current_user)):
        """[ADMIN] Recupera tutte le richieste privacy"""
        if current_user.get("role") not in ["admin", "super_admin", "consulente"]:
            raise HTTPException(status_code=403, detail="Non autorizzato")
        
        cursor = db.privacy_requests.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1)
        requests = await cursor.to_list(length=100)
        
        return requests
    
    @router.put("/admin/requests/{request_id}")
    async def update_privacy_request(
        request_id: str,
        status: str,
        response: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """[ADMIN] Aggiorna lo stato di una richiesta privacy"""
        if current_user.get("role") not in ["admin", "super_admin", "consulente"]:
            raise HTTPException(status_code=403, detail="Non autorizzato")
        
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db.privacy_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": status,
                "response": response,
                "updated_at": now,
                "handled_by": current_user["id"]
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Richiesta non trovata")
        
        # Recupera la richiesta per notificare il cliente
        privacy_request = await db.privacy_requests.find_one({"id": request_id}, {"_id": 0})
        
        if privacy_request and status == "completed":
            # Notifica al cliente
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": privacy_request["user_id"],
                "title": "Richiesta Privacy Completata",
                "message": "La tua richiesta privacy è stata elaborata. Controlla la risposta nella sezione Privacy.",
                "type": "privacy",
                "read": False,
                "created_at": now
            })
        
        return {"message": "Richiesta aggiornata", "status": status}
    
    @router.get("/admin/consents/stats")
    async def get_consent_stats(current_user: dict = Depends(get_current_user)):
        """[ADMIN] Statistiche sui consensi privacy"""
        if current_user.get("role") not in ["admin", "super_admin", "consulente"]:
            raise HTTPException(status_code=403, detail="Non autorizzato")
        
        total_users = await db.users.count_documents({"role": "cliente"})
        consents_accepted = await db.privacy_consents.count_documents({"consent_type": "privacy_policy", "accepted": True})
        
        pending_requests = await db.privacy_requests.count_documents({"status": "pending"})
        processing_requests = await db.privacy_requests.count_documents({"status": "processing"})
        completed_requests = await db.privacy_requests.count_documents({"status": "completed"})
        
        return {
            "total_clients": total_users,
            "consents_accepted": consents_accepted,
            "consent_rate": round((consents_accepted / total_users * 100), 1) if total_users > 0 else 0,
            "requests": {
                "pending": pending_requests,
                "processing": processing_requests,
                "completed": completed_requests,
                "total": pending_requests + processing_requests + completed_requests
            }
        }
    
    return router
