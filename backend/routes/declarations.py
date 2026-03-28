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
    IntegrationRequestCreate, IntegrationRequestResponse
)

router = APIRouter(prefix="/declarations", tags=["declarations"])

# Testo autorizzazione di default
DEFAULT_AUTHORIZATION_TEXT = """Autorizzo Fiscal Tax Canarie SLP, CIF B44653517, con sede in Las Palmas de Gran Canaria, Calle Domingo J. Navarro n. 1, Planta 2, Oficina 5, a predisporre e presentare per mio conto la dichiarazione dei redditi sulla base dei dati e dei documenti da me forniti."""


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
    
    # Verifica che non esista già una pratica per lo stesso anno
    existing = await db.tax_returns.find_one({
        "client_id": client_id,
        "anno_fiscale": data.anno_fiscale,
        "stato": {"$ne": "archiviata"}
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
        "submitted_at": None
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
    user: dict = Depends(get_current_user)
):
    """Recupera lista pratiche (filtrate per ruolo)"""
    db = get_db()
    
    query = {}
    
    if user["role"] == "cliente":
        query["client_id"] = user["id"]
    elif client_id:
        query["client_id"] = client_id
    
    if anno_fiscale:
        query["anno_fiscale"] = anno_fiscale
    
    if stato:
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
    
    # Verifica accesso
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Aggiungi info cliente
    client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0, "full_name": 1, "email": 1})
    tax_return["client_name"] = client.get("full_name") if client else None
    tax_return["client_email"] = client.get("email") if client else None
    
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
        "deducciones", "deducciones_canarias"
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
    
    valid_states = ["bozza", "inviata", "documentazione_incompleta", "in_revisione", "pronta", "presentata", "archiviata"]
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


@router.delete("/tax-returns/{tax_return_id}")
async def delete_tax_return(tax_return_id: str, user: dict = Depends(get_current_user)):
    """Elimina una pratica (solo se in bozza)"""
    db = get_db()
    
    tax_return = await db.tax_returns.find_one({"id": tax_return_id}, {"_id": 0})
    if not tax_return:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    # Solo il proprietario o admin può eliminare
    if user["role"] == "cliente" and tax_return["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Solo bozze eliminabili
    if tax_return["stato"] != "bozza":
        raise HTTPException(status_code=400, detail="Solo le pratiche in bozza possono essere eliminate")
    
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
    
    integration_request = {
        "id": request_id,
        "seccion": data.seccion,
        "mensaje": data.mensaje,
        "documentos_richiesti": data.documentos_richiesti,
        "created_by": user["id"],
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
    
    # Invia email al cliente
    try:
        from email_service import send_generic_email
        client = await db.users.find_one({"id": tax_return["client_id"]}, {"_id": 0})
        if client and client.get("email"):
            await send_generic_email(
                client["email"],
                f"[Fiscal Tax] Richiesta documentazione - Dichiarazione Redditi {tax_return['anno_fiscale']}",
                f"""
                <h2>Richiesta Integrazione Documentale</h2>
                <p>Gentile {client.get('full_name', 'Cliente')},</p>
                <p>Abbiamo bisogno di ulteriore documentazione per la tua dichiarazione dei redditi {tax_return['anno_fiscale']}.</p>
                <p><strong>Sezione:</strong> {data.seccion}</p>
                <p><strong>Messaggio:</strong> {data.mensaje}</p>
                {'<p><strong>Documenti richiesti:</strong> ' + ', '.join(data.documentos_richiesti) + '</p>' if data.documentos_richiesti else ''}
                <p>Accedi alla piattaforma per caricare i documenti richiesti.</p>
                <p>Cordiali saluti,<br>Fiscal Tax Canarie</p>
                """
            )
    except Exception as e:
        pass
    
    await log_activity("richiesta_integrazione", f"Richiesta integrazione per pratica {tax_return_id}", user["id"])
    
    return {"message": "Richiesta integrazione creata", "request_id": request_id}


@router.put("/tax-returns/{tax_return_id}/integration-requests/{request_id}/respond")
async def respond_to_integration_request(
    tax_return_id: str,
    request_id: str,
    risposta: str = Form(...),
    user: dict = Depends(get_current_user)
):
    """Risponde a una richiesta di integrazione"""
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
                "richieste_integrazione.$.risposta_cliente": risposta,
                "richieste_integrazione.$.risposta_at": now,
                "richieste_integrazione.$.stato": "risposta",
                "updated_at": now
            }
        }
    )
    
    return {"message": "Risposta inviata"}
