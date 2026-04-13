"""
Routes per la gestione delle Dichiarazioni (sistema modulare)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import io
import base64
import json
import logging

logger = logging.getLogger(__name__)

from .deps import get_db, get_current_user, require_commercialista, log_activity
from .declaration_models import (
    DeclarationTypeCreate, DeclarationTypeResponse,
    TaxReturnCreate, TaxReturnResponse, TaxReturnListItem,
    TaxReturnSectionUpdate, TaxReturnSectionsEnabled,
    TaxReturnPersonalData, TaxReturnFamilyData, TaxReturnEmploymentIncome,
    TaxReturnSelfEmployment, TaxReturnProperties, TaxReturnRentals,
    TaxReturnRentPaid, TaxReturnInvestments, TaxReturnCrypto,
    TaxReturnCapitalGains, TaxReturnDeductions, TaxReturnCanaryDeductions,
    TaxReturnAuthorization, TaxReturnDocument, TaxReturnClientNote,
    TaxReturnAdminNote, TaxReturnIntegrationRequest, TaxReturnStatusLog,
    IntegrationRequestCreate, IntegrationRequestResponse,
    DeclarationMessageCreate, ClientDeclarationSummary,
    DeclarationFeeUpdate, DeclarationFeeNotify, DeclarationFeeResponse
)

router = APIRouter(prefix="/declarations", tags=["declarations"])


# ==================== HELPER NOTIFICHE DICHIARAZIONE ====================

async def send_declaration_notification(
    db,
    client_id: str,
    client_email: str,
    client_name: str,
    anno_fiscale: int,
    notification_type: str,
    title: str,
    message: str,
    sender_name: str = "Fiscal Tax Canarie",
    tax_return_id: str = None,
    extra_data: dict = None
):
    """
    Invia notifica al cliente sia via push che via email.
    
    Args:
        db: Database instance
        client_id: ID del cliente
        client_email: Email del cliente
        client_name: Nome del cliente
        anno_fiscale: Anno fiscale della dichiarazione
        notification_type: Tipo notifica (message, integration_request, status_change, etc.)
        title: Titolo notifica
        message: Contenuto del messaggio
        sender_name: Nome del mittente (admin)
        tax_return_id: ID della pratica (per deep linking)
        extra_data: Dati extra per push notification
    """
    results = {"push": None, "email": None}
    
    # 1. PUSH NOTIFICATION
    try:
        from push_service import get_client_push_tokens, ExpoPushService
        
        tokens = await get_client_push_tokens(db, client_id)
        if tokens:
            push_data = {
                "type": "declaration_" + notification_type,
                "tax_return_id": tax_return_id,
                "anno_fiscale": anno_fiscale,
                "screen": "DeclarationDetail",
                "action": "open_declaration",
                **(extra_data or {})
            }
            
            push_result = await ExpoPushService.send_push_notification(
                push_tokens=tokens,
                title=title,
                body=message[:200] + "..." if len(message) > 200 else message,
                data=push_data,
                channel_id="declarations"
            )
            results["push"] = push_result
            logger.info(f"Push notification sent for declaration {tax_return_id}: {push_result}")
        else:
            logger.info(f"No push tokens for client {client_id}")
            results["push"] = {"success": False, "reason": "no_tokens"}
            
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        results["push"] = {"success": False, "error": str(e)}
    
    # 2. EMAIL NOTIFICATION
    try:
        from email_service import send_generic_email
        
        if client_email:
            email_result = await send_generic_email(
                client_email,
                f"[Fiscal Tax] {title} - Dichiarazione {anno_fiscale}",
                f"""
                <h2>{title}</h2>
                <p>Gentile {client_name or 'Cliente'},</p>
                <p>Hai ricevuto una nuova comunicazione da <strong>{sender_name}</strong> 
                   riguardo la tua dichiarazione dei redditi {anno_fiscale}:</p>
                <blockquote style="border-left: 3px solid #0d9488; padding-left: 15px; color: #555; white-space: pre-wrap;">
                    {message}
                </blockquote>
                <p>Accedi alla piattaforma per visualizzare i dettagli e rispondere.</p>
                <p>Cordiali saluti,<br>Fiscal Tax Canarie</p>
                """
            )
            results["email"] = email_result
            logger.info(f"Email sent for declaration {tax_return_id}: {email_result}")
        else:
            results["email"] = {"success": False, "reason": "no_email"}
            
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        results["email"] = {"success": False, "error": str(e)}
    
    return results


# Testo autorizzazione di default
DEFAULT_AUTHORIZATION_TEXT = """Autorizzo espressamente Fiscal Tax Canarie SLP, con CIF B44653517, con sede in Las Palmas de Gran Canaria, Calle Domingo J. Navarro n. 1, Planta 2, Oficina 5, a predisporre e presentare in mio nome e per mio conto la dichiarazione dei redditi, sulla base dei dati e dei documenti da me forniti. Dichiaro che le informazioni trasmesse sono veritiere e complete per quanto a mia conoscenza e autorizzo il trattamento dei dati esclusivamente per le finalità connesse all'incarico professionale."""


async def get_tax_return_with_access_check(tax_return_id: str, user: dict, allow_deleted: bool = False):
    """
    Helper per recuperare una dichiarazione verificando accesso e stato.
    Solleva HTTPException se non trovata, eliminata (per clienti), o accesso non autorizzato.
    """
    db = get_db()
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica se eliminata
    if tax_return.get("stato") == "eliminata" and not allow_deleted:
        if user["role"] == "cliente":
            raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso cliente
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    return tax_return


# ==================== DECLARATION TYPES ====================

@router.get("/types", response_model=List[DeclarationTypeResponse])
async def get_declaration_types(user: dict = Depends(get_current_user)):
    """Recupera tutti i tipi di dichiarazione disponibili"""
    db = get_db()
    types = await db.declaration_types.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Se non esistono tipi, crea quello di default
    if not types:
        default_type = {
            "id": str(uuid.uuid4()),
            "code": "redditi",
            "name": "Dichiarazione dei Redditi",
            "description": "Dichiarazione annuale dei redditi per persone fisiche",
            "icon": "file-text",
            "color": "#0d9488",
            "is_active": True,
            "order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.declaration_types.insert_one(default_type)
        types = [default_type]
    
    return [DeclarationTypeResponse(**t) for t in types]


@router.post("/types", response_model=DeclarationTypeResponse)
async def create_declaration_type(data: DeclarationTypeCreate, user: dict = Depends(require_commercialista)):
    """Crea un nuovo tipo di dichiarazione (solo admin)"""
    db = get_db()
    
    # Verifica che il codice non esista già
    existing = await db.declaration_types.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Codice tipo dichiarazione già esistente")
    
    type_id = str(uuid.uuid4())
    declaration_type = {
        "id": type_id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.declaration_types.insert_one(declaration_type)
    
    await log_activity("creazione_tipo_dichiarazione", f"Tipo dichiarazione '{data.name}' creato", user["id"])
    
    return DeclarationTypeResponse(**declaration_type)


@router.put("/types/{type_id}", response_model=DeclarationTypeResponse)
async def update_declaration_type(type_id: str, data: DeclarationTypeCreate, user: dict = Depends(require_commercialista)):
    """Aggiorna un tipo di dichiarazione"""
    db = get_db()
    
    result = await db.declaration_types.update_one(
        {"id": type_id},
        {"$set": data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo dichiarazione non trovato")
    
    declaration_type = await db.declaration_types.find_one({"id": type_id}, {"_id": 0})
    return DeclarationTypeResponse(**declaration_type)


@router.delete("/types/{type_id}")
async def delete_declaration_type(type_id: str, user: dict = Depends(require_commercialista)):
    """Disattiva un tipo di dichiarazione"""
    db = get_db()
    
    result = await db.declaration_types.update_one(
        {"id": type_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tipo dichiarazione non trovato")
    
    return {"message": "Tipo dichiarazione disattivato"}


# ==================== TAX RETURNS (PRATICHE REDDITI) ====================

@router.post("/tax-returns", response_model=TaxReturnResponse)
async def create_tax_return(data: TaxReturnCreate, user: dict = Depends(get_current_user)):
    """Crea una nuova pratica dichiarazione redditi"""
    db = get_db()
    
    # Solo i clienti possono creare pratiche per sé stessi
    if user["role"] == "cliente":
        client_id = user["id"]
    else:
        raise HTTPException(status_code=400, detail="Solo i clienti possono creare pratiche")
    
    # Verifica che non esista già una pratica attiva per lo stesso anno
    # (esclude pratiche archiviate o eliminate)
    existing = await db.tax_returns.find_one({
        "client_id": client_id,
        "anno_fiscale": data.anno_fiscale,
        "stato": {"$nin": ["archiviata", "eliminata"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Esiste già una pratica per l'anno {data.anno_fiscale}")
    
    now = datetime.now(timezone.utc).isoformat()
    tax_return_id = str(uuid.uuid4())
    
    tax_return = {
        "id": tax_return_id,
        "client_id": client_id,
        "anno_fiscale": data.anno_fiscale,
        "tipo_dichiarazione": data.tipo_dichiarazione,
        "stato": "bozza",
        "secciones_habilitadas": data.secciones_habilitadas.model_dump() if data.secciones_habilitadas else TaxReturnSectionsEnabled().model_dump(),
        
        # Sezioni dati (inizialmente vuote)
        "datos_personales": None,
        "situacion_familiar": None,
        "rentas_trabajo": None,
        "autonomo": None,
        "inmuebles": None,
        "alquileres_cobrados": None,
        "alquiler_pagado": None,
        "inversiones": None,
        "criptomonedas": None,
        "ganancias_patrimoniales": None,
        "deducciones": None,
        "deducciones_canarias": None,
        
        # Documenti e note
        "documentos": [],
        "notas_cliente": [],
        "notas_admin": [],
        "richieste_integrazione": [],
        
        # Conversazione interna
        "conversazione": [],
        
        # Autorizzazione
        "autorizacion": None,
        
        # Metadata
        "status_logs": [{
            "stato_precedente": None,
            "stato_nuovo": "bozza",
            "changed_by": user["id"],
            "changed_at": now,
            "motivo": "Creazione pratica"
        }],
        "created_at": now,
        "updated_at": now,
        "submitted_at": None,
        "viewed_by_admin": False  # Per tracciare nuove dichiarazioni
    }
    
    await db.tax_returns.insert_one(tax_return)
    
    # Aggiungi info cliente
    tax_return["client_name"] = user.get("full_name")
    tax_return["client_email"] = user.get("email")
    
    return TaxReturnResponse(**tax_return)


@router.get("/tax-returns", response_model=List[TaxReturnListItem])
async def get_tax_returns(
    client_id: Optional[str] = None,
    anno_fiscale: Optional[int] = None,
    stato: Optional[str] = None,
    has_crypto: Optional[bool] = None,
    has_inmuebles: Optional[bool] = None,
    has_autonomo: Optional[bool] = None,
    include_deleted: bool = False,
    user: dict = Depends(get_current_user)
):
    """Recupera lista pratiche (filtrate per ruolo)"""
    db = get_db()
    
    query = {}
    
    # Escludi dichiarazioni eliminate (a meno che non sia richiesto esplicitamente dall'admin)
    if not include_deleted or user["role"] == "cliente":
        query["stato"] = {"$nin": ["eliminata", "archiviata"]}
    
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
    elif client_id:
        query["client_id"] = client_id
    
    if anno_fiscale:
        query["anno_fiscale"] = anno_fiscale
    
    if stato and stato not in ["eliminata", "archiviata"]:
        query["stato"] = stato
    
    tax_returns = await db.tax_returns.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    # Recupera info clienti
    client_ids = list(set(t["client_id"] for t in tax_returns))
    clients = await db.users.find({"id": {"$in": client_ids}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(1000)
    client_map = {c["id"]: c for c in clients}
    
    result = []
    for tr in tax_returns:
        client = client_map.get(tr["client_id"], {})
        
        # Calcola indicatori
        has_rentas = tr.get("rentas_trabajo") and tr["rentas_trabajo"].get("tiene_rentas_trabajo")
        has_auto = tr.get("autonomo") and tr["autonomo"].get("es_autonomo")
        has_inm = tr.get("inmuebles") and tr["inmuebles"].get("tiene_inmuebles")
        has_alq = tr.get("alquileres_cobrados") and tr["alquileres_cobrados"].get("tiene_alquileres")
        has_inv = tr.get("inversiones") and tr["inversiones"].get("tiene_inversiones")
        has_crypt = tr.get("criptomonedas") and tr["criptomonedas"].get("tiene_criptomonedas")
        has_gan = tr.get("ganancias_patrimoniales") and tr["ganancias_patrimoniales"].get("tiene_ganancias_patrimoniales")
        has_ded_can = tr.get("deducciones_canarias") and tr["deducciones_canarias"].get("tiene_deducciones_canarias")
        
        # Filtri aggiuntivi
        if has_crypto is not None and has_crypt != has_crypto:
            continue
        if has_inmuebles is not None and has_inm != has_inmuebles:
            continue
        if has_autonomo is not None and has_auto != has_autonomo:
            continue
        
        richieste_pendenti = len([r for r in tr.get("richieste_integrazione", []) if r.get("stato") == "pendente"])
        
        result.append(TaxReturnListItem(
            id=tr["id"],
            client_id=tr["client_id"],
            client_name=client.get("full_name", "N/A"),
            client_email=client.get("email"),
            anno_fiscale=tr["anno_fiscale"],
            tipo_dichiarazione=tr["tipo_dichiarazione"],
            stato=tr["stato"],
            has_rentas_trabajo=bool(has_rentas),
            has_autonomo=bool(has_auto),
            has_inmuebles=bool(has_inm),
            has_alquileres=bool(has_alq),
            has_inversiones=bool(has_inv),
            has_criptomonedas=bool(has_crypt),
            has_ganancias=bool(has_gan),
            has_deducciones_canarias=bool(has_ded_can),
            documentos_count=len(tr.get("documentos", [])),
            richieste_pendenti=richieste_pendenti,
            has_authorization=tr.get("autorizacion") is not None and tr["autorizacion"].get("signed_at") is not None,
            created_at=tr["created_at"],
            updated_at=tr["updated_at"]
        ))
    
    return result


@router.get("/tax-returns/{tax_return_id}", response_model=TaxReturnResponse)
async def get_tax_return(tax_return_id: str, user: dict = Depends(get_current_user)):
    """Recupera dettaglio pratica"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica se la pratica è stata eliminata
    if tax_return.get("stato") == "eliminata":
        # Solo admin può vedere pratiche eliminate
        if user["role"] == "cliente":
            raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Aggiungi info cliente
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0, "full_name": 1, "email": 1})
    tax_return["client_name"] = client.get("full_name") if client else None
    tax_return["client_email"] = client.get("email") if client else None
    
    # IMPORTANTE: Rimuovi file_data dai documenti per evitare risposte enormi
    # I dati binari vengono recuperati solo tramite l'endpoint di preview/download
    if "documentos" in tax_return and tax_return["documentos"]:
        for doc in tax_return["documentos"]:
            if "file_data" in doc:
                del doc["file_data"]
    
    # Rimuovi file_data dagli allegati dei messaggi nella conversazione
    if "conversazione" in tax_return and tax_return["conversazione"]:
        for msg in tax_return["conversazione"]:
            if msg.get("attachments"):
                for att in msg["attachments"]:
                    if "file_data" in att:
                        del att["file_data"]
    
    return TaxReturnResponse(**tax_return)


@router.put("/tax-returns/{tax_return_id}/sections/{section_name}")
async def update_tax_return_section(
    tax_return_id: str,
    section_name: str,
    data: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Aggiorna una sezione specifica della pratica"""
    db = get_db()
    
    # Verifica che la pratica esista
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso (cliente può modificare solo le proprie, admin tutte)
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Verifica stato (solo bozza o documentazione_incompleta modificabili dal cliente)
    if user["role"] == "cliente" and tax_return["stato"] not in ["bozza", "documentazione_incompleta"]:
        raise HTTPException(status_code=400, detail="La pratica non può essere modificata in questo stato")
    
    # Sezioni valide
    valid_sections = [
        "secciones_habilitadas", "datos_personales", "situacion_familiar",
        "rentas_trabajo", "autonomo", "inmuebles", "alquileres_cobrados",
        "alquiler_pagado", "inversiones", "criptomonedas", "ganancias_patrimoniales",
        "deducciones", "deducciones_canarias", "section_statuses"
    ]
    
    if section_name not in valid_sections:
        raise HTTPException(status_code=400, detail=f"Sezione non valida: {section_name}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$set": {
                section_name: data,
                "updated_at": now
            }
        }
    )
    
    return {"message": f"Sezione {section_name} aggiornata", "updated_at": now}


@router.put("/tax-returns/{tax_return_id}/status")
async def update_tax_return_status(
    tax_return_id: str,
    nuovo_stato: str = Form(...),
    motivo: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """Aggiorna lo stato della pratica"""
    db = get_db()
    
    # Stati validi con codifica colore:
    # VERDE: presentata
    # GIALLO: bozza, inviata, documentazione_incompleta, in_revisione, pronta
    # ROSSO: errata, non_presentare
    # GRIGIO: archiviata
    valid_states = [
        "bozza", "inviata", "documentazione_incompleta", "in_revisione", 
        "pronta", "presentata", "archiviata", "errata", "non_presentare"
    ]
    if nuovo_stato not in valid_states:
        raise HTTPException(status_code=400, detail="Stato non valido")
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica permessi
    if user["role"] == "cliente":
        # Cliente può solo inviare (da bozza a inviata)
        if nuovo_stato != "inviata" or tax_return["stato"] != "bozza":
            raise HTTPException(status_code=403, detail="Operazione non permessa")
        
        # Verifica autorizzazione firmata
        auth = tax_return.get("autorizacion")
        if not auth or not auth.get("signed_at") or not auth.get("consent_accepted"):
            raise HTTPException(status_code=400, detail="È necessario firmare l'autorizzazione prima di inviare")
    
    now = datetime.now(timezone.utc).isoformat()
    stato_precedente = tax_return["stato"]
    
    status_log = {
        "stato_precedente": stato_precedente,
        "stato_nuovo": nuovo_stato,
        "changed_by": user["id"],
        "changed_at": now,
        "motivo": motivo
    }
    
    update_data = {
        "stato": nuovo_stato,
        "updated_at": now
    }
    
    if nuovo_stato == "inviata":
        update_data["submitted_at"] = now
        update_data["viewed_by_admin"] = False  # Reset per notifica admin
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$set": update_data,
            "$push": {"status_logs": status_log}
        }
    )
    
    # Invia notifica email se pratica inviata
    if nuovo_stato == "inviata":
        try:
            from email_service import send_generic_email
            client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
            admin_email = "info@fiscaltaxcanarie.com"
            
            await send_generic_email(
                admin_email,
                f"[Fiscal Tax] Nuova dichiarazione redditi inviata - {client.get('full_name', 'Cliente')}",
                f"""
                <h2>Nuova Dichiarazione dei Redditi Inviata</h2>
                <p><strong>Cliente:</strong> {client.get('full_name', 'N/A')}</p>
                <p><strong>Email:</strong> {client.get('email', 'N/A')}</p>
                <p><strong>Anno Fiscale:</strong> {tax_return['anno_fiscale']}</p>
                <p><strong>Tipo:</strong> {tax_return['tipo_dichiarazione']}</p>
                <p><strong>Data invio:</strong> {now[:19].replace('T', ' ')}</p>
                <p>Accedi alla piattaforma per visualizzare la pratica.</p>
                """
            )
        except Exception as e:
            pass  # Log ma non bloccare
    
    await log_activity("cambio_stato_dichiarazione", f"Pratica {tax_return_id} cambiata da {stato_precedente} a {nuovo_stato}", user["id"])
    
    return {"message": "Stato aggiornato", "nuovo_stato": nuovo_stato}


@router.put("/tax-returns/{tax_return_id}/assign")
async def assign_tax_return(
    tax_return_id: str,
    user: dict = Depends(require_commercialista)
):
    """Prende in carico una pratica - assegna l'admin corrente come responsabile"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Nome admin per visualizzazione
    admin_display_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('full_name', 'Admin')
    
    assignment_data = {
        "assigned_to_id": user["id"],
        "assigned_to_name": admin_display_name,
        "assigned_to_first_name": user.get("first_name", ""),
        "assigned_to_last_name": user.get("last_name", ""),
        "assigned_to_profile_image": user.get("profile_image"),
        "assigned_at": now
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": {
            **assignment_data,
            "updated_at": now
        }}
    )
    
    # Notifica al cliente che la pratica è stata presa in carico
    try:
        from email_service import send_generic_email
        client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
        if client and client.get("email"):
            await send_generic_email(
                client["email"],
                f"[Fiscal Tax] La tua pratica è stata presa in carico - Dichiarazione {tax_return['anno_fiscale']}",
                f"""
                <h2>Pratica Presa in Carico</h2>
                <p>Gentile {client.get('full_name', 'Cliente')},</p>
                <p>La tua dichiarazione dei redditi {tax_return['anno_fiscale']} è stata presa in carico da <strong>{admin_display_name}</strong>.</p>
                <p>Sarà il tuo riferimento per questa pratica. Puoi contattarlo direttamente tramite la chat nella piattaforma.</p>
                <p>Cordiali saluti,<br>Fiscal Tax Canarie</p>
                """
            )
    except Exception as e:
        pass
    
    await log_activity("assegnazione_pratica", f"Pratica {tax_return_id} assegnata a {admin_display_name}", user["id"])
    
    return {
        "message": f"Pratica assegnata a {admin_display_name}",
        "assigned_to": assignment_data
    }


@router.delete("/tax-returns/{tax_return_id}")
async def delete_tax_return(
    tax_return_id: str, 
    soft_delete: bool = True,
    user: dict = Depends(get_current_user)
):
    """
    Elimina una pratica.
    - Cliente: può eliminare solo le proprie pratiche in bozza
    - Admin: può eliminare qualsiasi pratica (soft delete di default)
    
    soft_delete=True: imposta stato "eliminata" (recuperabile)
    soft_delete=False: eliminazione definitiva
    """
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica permessi
    if user["role"] == "cliente":
        if tax_return["client_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        if tax_return["stato"] != "bozza":
            raise HTTPException(status_code=400, detail="Solo le pratiche in bozza possono essere eliminate")
    
    # Admin può eliminare qualsiasi pratica
    if user["role"] in ["commercialista", "admin", "super_admin"]:
        if soft_delete:
            # Soft delete - imposta stato "eliminata"
            now = datetime.now(timezone.utc).isoformat()
            await db.tax_returns.update_one(
                {"id": tax_return_id},
                {
                    "$set": {
                        "stato": "eliminata",
                        "deleted_at": now,
                        "deleted_by": user["id"],
                        "updated_at": now
                    },
                    "$push": {
                        "status_logs": {
                            "stato_precedente": tax_return["stato"],
                            "stato_nuovo": "eliminata",
                            "changed_by": user["id"],
                            "changed_at": now,
                            "motivo": "Eliminata dall'amministratore"
                        }
                    }
                }
            )
            return {"message": "Pratica eliminata (soft delete)", "recoverable": True}
        else:
            # Hard delete
            await db.tax_returns.delete_one({"id": tax_return_id})
            return {"message": "Pratica eliminata definitivamente", "recoverable": False}
    
    # Cliente - hard delete (solo bozze)
    await db.tax_returns.delete_one({"id": tax_return_id})
    return {"message": "Pratica eliminata"}


# ==================== AUTORIZZAZIONE E FIRMA ====================

@router.get("/tax-returns/{tax_return_id}/authorization-text")
async def get_authorization_text(tax_return_id: str, user: dict = Depends(get_current_user)):
    """Recupera il testo dell'autorizzazione"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Recupera testo personalizzato o usa default
    auth_text = await db.settings.find_one({"key": "authorization_text"})
    text = auth_text.get("value") if auth_text else DEFAULT_AUTHORIZATION_TEXT
    
    return {"text": text}


@router.post("/tax-returns/{tax_return_id}/sign")
async def sign_tax_return(
    tax_return_id: str,
    request: Request,
    consent_accepted: bool = Form(...),
    signature_data: str = Form(...),  # Base64 immagine firma
    user: dict = Depends(get_current_user)
):
    """Firma l'autorizzazione della pratica"""
    db = get_db()
    
    if user["role"] != "cliente":
        raise HTTPException(status_code=403, detail="Solo i clienti possono firmare")
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    if not consent_accepted:
        raise HTTPException(status_code=400, detail="È necessario accettare il consenso")
    
    if not signature_data:
        raise HTTPException(status_code=400, detail="È necessario apporre la firma")
    
    # Recupera testo autorizzazione
    auth_text_doc = await db.settings.find_one({"key": "authorization_text"})
    auth_text = auth_text_doc.get("value") if auth_text_doc else DEFAULT_AUTHORIZATION_TEXT
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Info client
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    authorization = {
        "consent_accepted": True,
        "authorization_text": auth_text,
        "signed_at": now,
        "signature_data": signature_data,
        "pdf_path": None,  # Sarà generato quando serve
        "ip_address": ip_address,
        "user_agent": user_agent
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$set": {
                "autorizacion": authorization,
                "updated_at": now
            }
        }
    )
    
    await log_activity("firma_autorizzazione", f"Autorizzazione firmata per pratica {tax_return_id}", user["id"])
    
    return {"message": "Autorizzazione firmata con successo", "signed_at": now}


@router.get("/tax-returns/{tax_return_id}/authorization-pdf")
async def download_authorization_pdf(tax_return_id: str, user: dict = Depends(require_commercialista)):
    """Genera e scarica il PDF dell'autorizzazione firmata"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    auth = tax_return.get("autorizacion")
    if not auth or not auth.get("signed_at"):
        raise HTTPException(status_code=400, detail="Autorizzazione non ancora firmata")
    
    # Recupera dati cliente
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
    datos = tax_return.get("datos_personales", {})
    
    # Crea PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2.5*cm, rightMargin=2.5*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#0d9488'), spaceAfter=20, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#64748b'), alignment=TA_CENTER, spaceAfter=30)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#1e293b'), spaceAfter=12, alignment=TA_JUSTIFY)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#1e293b'), spaceAfter=8)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)
    
    elements = []
    
    # Header
    elements.append(Paragraph("FISCAL TAX CANARIE SLP", title_style))
    elements.append(Paragraph("Autorizzazione alla Presentazione della Dichiarazione dei Redditi", subtitle_style))
    
    # Dati Fiscal Tax
    elements.append(Paragraph("<b>Dati del Mandatario:</b>", bold_style))
    elements.append(Paragraph("Fiscal Tax Canarie SLP", normal_style))
    elements.append(Paragraph("CIF: B44653517", normal_style))
    elements.append(Paragraph("Sede: Calle Domingo J. Navarro n. 1, Planta 2, Oficina 5", normal_style))
    elements.append(Paragraph("Las Palmas de Gran Canaria, España", normal_style))
    elements.append(Spacer(1, 20))
    
    # Dati Cliente
    elements.append(Paragraph("<b>Dati del Mandante:</b>", bold_style))
    nombre = datos.get("nombre", "") if datos else ""
    apellidos = datos.get("apellidos", "") if datos else ""
    full_name = f"{nombre} {apellidos}".strip() or client.get("full_name", "N/A") if client else "N/A"
    elements.append(Paragraph(f"Nome e Cognome: {full_name}", normal_style))
    elements.append(Paragraph(f"DNI/NIE: {datos.get('dni_nie', 'N/A') if datos else 'N/A'}", normal_style))
    elements.append(Paragraph(f"Data di Nascita: {datos.get('fecha_nacimiento', 'N/A') if datos else 'N/A'}", normal_style))
    direccion = datos.get("direccion", "") if datos else ""
    municipio = datos.get("municipio", "") if datos else ""
    provincia = datos.get("provincia", "") if datos else ""
    elements.append(Paragraph(f"Indirizzo: {direccion}, {municipio}, {provincia}", normal_style))
    elements.append(Paragraph(f"Email: {client.get('email', 'N/A') if client else 'N/A'}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Anno fiscale
    elements.append(Paragraph(f"<b>Anno Fiscale:</b> {tax_return['anno_fiscale']}", bold_style))
    elements.append(Paragraph(f"<b>Tipo Dichiarazione:</b> {'Individuale' if tax_return['tipo_dichiarazione'] == 'individual' else 'Congiunta'}", bold_style))
    elements.append(Spacer(1, 20))
    
    # Testo autorizzazione
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("<b>AUTORIZZAZIONE</b>", ParagraphStyle('AuthTitle', parent=styles['Heading2'], fontSize=12, alignment=TA_CENTER, spaceAfter=15)))
    elements.append(Paragraph(auth.get("authorization_text", DEFAULT_AUTHORIZATION_TEXT), normal_style))
    elements.append(Spacer(1, 20))
    
    # Consenso
    elements.append(Paragraph("☑ Acconsento e autorizzo quanto sopra indicato.", bold_style))
    elements.append(Spacer(1, 15))
    
    # Data firma
    signed_at = auth.get("signed_at", "")
    if signed_at:
        signed_date = signed_at[:10]
        signed_time = signed_at[11:19] if len(signed_at) > 11 else ""
        elements.append(Paragraph(f"<b>Data e Ora di Sottoscrizione:</b> {signed_date} {signed_time} UTC", normal_style))
    
    # Firma immagine
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("<b>Firma del Mandante:</b>", bold_style))
    
    signature_data = auth.get("signature_data", "")
    if signature_data and signature_data.startswith("data:image"):
        try:
            # Estrai base64
            base64_data = signature_data.split(",")[1]
            img_data = base64.b64decode(base64_data)
            img_buffer = io.BytesIO(img_data)
            
            # Crea immagine per reportlab
            from reportlab.lib.utils import ImageReader
            img = Image(img_buffer, width=8*cm, height=3*cm)
            elements.append(img)
        except Exception as e:
            elements.append(Paragraph("[Firma digitale allegata]", normal_style))
    else:
        elements.append(Paragraph("[Firma digitale allegata]", normal_style))
    
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    elements.append(Spacer(1, 10))
    
    # Footer
    elements.append(Paragraph(f"Documento generato il {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M:%S')} UTC", footer_style))
    elements.append(Paragraph("Fiscal Tax Canarie SLP - Gestionale Studio Professionale", footer_style))
    if auth.get("ip_address"):
        elements.append(Paragraph(f"IP: {auth.get('ip_address')}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"autorizzazione_redditi_{tax_return['anno_fiscale']}_{tax_return_id[:8]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/tax-returns/{tax_return_id}/summary-pdf")
async def download_summary_pdf(tax_return_id: str, user: dict = Depends(require_commercialista)):
    """Genera e scarica il PDF riepilogativo della dichiarazione con tutti i dati compilati"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Recupera dati cliente
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
    
    # Crea PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#0d9488'), spaceAfter=20, alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#0d9488'), spaceBefore=20, spaceAfter=10)
    subsection_style = ParagraphStyle('Subsection', parent=styles['Heading3'], fontSize=12, textColor=colors.HexColor('#334155'), spaceBefore=15, spaceAfter=8)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#1e293b'), spaceAfter=6)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#64748b'), spaceAfter=2)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#1e293b'), spaceAfter=8)
    
    elements = []
    
    # ===== INTESTAZIONE =====
    elements.append(Paragraph("RIEPILOGO DICHIARAZIONE DEI REDDITI", title_style))
    elements.append(Paragraph(f"Anno Fiscale: {tax_return.get('anno_fiscale', 'N/D')}", ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=12, alignment=TA_CENTER, spaceAfter=5)))
    elements.append(Paragraph(f"Stato: {tax_return.get('stato', 'N/D').upper()}", ParagraphStyle('Status', parent=styles['Normal'], fontSize=11, alignment=TA_CENTER, spaceAfter=20)))
    elements.append(Spacer(1, 10))
    
    # ===== DATI PERSONALI =====
    elements.append(Paragraph("1. DATI PERSONALI", section_style))
    datos = tax_return.get('datos_personales') or {}
    if datos:
        data_table = [
            ["Nome Completo:", f"{datos.get('nombre', '')} {datos.get('apellidos', '')}".strip() or "Non compilato"],
            ["Codice Fiscale (NIE/NIF):", datos.get('nie_nif', 'Non compilato')],
            ["Data di Nascita:", datos.get('fecha_nacimiento', 'Non compilato')],
            ["Nazionalità:", datos.get('nacionalidad', 'Non compilato')],
            ["Indirizzo:", f"{datos.get('direccion', '')} {datos.get('numero', '')}".strip() or "Non compilato"],
            ["Città:", f"{datos.get('municipio', '')} ({datos.get('provincia', '')})".strip(' ()') or "Non compilato"],
            ["CAP:", datos.get('codigo_postal', 'Non compilato')],
            ["Telefono:", datos.get('telefono', 'Non compilato')],
            ["Email:", datos.get('email', 'Non compilato')],
            ["Stato Civile:", datos.get('estado_civil', 'Non compilato')],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Sezione non compilata", normal_style))
    
    # ===== SITUAZIONE FAMILIARE =====
    elements.append(Paragraph("2. SITUAZIONE FAMILIARE", section_style))
    familia = tax_return.get('situacion_familiar') or {}
    if familia:
        data_table = [
            ["Stato Civile:", familia.get('estado_civil', 'Non compilato')],
            ["Data Matrimonio:", familia.get('fecha_matrimonio', 'Non compilato')],
            ["Regime Patrimoniale:", familia.get('regimen_matrimonial', 'Non compilato')],
            ["Coniuge - Nome:", familia.get('conyuge_nombre', 'Non compilato')],
            ["Coniuge - NIE/NIF:", familia.get('conyuge_nie_nif', 'Non compilato')],
            ["Coniuge - Reddito Annuo:", f"€ {familia.get('conyuge_ingresos', 'N/D')}"],
            ["Numero Figli:", str(familia.get('numero_hijos', 0))],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        
        # Figli
        hijos = familia.get('hijos', [])
        if hijos:
            elements.append(Paragraph("Figli a carico:", subsection_style))
            for i, hijo in enumerate(hijos, 1):
                elements.append(Paragraph(f"  {i}. {hijo.get('nombre', 'N/D')} - Nato: {hijo.get('fecha_nacimiento', 'N/D')} - CF: {hijo.get('nie_nif', 'N/D')}", normal_style))
    else:
        elements.append(Paragraph("Sezione non compilata", normal_style))
    
    # ===== REDDITI DA LAVORO =====
    elements.append(Paragraph("3. REDDITI DA LAVORO DIPENDENTE", section_style))
    rentas = tax_return.get('rentas_trabajo') or {}
    if rentas and rentas.get('tiene_rentas_trabajo'):
        data_table = [
            ["Ha redditi da lavoro:", "Sì"],
            ["Reddito Lordo Annuo:", f"€ {rentas.get('ingresos_brutos', 'N/D')}"],
            ["Ritenute:", f"€ {rentas.get('retenciones', 'N/D')}"],
            ["Contributi Previdenza:", f"€ {rentas.get('cotizaciones_ss', 'N/D')}"],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        
        # Datori di lavoro
        empleadores = rentas.get('empleadores', [])
        if empleadores:
            elements.append(Paragraph("Datori di lavoro:", subsection_style))
            for i, emp in enumerate(empleadores, 1):
                elements.append(Paragraph(f"  {i}. {emp.get('nombre', 'N/D')} - CIF: {emp.get('cif', 'N/D')} - Lordo: € {emp.get('ingresos_brutos', 'N/D')}", normal_style))
    else:
        elements.append(Paragraph("Nessun reddito da lavoro dipendente dichiarato", normal_style))
    
    # ===== ATTIVITÀ AUTONOMA =====
    elements.append(Paragraph("4. ATTIVITÀ ECONOMICA / AUTONOMO", section_style))
    autonomo = tax_return.get('autonomo') or {}
    if autonomo and autonomo.get('tiene_actividad'):
        data_table = [
            ["Ha attività economica:", "Sì"],
            ["Tipo Attività:", autonomo.get('tipo_actividad', 'N/D')],
            ["Codice IAE:", autonomo.get('epigrafe_iae', 'N/D')],
            ["Regime Fiscale:", autonomo.get('regimen_fiscal', 'N/D')],
            ["Fatturato Annuo:", f"€ {autonomo.get('ingresos', 'N/D')}"],
            ["Spese Deducibili:", f"€ {autonomo.get('gastos', 'N/D')}"],
            ["Utile Netto:", f"€ {autonomo.get('beneficio_neto', 'N/D')}"],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Nessuna attività economica dichiarata", normal_style))
    
    elements.append(PageBreak())
    
    # ===== IMMOBILI =====
    elements.append(Paragraph("5. IMMOBILI DI PROPRIETÀ", section_style))
    inmuebles = tax_return.get('inmuebles') or {}
    propiedades = inmuebles.get('propiedades', []) if isinstance(inmuebles, dict) else []
    if propiedades:
        elements.append(Paragraph(f"Numero immobili dichiarati: {len(propiedades)}", normal_style))
        for i, prop in enumerate(propiedades, 1):
            elements.append(Paragraph(f"Immobile {i}:", subsection_style))
            data_table = [
                ["Tipo:", prop.get('tipo', 'N/D')],
                ["Uso:", prop.get('uso', 'N/D')],
                ["Indirizzo:", prop.get('direccion', 'N/D')],
                ["Riferimento Catastale:", prop.get('referencia_catastral', 'N/D')],
                ["Valore Catastale:", f"€ {prop.get('valor_catastral', 'N/D')}"],
                ["% Proprietà:", f"{prop.get('porcentaje_propiedad', 100)}%"],
                ["Data Acquisto:", prop.get('fecha_adquisicion', 'N/D')],
            ]
            t = Table(data_table, colWidths=[5*cm, 10*cm])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(t)
    else:
        elements.append(Paragraph("Nessun immobile dichiarato", normal_style))
    
    # ===== CANONI LOCAZIONE RICEVUTI =====
    elements.append(Paragraph("6. CANONI DI LOCAZIONE RICEVUTI", section_style))
    alquileres = tax_return.get('alquileres_cobrados') or {}
    contratos = alquileres.get('contratos', []) if isinstance(alquileres, dict) else []
    if contratos:
        elements.append(Paragraph(f"Numero contratti: {len(contratos)}", normal_style))
        for i, c in enumerate(contratos, 1):
            elements.append(Paragraph(f"  {i}. Immobile: {c.get('inmueble_direccion', 'N/D')} - Canone: € {c.get('renta_mensual', 'N/D')}/mese - Inquilino: {c.get('inquilino_nombre', 'N/D')}", normal_style))
    else:
        elements.append(Paragraph("Nessun canone di locazione dichiarato", normal_style))
    
    # ===== AFFITTO PAGATO =====
    elements.append(Paragraph("7. AFFITTO PAGATO (ABITAZIONE PRINCIPALE)", section_style))
    alquiler_pagado = tax_return.get('alquiler_pagado') or {}
    if alquiler_pagado and alquiler_pagado.get('paga_alquiler'):
        data_table = [
            ["Paga affitto:", "Sì"],
            ["Canone Mensile:", f"€ {alquiler_pagado.get('importe_mensual', 'N/D')}"],
            ["Totale Annuo:", f"€ {alquiler_pagado.get('total_anual', 'N/D')}"],
            ["Proprietario:", alquiler_pagado.get('arrendador_nombre', 'N/D')],
            ["NIF Proprietario:", alquiler_pagado.get('arrendador_nif', 'N/D')],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Non paga affitto per abitazione principale", normal_style))
    
    # ===== INVESTIMENTI =====
    elements.append(Paragraph("8. INVESTIMENTI E RENDITE FINANZIARIE", section_style))
    inversiones = tax_return.get('inversiones') or {}
    if inversiones and inversiones.get('tiene_inversiones'):
        data_table = [
            ["Ha investimenti:", "Sì"],
            ["Dividendi ricevuti:", f"€ {inversiones.get('dividendos', 'N/D')}"],
            ["Interessi:", f"€ {inversiones.get('intereses', 'N/D')}"],
            ["Plusvalenze:", f"€ {inversiones.get('ganancias', 'N/D')}"],
            ["Minusvalenze:", f"€ {inversiones.get('perdidas', 'N/D')}"],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Nessun investimento dichiarato", normal_style))
    
    # ===== CRIPTOVALUTE =====
    elements.append(Paragraph("9. CRIPTOVALUTE", section_style))
    cripto = tax_return.get('criptomonedas') or {}
    if cripto and cripto.get('tiene_cripto'):
        data_table = [
            ["Possiede criptovalute:", "Sì"],
            ["Valore totale al 31/12:", f"€ {cripto.get('valor_total', 'N/D')}"],
            ["Plusvalenze realizzate:", f"€ {cripto.get('ganancias', 'N/D')}"],
            ["Minusvalenze realizzate:", f"€ {cripto.get('perdidas', 'N/D')}"],
        ]
        t = Table(data_table, colWidths=[5*cm, 10*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        
        # Dettaglio criptovalute
        criptos = cripto.get('criptomonedas', [])
        if criptos:
            elements.append(Paragraph("Dettaglio criptovalute:", subsection_style))
            for i, c in enumerate(criptos, 1):
                elements.append(Paragraph(f"  {i}. {c.get('nombre', 'N/D')} ({c.get('simbolo', '')}) - Quantità: {c.get('cantidad', 'N/D')} - Valore: € {c.get('valor', 'N/D')}", normal_style))
    else:
        elements.append(Paragraph("Nessuna criptovaluta dichiarata", normal_style))
    
    # ===== DEDUZIONI =====
    elements.append(Paragraph("10. DEDUZIONI E SPESE DEDUCIBILI", section_style))
    deducciones = tax_return.get('deducciones') or {}
    if deducciones:
        items = []
        if deducciones.get('vivienda_habitual'): items.append(f"Mutuo abitazione principale: € {deducciones.get('vivienda_habitual')}")
        if deducciones.get('plan_pensiones'): items.append(f"Fondo pensione: € {deducciones.get('plan_pensiones')}")
        if deducciones.get('donativos'): items.append(f"Donazioni: € {deducciones.get('donativos')}")
        if deducciones.get('maternidad'): items.append(f"Deduzione maternità: € {deducciones.get('maternidad')}")
        if deducciones.get('familia_numerosa'): items.append(f"Famiglia numerosa: € {deducciones.get('familia_numerosa')}")
        if deducciones.get('discapacidad'): items.append(f"Disabilità: € {deducciones.get('discapacidad')}")
        if deducciones.get('alquiler_vivienda'): items.append(f"Affitto abitazione: € {deducciones.get('alquiler_vivienda')}")
        
        if items:
            for item in items:
                elements.append(Paragraph(f"• {item}", normal_style))
        else:
            elements.append(Paragraph("Nessuna deduzione applicabile", normal_style))
    else:
        elements.append(Paragraph("Sezione non compilata", normal_style))
    
    # ===== DEDUZIONI CANARIE =====
    elements.append(Paragraph("11. DEDUZIONI SPECIFICHE CANARIE", section_style))
    ded_canarias = tax_return.get('deducciones_canarias') or {}
    if ded_canarias:
        items = []
        if ded_canarias.get('nacimiento_adopcion'): items.append(f"Nascita/Adozione: € {ded_canarias.get('nacimiento_adopcion')}")
        if ded_canarias.get('gastos_guarderia'): items.append(f"Spese asilo: € {ded_canarias.get('gastos_guarderia')}")
        if ded_canarias.get('material_escolar'): items.append(f"Materiale scolastico: € {ded_canarias.get('material_escolar')}")
        if ded_canarias.get('estudios_superiores'): items.append(f"Studi superiori: € {ded_canarias.get('estudios_superiores')}")
        if ded_canarias.get('alquiler_vivienda_canarias'): items.append(f"Affitto Canarie: € {ded_canarias.get('alquiler_vivienda_canarias')}")
        if ded_canarias.get('inversion_vivienda'): items.append(f"Investimento abitazione: € {ded_canarias.get('inversion_vivienda')}")
        if ded_canarias.get('donaciones_culturales'): items.append(f"Donazioni culturali: € {ded_canarias.get('donaciones_culturales')}")
        
        if items:
            for item in items:
                elements.append(Paragraph(f"• {item}", normal_style))
        else:
            elements.append(Paragraph("Nessuna deduzione canaria applicabile", normal_style))
    else:
        elements.append(Paragraph("Sezione non compilata", normal_style))
    
    # ===== NOTE DEL CLIENTE =====
    elements.append(Paragraph("12. NOTE DEL CLIENTE", section_style))
    notas = tax_return.get('notas_cliente', [])
    if notas:
        for nota in notas:
            elements.append(Paragraph(f"• [{nota.get('created_at', '')[:10]}] {nota.get('contenuto', nota.get('testo', 'N/D'))}", normal_style))
    else:
        elements.append(Paragraph("Nessuna nota inserita dal cliente", normal_style))
    
    # ===== DOCUMENTI ALLEGATI =====
    elements.append(Paragraph("13. DOCUMENTI ALLEGATI", section_style))
    docs = tax_return.get('documentos', [])
    if docs:
        elements.append(Paragraph(f"Numero documenti allegati: {len(docs)}", normal_style))
        for i, d in enumerate(docs, 1):
            elements.append(Paragraph(f"  {i}. {d.get('nombre', d.get('file_name', 'N/D'))} - Categoria: {d.get('categoria', 'N/D')} - Caricato: {d.get('uploaded_at', '')[:10]}", normal_style))
    else:
        elements.append(Paragraph("Nessun documento allegato", normal_style))
    
    # ===== FOOTER =====
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(f"Documento generato il {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M')} UTC", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))
    elements.append(Paragraph("Fiscal Tax Canarie SLP - CIF B44653517", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(elements)
    
    buffer.seek(0)
    filename = f"riepilogo_dichiarazione_{tax_return['anno_fiscale']}_{tax_return_id[:8]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/tax-returns/{tax_return_id}/download-all")
async def download_all_documents_zip(tax_return_id: str, user: dict = Depends(require_commercialista)):
    """Scarica tutti i documenti allegati alla pratica in un file ZIP"""
    import zipfile
    
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    docs = tax_return.get('documentos', [])
    if not docs:
        raise HTTPException(status_code=404, detail="Nessun documento allegato alla pratica")
    
    # Crea ZIP in memoria
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            file_data = doc.get('file_data')
            if file_data:
                # Decodifica base64 se necessario
                if isinstance(file_data, str):
                    import base64
                    try:
                        file_bytes = base64.b64decode(file_data)
                    except:
                        continue
                else:
                    file_bytes = file_data
                
                # Nome file con categoria come prefisso
                categoria = doc.get('categoria', 'altro').replace(' ', '_')
                file_name = doc.get('nombre', doc.get('file_name', f'documento_{doc.get("id", "unknown")}'))
                safe_name = f"{categoria}/{file_name}"
                
                zf.writestr(safe_name, file_bytes)
    
    buffer.seek(0)
    
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0, "full_name": 1})
    client_name = (client.get("full_name", "cliente") if client else "cliente").replace(" ", "_")
    filename = f"documenti_{client_name}_{tax_return['anno_fiscale']}.zip"
    
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== DOCUMENTI ====================

@router.post("/tax-returns/{tax_return_id}/documents")
async def upload_document(
    tax_return_id: str,
    file: UploadFile = File(...),
    categoria: str = Form(...),
    seccion: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """Carica un documento alla pratica"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Leggi file
    content = await file.read()
    
    # Salva su cloud storage se disponibile
    try:
        from storage_service import upload_file as cloud_upload, is_storage_enabled
        if is_storage_enabled():
            file_path = f"declarations/{tax_return_id}/{file.filename}"
            cloud_upload(file_path, content)
        else:
            file_path = None
    except:
        file_path = None
    
    now = datetime.now(timezone.utc).isoformat()
    doc_id = str(uuid.uuid4())
    
    document = {
        "id": doc_id,
        "categoria": categoria,
        "nombre": file.filename,
        "file_name": file.filename,
        "file_path": file_path,
        "seccion": seccion,
        "uploaded_at": now
    }
    
    # Se non c'è cloud storage, salva in base64 nel DB (non ideale ma funziona)
    if not file_path:
        document["file_data"] = base64.b64encode(content).decode()
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$push": {"documentos": document},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Documento caricato", "document_id": doc_id}


@router.delete("/tax-returns/{tax_return_id}/documents/{doc_id}")
async def delete_document(tax_return_id: str, doc_id: str, user: dict = Depends(get_current_user)):
    """Elimina un documento"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$pull": {"documentos": {"id": doc_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Documento eliminato"}


@router.get("/tax-returns/{tax_return_id}/documents/{doc_id}/download")
async def download_declaration_document(
    tax_return_id: str, 
    doc_id: str, 
    user: dict = Depends(get_current_user)
):
    """Scarica un documento allegato alla dichiarazione"""
    from fastapi.responses import Response
    import mimetypes
    
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Admin può scaricare, cliente solo se è sua
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Trova il documento
    document = None
    for doc in tax_return.get("documentos", []):
        if doc.get("id") == doc_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    file_name = document.get("nombre") or document.get("file_name", "documento")
    
    # Recupera il contenuto
    if document.get("file_data"):
        # Documento salvato in base64 nel DB
        content = base64.b64decode(document["file_data"])
    elif document.get("file_path"):
        # Documento salvato in cloud - TODO: implementare download da cloud
        raise HTTPException(status_code=501, detail="Download da cloud non implementato")
    else:
        raise HTTPException(status_code=404, detail="Contenuto documento non disponibile")
    
    # Determina il content type
    mime_type, _ = mimetypes.guess_type(file_name)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    return Response(
        content=content,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"'
        }
    )


@router.get("/tax-returns/{tax_return_id}/documents/{doc_id}/preview")
async def preview_declaration_document(
    tax_return_id: str, 
    doc_id: str, 
    user: dict = Depends(get_current_user)
):
    """Ottiene l'URL di preview o il contenuto base64 di un documento"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Admin può visualizzare, cliente solo se è sua
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Trova il documento
    document = None
    for doc in tax_return.get("documentos", []):
        if doc.get("id") == doc_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    file_name = document.get("nombre") or document.get("file_name", "documento")
    
    # Determina il tipo di file per il preview
    import mimetypes
    mime_type, _ = mimetypes.guess_type(file_name)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # Verifica se è un tipo previewable
    previewable_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    is_previewable = mime_type in previewable_types
    
    if document.get("file_data"):
        # Documento salvato in base64 nel DB
        return {
            "file_name": file_name,
            "mime_type": mime_type,
            "is_previewable": is_previewable,
            "data_url": f"data:{mime_type};base64,{document['file_data']}"
        }
    elif document.get("file_path"):
        # Documento salvato in cloud - TODO: generare URL firmato
        return {
            "file_name": file_name,
            "mime_type": mime_type,
            "is_previewable": is_previewable,
            "cloud_path": document["file_path"],
            "message": "Preview da cloud non implementato"
        }
    else:
        raise HTTPException(status_code=404, detail="Contenuto documento non disponibile")


@router.post("/tax-returns/{tax_return_id}/documents/download-zip")
async def download_documents_as_zip(
    tax_return_id: str,
    request_data: dict,
    user: dict = Depends(get_current_user)
):
    """Scarica più documenti in un file ZIP"""
    from fastapi.responses import Response
    import zipfile
    import io
    
    db = get_db()
    
    document_ids = request_data.get("document_ids", [])
    if not document_ids:
        raise HTTPException(status_code=400, detail="Nessun documento selezionato")
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Admin può scaricare, cliente solo se è sua
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Crea lo ZIP in memoria
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for doc in tax_return.get("documentos", []):
            if doc.get("id") in document_ids:
                file_name = doc.get("nombre") or doc.get("file_name", "documento")
                
                if doc.get("file_data"):
                    # Documento salvato in base64
                    content = base64.b64decode(doc["file_data"])
                    zip_file.writestr(file_name, content)
                elif doc.get("file_path"):
                    # TODO: implementare download da cloud
                    pass
    
    zip_buffer.seek(0)
    
    # Nome file ZIP
    client_name = tax_return.get("client_name", "cliente").replace(" ", "_")
    anno = tax_return.get("anno_fiscale", "")
    zip_filename = f"documenti_dichiarazione_{anno}_{client_name}.zip"
    
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"'
        }
    )


# ==================== NOTE ====================

@router.post("/tax-returns/{tax_return_id}/client-notes")
async def add_client_note(
    tax_return_id: str,
    texto: str = Form(...),
    seccion: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """Aggiunge una nota del cliente"""
    db = get_db()
    
    if user["role"] != "cliente":
        raise HTTPException(status_code=403, detail="Solo i clienti possono aggiungere note cliente")
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": str(uuid.uuid4()),
        "texto": texto,
        "seccion": seccion,
        "created_at": now
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$push": {"notas_cliente": note},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Nota aggiunta", "note_id": note["id"]}


@router.post("/tax-returns/{tax_return_id}/admin-notes")
async def add_admin_note(
    tax_return_id: str,
    texto: str = Form(...),
    seccion: Optional[str] = Form(None),
    user: dict = Depends(require_commercialista)
):
    """Aggiunge una nota interna dell'admin"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": str(uuid.uuid4()),
        "texto": texto,
        "seccion": seccion,
        "created_by": user["id"],
        "created_at": now
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$push": {"notas_admin": note},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Nota admin aggiunta", "note_id": note["id"]}


# ==================== RICHIESTE INTEGRAZIONE ====================

@router.post("/tax-returns/{tax_return_id}/integration-requests")
async def create_integration_request(
    tax_return_id: str,
    data: IntegrationRequestCreate,
    user: dict = Depends(require_commercialista)
):
    """Crea una richiesta di integrazione documentale"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    now = datetime.now(timezone.utc).isoformat()
    request_id = str(uuid.uuid4())
    
    # Nome admin per visualizzazione
    admin_display_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('full_name', 'Fiscal Tax Canarie')
    
    integration_request = {
        "id": request_id,
        "seccion": data.seccion,
        "mensaje": data.mensaje,
        "documentos_richiesti": data.documentos_richiesti,
        "created_by": user["id"],
        "created_by_name": admin_display_name,
        "created_by_first_name": user.get("first_name", ""),
        "created_by_last_name": user.get("last_name", ""),
        "created_by_profile_image": user.get("profile_image"),
        "created_at": now,
        "risposta_cliente": None,
        "risposta_at": None,
        "stato": "pendente"
    }
    
    # Aggiorna stato pratica
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$push": {"richieste_integrazione": integration_request},
            "$set": {
                "stato": "documentazione_incompleta",
                "updated_at": now
            }
        }
    )
    
    # Invia PUSH + EMAIL al cliente
    try:
        client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
        if client:
            # Prepara messaggio
            docs_list = ', '.join(data.documentos_richiesti) if data.documentos_richiesti else ''
            message_text = f"Sezione: {data.seccion}\n\n{data.mensaje}"
            if docs_list:
                message_text += f"\n\nDocumenti richiesti: {docs_list}"
            
            await send_declaration_notification(
                db=db,
                client_id=tax_return["client_id"],
                client_email=client.get("email"),
                client_name=client.get("full_name", "Cliente"),
                anno_fiscale=tax_return['anno_fiscale'],
                notification_type="integration_request",
                title=f"Richiesta documentazione da {admin_display_name}",
                message=message_text,
                sender_name=admin_display_name,
                tax_return_id=tax_return_id,
                extra_data={
                    "request_id": request_id,
                    "section": data.seccion
                }
            )
    except Exception as e:
        logger.error(f"Error sending integration request notification: {e}")
        pass
    
    await log_activity("richiesta_integrazione", f"Richiesta integrazione per pratica {tax_return_id}", user["id"])
    
    return {"message": "Richiesta integrazione creata", "request_id": request_id}


@router.post("/tax-returns/{tax_return_id}/integration-requests/{request_id}/respond")
async def respond_to_integration_request(
    tax_return_id: str,
    request_id: str,
    data: IntegrationRequestResponse,
    user: dict = Depends(get_current_user)
):
    """Risponde a una richiesta di integrazione (client only)"""
    db = get_db()
    
    if user["role"] != "cliente":
        raise HTTPException(status_code=403, detail="Solo i clienti possono rispondere")
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Aggiorna la richiesta specifica
    await db.tax_returns.update_one(
        {"id": tax_return_id, "richieste_integrazione.id": request_id},
        {
            "$set": {
                "richieste_integrazione.$.risposta_cliente": data.risposta,
                "richieste_integrazione.$.risposta_at": now,
                "richieste_integrazione.$.stato": "risposta",
                "updated_at": now
            }
        }
    )
    
    return {"message": "Risposta inviata"}


# ==================== CLIENTI CON DICHIARAZIONI (ADMIN VIEW) ====================

@router.get("/clients-with-declarations", response_model=List[ClientDeclarationSummary])
async def get_clients_with_declarations(
    search: Optional[str] = None,
    tipo_cliente: Optional[str] = None,
    has_pending_requests: Optional[bool] = None,
    user: dict = Depends(require_commercialista)
):
    """
    Recupera lista clienti con riepilogo delle loro dichiarazioni.
    Vista principale admin: organizzata per cliente.
    """
    db = get_db()
    
    # Recupera tutti i clienti
    client_query = {"role": "cliente"}
    if tipo_cliente:
        client_query["tipo_cliente"] = tipo_cliente
    
    clients = await db.users.find(client_query, {"_id": 0}).to_list(10000)
    
    # Recupera tutte le dichiarazioni (escluse le eliminate)
    tax_returns = await db.tax_returns.find(
        {"stato": {"$nin": ["eliminata", "archiviata"]}}, 
        {"_id": 0}
    ).to_list(10000)
    
    # Raggruppa dichiarazioni per cliente
    client_returns = {}
    for tr in tax_returns:
        cid = tr["client_id"]
        if cid not in client_returns:
            client_returns[cid] = []
        client_returns[cid].append(tr)
    
    result = []
    for client in clients:
        client_id = client["id"]
        returns = client_returns.get(client_id, [])
        
        # Filtro ricerca
        if search:
            search_lower = search.lower()
            if (search_lower not in client.get("full_name", "").lower() and
                search_lower not in client.get("email", "").lower()):
                continue
        
        # Conta per stato
        bozza = len([r for r in returns if r.get("stato") == "bozza"])
        inviate = len([r for r in returns if r.get("stato") == "inviata"])
        in_revisione = len([r for r in returns if r.get("stato") == "in_revisione"])
        presentate = len([r for r in returns if r.get("stato") == "presentata"])
        doc_incompleta = len([r for r in returns if r.get("stato") == "documentazione_incompleta"])
        
        # Conta richieste pendenti
        richieste_pendenti = 0
        for r in returns:
            richieste_pendenti += len([req for req in r.get("richieste_integrazione", []) if req.get("stato") == "pendente"])
        
        # Filtro has_pending_requests
        if has_pending_requests is not None:
            if has_pending_requests and richieste_pendenti == 0:
                continue
            if not has_pending_requests and richieste_pendenti > 0:
                continue
        
        # Conta messaggi non letti (conversazione)
        unread_messages = 0
        for r in returns:
            for msg in r.get("conversazione", []):
                if msg.get("sender_role") == "cliente" and not msg.get("read_by_admin"):
                    unread_messages += 1
        
        # Ultima attività
        last_activity = None
        if returns:
            sorted_returns = sorted(returns, key=lambda x: x.get("updated_at", ""), reverse=True)
            last_activity = sorted_returns[0].get("updated_at")
        
        # Includi solo clienti con dichiarazioni o se non filtrato
        if len(returns) > 0:
            result.append(ClientDeclarationSummary(
                client_id=client_id,
                client_name=client.get("full_name", "N/A"),
                client_email=client.get("email"),
                tipo_cliente=client.get("tipo_cliente"),
                total_declarations=len(returns),
                declarations_bozza=bozza,
                declarations_inviate=inviate,
                declarations_in_revisione=in_revisione,
                declarations_presentate=presentate,
                declarations_doc_incompleta=doc_incompleta,
                total_richieste_pendenti=richieste_pendenti,
                unread_messages=unread_messages,
                last_activity=last_activity
            ))
    
    # Ordina per ultima attività
    result.sort(key=lambda x: x.last_activity or "", reverse=True)
    
    return result


# ==================== CONVERSAZIONE DICHIARAZIONE ====================

@router.post("/tax-returns/{tax_return_id}/messages")
async def add_declaration_message(
    tax_return_id: str,
    data: DeclarationMessageCreate,
    user: dict = Depends(get_current_user)
):
    """Aggiunge un messaggio alla conversazione della dichiarazione con supporto allegati"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Determina se è admin (commercialista, admin, super_admin)
    is_admin = user["role"] in ["commercialista", "admin", "super_admin"]
    
    # Processa allegati se presenti
    processed_attachments = []
    attachments_for_db = []  # Con file_data per il DB
    
    if data.attachments:
        # Verifica formati consentiti
        allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        
        for att in data.attachments:
            if att.get('file_type') not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Formato file non supportato: {att.get('file_type')}. Formati consentiti: PDF, JPEG, PNG"
                )
            
            # Calcola dimensione file da base64
            file_data = att.get('file_data', '')
            file_size = len(file_data) * 3 // 4 if file_data else 0
            
            # Limite dimensione: 10MB per allegato
            if file_size > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File {att.get('file_name')} troppo grande (max 10MB)")
            
            att_id = str(uuid.uuid4())
            
            # Allegato per la risposta (senza file_data)
            processed_attachments.append({
                "id": att_id,
                "file_name": att.get('file_name'),
                "file_type": att.get('file_type'),
                "file_size": file_size
            })
            
            # Allegato per il DB (con file_data)
            attachments_for_db.append({
                "id": att_id,
                "file_name": att.get('file_name'),
                "file_type": att.get('file_type'),
                "file_size": file_size,
                "file_data": file_data
            })
    
    message = {
        "id": str(uuid.uuid4()),
        "content": data.content,
        "sender_id": user["id"],
        "sender_name": user.get("full_name", "Utente"),
        "sender_first_name": user.get("first_name", ""),
        "sender_last_name": user.get("last_name", ""),
        "sender_role": user["role"],
        "sender_profile_image": user.get("profile_image"),
        "created_at": now,
        "read_by_admin": is_admin,
        "read_by_client": user["role"] == "cliente",
        "attachments": attachments_for_db if attachments_for_db else None
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {
            "$push": {"conversazione": message},
            "$set": {"updated_at": now}
        }
    )
    
    # Invia notifiche (push + email)
    try:
        if is_admin:
            # Notifica al cliente - mostra nome dell'admin
            client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
            admin_display_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('full_name', 'Fiscal Tax Canarie')
            
            if client:
                # Prepara sezione allegati per email
                attachments_html = ""
                if processed_attachments:
                    attachments_html = """
                    <div style="margin-top: 15px; padding: 10px; background-color: #f8fafc; border-radius: 8px;">
                        <p style="font-weight: 600; color: #334155; margin-bottom: 8px;">📎 Allegati:</p>
                        <ul style="margin: 0; padding-left: 20px;">
                    """
                    for att in processed_attachments:
                        file_icon = "📄" if att['file_type'] == 'application/pdf' else "🖼️"
                        attachments_html += f"<li>{file_icon} {att['file_name']}</li>"
                    attachments_html += """
                        </ul>
                        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">
                            Accedi alla piattaforma per visualizzare e scaricare gli allegati.
                        </p>
                    </div>
                    """
                
                # Contenuto messaggio completo per email
                message_content = f"{data.content}{attachments_html}"
                
                # Invia PUSH + EMAIL tramite helper
                await send_declaration_notification(
                    db=db,
                    client_id=tax_return["client_id"],
                    client_email=client.get("email"),
                    client_name=client.get("full_name", "Cliente"),
                    anno_fiscale=tax_return['anno_fiscale'],
                    notification_type="message",
                    title=f"Nuovo messaggio da {admin_display_name}",
                    message=data.content,
                    sender_name=admin_display_name,
                    tax_return_id=tax_return_id,
                    extra_data={
                        "message_id": message["id"],
                        "has_attachments": bool(processed_attachments)
                    }
                )
        else:
            # Notifica all'admin (il cliente ha risposto)
            pass
    except Exception as e:
        logger.error(f"Error sending declaration notification: {e}")
        pass  # Non bloccare se notifica fallisce
    
    # Prepara risposta senza file_data
    response_message = {
        **message,
        "attachments": processed_attachments if processed_attachments else None
    }
    
    return {"message": "Messaggio inviato", "message_id": message["id"], "sent_message": response_message}



@router.get("/tax-returns/{tax_return_id}/messages/{message_id}/attachments/{attachment_id}")
async def get_message_attachment(
    tax_return_id: str,
    message_id: str,
    attachment_id: str,
    user: dict = Depends(get_current_user)
):
    """Scarica un allegato di un messaggio"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Trova il messaggio
    message = None
    for msg in tax_return.get("conversazione", []):
        if msg.get("id") == message_id:
            message = msg
            break
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    # Trova l'allegato
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment or not attachment.get("file_data"):
        raise HTTPException(status_code=404, detail="Allegato non trovato")
    
    # Decodifica base64
    import base64
    try:
        file_data = base64.b64decode(attachment["file_data"])
    except Exception:
        raise HTTPException(status_code=500, detail="Errore decodifica file")
    
    from fastapi.responses import Response
    
    return Response(
        content=file_data,
        media_type=attachment["file_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{attachment["file_name"]}"'
        }
    )



@router.put("/tax-returns/{tax_return_id}/messages/mark-read")
async def mark_messages_read(
    tax_return_id: str,
    user: dict = Depends(get_current_user)
):
    """Segna tutti i messaggi come letti"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    field_to_update = "read_by_admin" if user["role"] == "commercialista" else "read_by_client"
    
    # Aggiorna tutti i messaggi
    conversazione = tax_return.get("conversazione", [])
    for msg in conversazione:
        msg[field_to_update] = True
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": {"conversazione": conversazione}}
    )
    
    return {"message": "Messaggi segnati come letti"}



# ==================== DECLARATION FEE (ONORARIO DICHIARAZIONE) ====================

# Tax rates per calcolo
TAX_RATES = {
    "ESENTE": 0,
    "IGIC_7": 0.07,
    "IVA_21": 0.21,
    "IVA_22": 0.22
}

# Template email predefinito
DEFAULT_FEE_NOTIFICATION_TEMPLATE = """
Gentile {client_name},

Le comunichiamo che per la predisposizione e presentazione della Sua dichiarazione dei redditi relativa all'anno fiscale {anno_fiscale}, l'onorario previsto è di:

**Importo: {fee_display}**

{notes_section}

Per qualsiasi chiarimento, non esiti a contattarci rispondendo a questa email o accedendo alla Sua area clienti.

Cordiali saluti,
Fiscal Tax Canarie SLP
"""


@router.put("/{tax_return_id}/fee")
async def update_declaration_fee(
    tax_return_id: str,
    fee_data: DeclarationFeeUpdate,
    user: dict = Depends(require_commercialista)
):
    """
    Aggiorna l'onorario per una dichiarazione dei redditi.
    Solo amministratori possono modificare l'onorario.
    """
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Calcola importi con tassazione
    net_amount = fee_data.amount
    tax_type = fee_data.tax_type or "ESENTE"
    rate = TAX_RATES.get(tax_type, 0)
    tax_amount = round(net_amount * rate, 2)
    gross_amount = round(net_amount + tax_amount, 2)
    
    update_data = {
        "declaration_fee": gross_amount,  # Importo totale lordo
        "declaration_fee_net_amount": net_amount,
        "declaration_fee_tax_amount": tax_amount,
        "declaration_fee_gross_amount": gross_amount,
        "declaration_fee_tax_type": tax_type,
        "declaration_fee_notes": fee_data.notes,
        "declaration_fee_status": fee_data.status or "pending",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": update_data}
    )
    
    # Log attività
    await log_activity(
        "onorario_dichiarazione",
        f"Onorario €{gross_amount} impostato per dichiarazione {tax_return.get('anno_fiscale')} cliente {tax_return.get('client_id')}",
        user["id"]
    )
    
    # Recupera dati cliente per risposta
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0, "full_name": 1})
    
    return {
        "message": "Onorario aggiornato con successo",
        "declaration_id": tax_return_id,
        "client_name": client.get("full_name", "N/A") if client else "N/A",
        "fee_amount": gross_amount,
        "fee_net_amount": net_amount,
        "fee_tax_amount": tax_amount,
        "fee_tax_type": tax_type,
        "fee_status": fee_data.status or "pending"
    }


@router.get("/{tax_return_id}/fee")
async def get_declaration_fee(
    tax_return_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Recupera l'onorario di una dichiarazione.
    Accessibile sia da admin che dal cliente proprietario.
    """
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0, "full_name": 1})
    
    return {
        "declaration_id": tax_return_id,
        "client_id": tax_return["client_id"],
        "client_name": client.get("full_name", "N/A") if client else "N/A",
        "anno_fiscale": tax_return.get("anno_fiscale"),
        "fee_amount": tax_return.get("declaration_fee"),
        "fee_net_amount": tax_return.get("declaration_fee_net_amount"),
        "fee_tax_amount": tax_return.get("declaration_fee_tax_amount"),
        "fee_gross_amount": tax_return.get("declaration_fee_gross_amount"),
        "fee_tax_type": tax_return.get("declaration_fee_tax_type"),
        "fee_notes": tax_return.get("declaration_fee_notes"),
        "fee_status": tax_return.get("declaration_fee_status"),
        "notified_at": tax_return.get("declaration_fee_notified_at"),
        "notification_text": tax_return.get("declaration_fee_notification_text")
    }


@router.post("/{tax_return_id}/fee/notify")
async def notify_declaration_fee(
    tax_return_id: str,
    notify_data: DeclarationFeeNotify,
    user: dict = Depends(require_commercialista)
):
    """
    Invia notifica email al cliente con l'onorario della dichiarazione.
    Supporta template predefinito o messaggio personalizzato.
    """
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    # Verifica che ci sia un onorario impostato
    fee_amount = tax_return.get("declaration_fee")
    if not fee_amount:
        raise HTTPException(status_code=400, detail="Nessun onorario impostato per questa dichiarazione")
    
    # Recupera dati cliente
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    client_email = client.get("email")
    client_name = client.get("full_name", "Cliente")
    anno_fiscale = tax_return.get("anno_fiscale", "N/A")
    
    # Formatta importo
    net_amount = tax_return.get("declaration_fee_net_amount", fee_amount)
    tax_amount = tax_return.get("declaration_fee_tax_amount", 0)
    gross_amount = tax_return.get("declaration_fee_gross_amount", fee_amount)
    tax_type = tax_return.get("declaration_fee_tax_type", "ESENTE")
    
    # Formatta display importo
    if tax_amount > 0:
        tax_label = {"IGIC_7": "IGIC 7%", "IVA_21": "IVA 21%", "IVA_22": "IVA 22%"}.get(tax_type, tax_type)
        fee_display = f"€{gross_amount:.2f} (Netto €{net_amount:.2f} + {tax_label} €{tax_amount:.2f})"
    else:
        fee_display = f"€{gross_amount:.2f} (Esente IVA)"
    
    # Prepara note section
    fee_notes = tax_return.get("declaration_fee_notes", "")
    notes_section = f"\nNote: {fee_notes}\n" if fee_notes else ""
    
    # Prepara messaggio
    if notify_data.use_default_template or not notify_data.message:
        # Usa template predefinito
        email_body = DEFAULT_FEE_NOTIFICATION_TEMPLATE.format(
            client_name=client_name,
            anno_fiscale=anno_fiscale,
            fee_display=fee_display,
            notes_section=notes_section
        )
    else:
        # Usa messaggio personalizzato
        email_body = notify_data.message
        # Sostituisci placeholder se presenti
        email_body = email_body.replace("{client_name}", client_name)
        email_body = email_body.replace("{anno_fiscale}", str(anno_fiscale))
        email_body = email_body.replace("{fee_display}", fee_display)
        email_body = email_body.replace("{fee_amount}", f"€{gross_amount:.2f}")
    
    # Oggetto email
    subject = notify_data.subject or f"Onorario Dichiarazione Redditi {anno_fiscale} - Fiscal Tax Canarie"
    
    # Invia email
    try:
        import sys
        sys.path.insert(0, '/app/backend')
        from email_service import send_generic_email
        
        await send_generic_email(
            to_email=client_email,
            subject=subject,
            html_body=email_body.replace('\n', '<br>')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")
    
    # Aggiorna stato dichiarazione
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": {
            "declaration_fee_status": "notified",
            "declaration_fee_notified_at": datetime.now(timezone.utc).isoformat(),
            "declaration_fee_notification_text": email_body,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Invia anche PUSH notification
    try:
        from push_service import get_client_push_tokens, ExpoPushService
        tokens = await get_client_push_tokens(db, tax_return["client_id"])
        if tokens:
            await ExpoPushService.send_push_notification(
                push_tokens=tokens,
                title=f"Onorario Dichiarazione {anno_fiscale}",
                body=f"L'onorario previsto per la tua dichiarazione è di {fee_display}",
                data={
                    "type": "declaration_fee",
                    "tax_return_id": tax_return_id,
                    "anno_fiscale": anno_fiscale,
                    "screen": "DeclarationDetail",
                    "action": "open_declaration"
                },
                channel_id="declarations"
            )
            logger.info(f"Push notification sent for fee notification {tax_return_id}")
    except Exception as e:
        logger.error(f"Error sending fee push notification: {e}")
    
    # Crea anche notifica in-app
    notification_id = str(uuid.uuid4())
    await db.client_notifications.insert_one({
        "id": notification_id,
        "client_id": tax_return["client_id"],
        "title": f"Onorario Dichiarazione {anno_fiscale}",
        "content": f"L'onorario previsto per la Sua dichiarazione dei redditi {anno_fiscale} è di {fee_display}.",
        "type": "fee",
        "priority": "normal",
        "read": False,
        "related_entity": {"type": "declaration", "id": tax_return_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Log attività
    await log_activity(
        "notifica_onorario_dichiarazione",
        f"Notifica onorario €{gross_amount} inviata a {client_email} per dichiarazione {anno_fiscale}",
        user["id"]
    )
    
    return {
        "message": "Notifica inviata con successo",
        "email_sent_to": client_email,
        "notification_created": True,
        "fee_status": "notified"
    }


@router.put("/{tax_return_id}/fee/mark-paid")
async def mark_declaration_fee_paid(
    tax_return_id: str,
    user: dict = Depends(require_commercialista)
):
    """
    Segna l'onorario della dichiarazione come pagato.
    """
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": {
            "declaration_fee_status": "paid",
            "declaration_fee_paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_activity(
        "onorario_dichiarazione_pagato",
        f"Onorario dichiarazione {tax_return.get('anno_fiscale')} segnato come pagato",
        user["id"]
    )
    
    return {"message": "Onorario segnato come pagato", "status": "paid"}



# ==================== STATISTICHE DICHIARAZIONI (PER DASHBOARD) ====================

@router.get("/stats/summary")
async def get_declarations_stats(user: dict = Depends(require_commercialista)):
    """
    Restituisce statistiche sulle dichiarazioni per la dashboard admin.
    Include conteggio totale e numero di nuove richieste non ancora visualizzate.
    """
    db = get_db()
    
    if db is None:
        logger.error("Database connection is None!")
        return {"total": 0, "new_submissions": 0, "error": "DB not connected"}
    
    # Recupera tutte le dichiarazioni non archiviate/eliminate
    tax_returns = await db.tax_returns.find(
        {"stato": {"$nin": ["archiviata", "eliminata"]}},
        {"_id": 0, "id": 1, "stato": 1, "submitted_at": 1, "viewed_by_admin": 1, "richieste_integrazione": 1, "conversazione": 1}
    ).to_list(10000)
    
    logger.info(f"Stats query returned {len(tax_returns)} tax returns")
    
    total = len(tax_returns)
    
    # Conta le nuove dichiarazioni (inviate ma non ancora visualizzate dall'admin)
    new_submissions = 0
    for tr in tax_returns:
        if tr.get("stato") == "inviata" and not tr.get("viewed_by_admin"):
            new_submissions += 1
    
    # Conta per stato
    stats_by_status = {
        "bozza": 0,
        "inviata": 0,
        "in_revisione": 0,
        "documentazione_incompleta": 0,
        "pronta": 0,
        "presentata": 0
    }
    
    for tr in tax_returns:
        stato = tr.get("stato", "bozza")
        if stato in stats_by_status:
            stats_by_status[stato] += 1
    
    # Conta messaggi non letti dal cliente
    unread_client_messages = 0
    for tr in tax_returns:
        for msg in tr.get("conversazione", []):
            if msg.get("sender_role") == "cliente" and not msg.get("read_by_admin"):
                unread_client_messages += 1
    
    # Conta richieste integrazione pendenti (in attesa di risposta cliente)
    pending_integration_requests = 0
    for tr in tax_returns:
        for req in tr.get("richieste_integrazione", []):
            if req.get("stato") == "pendente":
                pending_integration_requests += 1
    
    return {
        "total": total,
        "new_submissions": new_submissions,  # Dichiarazioni inviate non ancora visualizzate
        "unread_client_messages": unread_client_messages,
        "pending_integration_requests": pending_integration_requests,
        "by_status": stats_by_status,
        "has_new_activity": new_submissions > 0 or unread_client_messages > 0
    }


@router.put("/tax-returns/{tax_return_id}/mark-viewed")
async def mark_tax_return_viewed(
    tax_return_id: str,
    user: dict = Depends(require_commercialista)
):
    """
    Segna una dichiarazione come visualizzata dall'admin.
    Rimuove il badge "nuova" dalla dashboard.
    """
    db = get_db()
    
    result = await db.tax_returns.update_one(
        {"id": tax_return_id},
        {"$set": {
            "viewed_by_admin": True,
            "viewed_by_admin_at": datetime.now(timezone.utc).isoformat(),
            "viewed_by_admin_id": user["id"]
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dichiarazione non trovata")
    
    return {"message": "Dichiarazione segnata come visualizzata"}
