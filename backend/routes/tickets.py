"""
Routes per la gestione dei Ticket (sistema di supporto bidirezionale)
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import io

from .deps import get_db, get_current_user, require_commercialista
from .models import (
    TicketCreate, TicketUpdate, TicketResponse,
    TicketMessageCreate, TicketMessage
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketResponse)
async def create_ticket(ticket_data: TicketCreate, user: dict = Depends(get_current_user)):
    """Crea un nuovo ticket - accessibile sia a clienti che admin"""
    db = get_db()
    ticket_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Determina client_id
    if user["role"] == "cliente":
        client_id = user["id"]
    else:
        raise HTTPException(status_code=400, detail="Solo i clienti possono aprire ticket")
    
    # Primo messaggio del ticket
    first_message = {
        "id": str(uuid.uuid4()),
        "content": ticket_data.content,
        "sender_id": user["id"],
        "sender_name": user.get("full_name", "Cliente"),
        "sender_role": user["role"],
        "created_at": now
    }
    
    ticket = {
        "id": ticket_id,
        "subject": ticket_data.subject,
        "client_id": client_id,
        "status": "aperto",
        "messages": [first_message],
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now,
        "closed_at": None
    }
    
    await db.tickets.insert_one(ticket)
    
    # Crea notifica per admin
    await db.admin_notifications.insert_one({
        "id": str(uuid.uuid4()),
        "type": "new_ticket",
        "title": "Nuovo Ticket",
        "message": f"Nuovo ticket da {user.get('full_name', 'Cliente')}: {ticket_data.subject}",
        "ticket_id": ticket_id,
        "client_id": client_id,
        "read": False,
        "created_at": now
    })
    
    # Get client name
    client = await db.users.find_one({"id": client_id}, {"_id": 0, "full_name": 1})
    ticket["client_name"] = client.get("full_name") if client else None
    
    return TicketResponse(**ticket)


@router.get("", response_model=List[TicketResponse])
async def get_tickets(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Recupera tickets - filtrati per ruolo utente"""
    db = get_db()
    query = {}
    
    if user["role"] == "cliente":
        # Cliente vede solo i propri ticket
        query["client_id"] = user["id"]
    elif client_id:
        # Admin può filtrare per cliente
        query["client_id"] = client_id
    
    # Filtro per stato
    if status and status != "tutti":
        query["status"] = status
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    # Aggiungi nomi clienti
    client_ids = list(set(t["client_id"] for t in tickets))
    clients = await db.users.find({"id": {"$in": client_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(1000)
    client_map = {c["id"]: c.get("full_name") for c in clients}
    
    for ticket in tickets:
        ticket["client_name"] = client_map.get(ticket["client_id"])
    
    return [TicketResponse(**t) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    """Recupera singolo ticket"""
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    # Verifica accesso
    if user["role"] == "cliente" and ticket["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Aggiungi nome cliente
    client = await db.users.find_one({"id": ticket["client_id"]}, {"_id": 0, "full_name": 1})
    ticket["client_name"] = client.get("full_name") if client else None
    
    return TicketResponse(**ticket)


@router.post("/{ticket_id}/messages", response_model=TicketResponse)
async def add_ticket_message(ticket_id: str, message_data: TicketMessageCreate, user: dict = Depends(get_current_user)):
    """Aggiungi messaggio a un ticket - sia cliente che admin"""
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    # Verifica accesso
    if user["role"] == "cliente" and ticket["client_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Verifica che il ticket non sia chiuso o archiviato
    if ticket["status"] in ["chiuso", "archiviato"]:
        raise HTTPException(status_code=400, detail="Non è possibile rispondere a un ticket chiuso o archiviato")
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        "id": str(uuid.uuid4()),
        "content": message_data.content,
        "sender_id": user["id"],
        "sender_name": user.get("full_name", "Utente"),
        "sender_role": user["role"],
        "created_at": now
    }
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {"updated_at": now}
        }
    )
    
    # Notifica all'altra parte
    if user["role"] == "cliente":
        # Notifica admin
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "ticket_reply",
            "title": "Risposta Ticket",
            "message": f"Nuova risposta da {user.get('full_name', 'Cliente')} al ticket: {ticket['subject']}",
            "ticket_id": ticket_id,
            "client_id": ticket["client_id"],
            "read": False,
            "created_at": now
        })
    
    # Recupera ticket aggiornato
    updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    client = await db.users.find_one({"id": updated_ticket["client_id"]}, {"_id": 0, "full_name": 1})
    updated_ticket["client_name"] = client.get("full_name") if client else None
    
    return TicketResponse(**updated_ticket)


@router.put("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(ticket_id: str, status_data: TicketUpdate, user: dict = Depends(require_commercialista)):
    """Aggiorna stato ticket - solo admin"""
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"updated_at": now}
    
    if status_data.status:
        update_data["status"] = status_data.status
        if status_data.status == "chiuso":
            update_data["closed_at"] = now
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    client = await db.users.find_one({"id": updated_ticket["client_id"]}, {"_id": 0, "full_name": 1})
    updated_ticket["client_name"] = client.get("full_name") if client else None
    
    return TicketResponse(**updated_ticket)


@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, user: dict = Depends(require_commercialista)):
    """Elimina ticket - solo admin"""
    db = get_db()
    result = await db.tickets.delete_one({"id": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    return {"message": "Ticket eliminato"}


@router.get("/{ticket_id}/export-pdf")
async def export_ticket_pdf(ticket_id: str, user: dict = Depends(require_commercialista)):
    """Esporta ticket in PDF con storico completo"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    
    db = get_db()
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    # Get client info
    client = await db.users.find_one({"id": ticket["client_id"]}, {"_id": 0})
    client_name = client.get("full_name", "N/A") if client else "N/A"
    client_email = client.get("email", "N/A") if client else "N/A"
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#0d9488'), spaceAfter=20, alignment=TA_CENTER)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'), alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1e293b'), spaceBefore=15, spaceAfter=10)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'), spaceAfter=6)
    message_client_style = ParagraphStyle('MessageClient', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#0f766e'), leftIndent=20, spaceAfter=10)
    message_admin_style = ParagraphStyle('MessageAdmin', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#1e40af'), leftIndent=20, spaceAfter=10)
    date_style = ParagraphStyle('Date', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'))
    
    elements = []
    
    # Header
    elements.append(Paragraph("FISCAL TAX CANARIE", header_style))
    elements.append(Paragraph("Copia Certificata Ticket di Assistenza", header_style))
    elements.append(Spacer(1, 20))
    
    # Title
    elements.append(Paragraph(f"Ticket: {ticket['subject']}", title_style))
    elements.append(Spacer(1, 10))
    
    # Status badge
    status_colors = {"aperto": "#22c55e", "chiuso": "#64748b", "archiviato": "#ef4444"}
    status_labels = {"aperto": "APERTO", "chiuso": "CHIUSO", "archiviato": "ARCHIVIATO"}
    status = ticket.get("status", "aperto")
    elements.append(Paragraph(f"<font color='{status_colors.get(status, '#64748b')}'>● {status_labels.get(status, status.upper())}</font>", ParagraphStyle('Status', parent=styles['Normal'], fontSize=12, alignment=TA_CENTER)))
    elements.append(Spacer(1, 20))
    
    # Info table
    info_data = [
        ["Cliente:", client_name],
        ["Email:", client_email],
        ["Data Apertura:", ticket.get("created_at", "N/A")[:19].replace("T", " ") if ticket.get("created_at") else "N/A"],
        ["Ultimo Aggiornamento:", ticket.get("updated_at", "N/A")[:19].replace("T", " ") if ticket.get("updated_at") else "N/A"],
    ]
    if ticket.get("closed_at"):
        info_data.append(["Data Chiusura:", ticket["closed_at"][:19].replace("T", " ")])
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Separator
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    elements.append(Spacer(1, 15))
    
    # Conversation history
    elements.append(Paragraph("STORICO CONVERSAZIONE", section_style))
    
    messages = ticket.get("messages", [])
    if messages:
        for i, msg in enumerate(messages):
            sender_name = msg.get("sender_name", "Utente")
            sender_role = msg.get("sender_role", "")
            created_at = msg.get("created_at", "")[:19].replace("T", " ") if msg.get("created_at") else ""
            content = msg.get("content", "")
            
            # Message header
            if sender_role == "cliente":
                elements.append(Paragraph(f"<b>🟢 {sender_name} (Cliente)</b> - {created_at}", date_style))
                elements.append(Paragraph(content, message_client_style))
            else:
                elements.append(Paragraph(f"<b>🔵 {sender_name} (Fiscal Tax Canarie)</b> - {created_at}", date_style))
                elements.append(Paragraph(content, message_admin_style))
            
            if i < len(messages) - 1:
                elements.append(Spacer(1, 5))
    else:
        elements.append(Paragraph("Nessun messaggio nel ticket.", normal_style))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    elements.append(Spacer(1, 10))
    footer_text = f"Documento generato il {datetime.now(timezone.utc).strftime('%d/%m/%Y alle %H:%M:%S')} UTC"
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))
    elements.append(Paragraph("Fiscal Tax Canarie - Gestionale Studio Professionale", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Filename
    safe_subject = "".join(c for c in ticket['subject'] if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
    filename = f"ticket_{safe_subject}_{ticket_id[:8]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Admin notifications for tickets
admin_router = APIRouter(prefix="/admin", tags=["admin-tickets"])


@admin_router.get("/ticket-notifications")
async def get_ticket_notifications(user: dict = Depends(require_commercialista)):
    """Recupera notifiche ticket non lette per admin"""
    db = get_db()
    notifications = await db.admin_notifications.find(
        {"type": {"$in": ["new_ticket", "ticket_reply"]}, "read": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications


@admin_router.put("/ticket-notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_commercialista)):
    """Segna notifica come letta"""
    db = get_db()
    await db.admin_notifications.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notifica segnata come letta"}
