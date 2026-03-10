"""
Servizio Email con Brevo per notifiche automatiche
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Carica .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

def get_brevo_key():
    """Ottiene la chiave Brevo in modo lazy"""
    return os.environ.get('BREVO_API_KEY', '')

SENDER_EMAIL = "info@fiscaltaxcanarie.com"
SENDER_NAME = "Fiscal Tax Canarie"

async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> Dict[str, Any]:
    """Invia una email transazionale tramite Brevo"""
    
    api_key = get_brevo_key()
    if not api_key:
        logger.warning("BREVO_API_KEY non configurata")
        return {"success": False, "error": "Chiave Brevo non configurata"}
    
    try:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = api_key
        
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": SENDER_NAME, "email": SENDER_EMAIL},
            to=[{"email": to_email, "name": to_name}],
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        response = api_instance.send_transac_email(send_smtp_email)
        logger.info(f"Email inviata a {to_email}: {response.message_id}")
        
        return {
            "success": True,
            "message_id": response.message_id,
            "to": to_email
        }
        
    except Exception as e:
        logger.error(f"Errore invio email: {e}")
        return {"success": False, "error": str(e)}

# ==================== TEMPLATE EMAIL ====================

def get_document_uploaded_template(client_name: str, doc_title: str, doc_description: str = None) -> str:
    """Template email per nuovo documento caricato"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #3caca4; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .content h2 {{ color: #1e293b; margin-top: 0; }}
            .doc-box {{ background: #f0fafa; border-left: 4px solid #3caca4; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .btn {{ display: inline-block; background: #3caca4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Fiscal Tax Canarie</h1>
            </div>
            <div class="content">
                <h2>Ciao {client_name},</h2>
                <p>Ti informiamo che è stato caricato un nuovo documento nella tua area riservata:</p>
                <div class="doc-box">
                    <strong>{doc_title}</strong>
                    {f'<p style="margin: 10px 0 0 0; color: #64748b;">{doc_description}</p>' if doc_description else ''}
                </div>
                <p>Accedi alla tua area clienti per visualizzarlo e scaricarlo.</p>
                <p style="margin-top: 30px;">
                    <a href="https://tribute-models-docs.preview.emergentagent.com/login" class="btn">Accedi all'Area Clienti</a>
                </p>
            </div>
            <div class="footer">
                <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_deadline_reminder_template(client_name: str, deadline_title: str, deadline_date: str, deadline_description: str = None) -> str:
    """Template email per promemoria scadenza"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #f59e0b; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .content h2 {{ color: #1e293b; margin-top: 0; }}
            .deadline-box {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .date {{ font-size: 20px; font-weight: bold; color: #b45309; }}
            .btn {{ display: inline-block; background: #3caca4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Promemoria Scadenza</h1>
            </div>
            <div class="content">
                <h2>Ciao {client_name},</h2>
                <p>Ti ricordiamo che hai una scadenza in arrivo:</p>
                <div class="deadline-box">
                    <strong>{deadline_title}</strong>
                    <p class="date">Scadenza: {deadline_date}</p>
                    {f'<p style="margin: 10px 0 0 0; color: #64748b;">{deadline_description}</p>' if deadline_description else ''}
                </div>
                <p>Assicurati di avere tutti i documenti pronti. In caso di dubbi, contattaci.</p>
                <p style="margin-top: 30px;">
                    <a href="https://tribute-models-docs.preview.emergentagent.com/login" class="btn">Visualizza Scadenze</a>
                </p>
            </div>
            <div class="footer">
                <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_note_notification_template(client_name: str, note_title: str, note_content: str) -> str:
    """Template email per nuova comunicazione/appunto"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #3caca4; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; }}
            .content h2 {{ color: #1e293b; margin-top: 0; }}
            .note-box {{ background: #f0fafa; border-left: 4px solid #3caca4; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .btn {{ display: inline-block; background: #3caca4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Nuova Comunicazione</h1>
            </div>
            <div class="content">
                <h2>Ciao {client_name},</h2>
                <p>Hai ricevuto una nuova comunicazione dal tuo commercialista:</p>
                <div class="note-box">
                    <strong>{note_title}</strong>
                    <p style="margin: 10px 0 0 0; color: #475569; white-space: pre-wrap;">{note_content[:500]}{'...' if len(note_content) > 500 else ''}</p>
                </div>
                <p style="margin-top: 30px;">
                    <a href="https://tribute-models-docs.preview.emergentagent.com/login" class="btn">Leggi nella tua Area</a>
                </p>
            </div>
            <div class="footer">
                <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_welcome_template(client_name: str) -> str:
    """Template email di benvenuto per nuovi clienti"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #3caca4; color: white; padding: 40px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; }}
            .content {{ padding: 30px; }}
            .content h2 {{ color: #1e293b; margin-top: 0; }}
            .feature {{ display: flex; align-items: flex-start; margin: 15px 0; }}
            .feature-icon {{ width: 40px; height: 40px; background: #d4f1ef; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center; color: #3caca4; font-size: 20px; }}
            .btn {{ display: inline-block; background: #3caca4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Benvenuto in Fiscal Tax Canarie!</h1>
            </div>
            <div class="content">
                <h2>Ciao {client_name},</h2>
                <p>Grazie per esserti registrato! La tua area clienti è pronta.</p>
                <p>Ecco cosa puoi fare:</p>
                <div class="feature">
                    <div class="feature-icon">📅</div>
                    <div>
                        <strong>Calendario Scadenze</strong>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Visualizza tutte le tue scadenze fiscali</p>
                    </div>
                </div>
                <div class="feature">
                    <div class="feature-icon">📄</div>
                    <div>
                        <strong>Documenti</strong>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Accedi ai tuoi documenti fiscali 24/7</p>
                    </div>
                </div>
                <div class="feature">
                    <div class="feature-icon">💬</div>
                    <div>
                        <strong>Assistente AI</strong>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Chiedi informazioni sui modelli tributari</p>
                    </div>
                </div>
                <p style="margin-top: 30px; text-align: center;">
                    <a href="https://tribute-models-docs.preview.emergentagent.com/login" class="btn">Accedi Ora</a>
                </p>
            </div>
            <div class="footer">
                <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """

# ==================== INVITATION TEMPLATES ====================

def get_invitation_template(client_name: str, invitation_link: str) -> str:
    """Template email per invito nuovo cliente"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #3caca4 0%, #2d8a84 100%); color: white; padding: 40px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; }}
            .content {{ padding: 30px; }}
            .content h2 {{ color: #1e293b; margin-top: 0; }}
            .highlight-box {{ background: linear-gradient(135deg, #f0fafa 0%, #e0f7f7 100%); border: 2px solid #3caca4; padding: 20px; margin: 25px 0; border-radius: 12px; text-align: center; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #3caca4 0%, #2d8a84 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(60, 172, 164, 0.3); }}
            .btn:hover {{ background: linear-gradient(135deg, #2d8a84 0%, #257a74 100%); }}
            .features {{ margin: 25px 0; }}
            .feature {{ display: flex; align-items: center; margin: 12px 0; padding: 10px; background: #f8fafc; border-radius: 8px; }}
            .feature-icon {{ width: 36px; height: 36px; background: #3caca4; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
            .small-text {{ font-size: 12px; color: #94a3b8; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Benvenuto in Fiscal Tax Canarie!</h1>
            </div>
            <div class="content">
                <h2>Ciao{' ' + client_name if client_name else ''},</h2>
                <p>Sei stato invitato a unirti alla piattaforma <strong>Fiscal Tax Canarie</strong> per gestire le tue pratiche fiscali in modo semplice e sicuro.</p>
                
                <div class="highlight-box">
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #1e293b;">Clicca il pulsante per completare la registrazione:</p>
                    <a href="{invitation_link}" class="btn">Completa la Registrazione</a>
                </div>
                
                <p style="font-weight: 600; color: #1e293b;">Cosa potrai fare:</p>
                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">📅</div>
                        <div>Visualizzare le scadenze fiscali</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📄</div>
                        <div>Accedere ai tuoi documenti 24/7</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">💬</div>
                        <div>Chattare con l'assistente AI</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📊</div>
                        <div>Monitorare lo stato delle pratiche</div>
                    </div>
                </div>
                
                <p class="small-text">
                    Se non hai richiesto questo invito, puoi ignorare questa email.<br>
                    Il link scade tra 7 giorni.
                </p>
                
                <div style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                        Se il pulsante non funziona, copia e incolla questo link nel browser:
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; word-break: break-all; color: #3caca4;">
                        {invitation_link}
                    </p>
                </div>
            </div>
            <div class="footer">
                <p><strong>Fiscal Tax Canarie</strong> - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """

async def send_invitation_email(client_email: str, client_name: str, invitation_link: str) -> Dict[str, Any]:
    """Invia email di invito al nuovo cliente"""
    html = get_invitation_template(client_name, invitation_link)
    
    # Versione testo dell'email (per client che non supportano HTML)
    text_content = f"""
Ciao {client_name if client_name else ''},

Sei stato invitato a unirti a Fiscal Tax Canarie per gestire le tue pratiche fiscali.

Per completare la registrazione, visita questo link:
{invitation_link}

Cosa potrai fare:
- Visualizzare le scadenze fiscali
- Accedere ai tuoi documenti 24/7
- Chattare con l'assistente AI
- Monitorare lo stato delle pratiche

Il link scade tra 7 giorni.

Fiscal Tax Canarie
+34 658 071 848 | info@fiscaltaxcanarie.com
"""
    
    return await send_email(
        to_email=client_email,
        to_name=client_name or "Nuovo Cliente",
        subject="Sei stato invitato su Fiscal Tax Canarie!",
        html_content=html,
        text_content=text_content
    )

# ==================== NOTIFICATION FUNCTIONS ====================

async def notify_document_uploaded(client_email: str, client_name: str, doc_title: str, doc_description: str = None) -> Dict[str, Any]:
    """Notifica al cliente che un nuovo documento è stato caricato"""
    html = get_document_uploaded_template(client_name, doc_title, doc_description)
    return await send_email(
        to_email=client_email,
        to_name=client_name,
        subject=f"Nuovo documento disponibile: {doc_title}",
        html_content=html
    )

async def notify_deadline_reminder(client_email: str, client_name: str, deadline_title: str, deadline_date: str, deadline_description: str = None) -> Dict[str, Any]:
    """Invia promemoria per scadenza imminente"""
    html = get_deadline_reminder_template(client_name, deadline_title, deadline_date, deadline_description)
    return await send_email(
        to_email=client_email,
        to_name=client_name,
        subject=f"Promemoria: {deadline_title} - Scadenza {deadline_date}",
        html_content=html
    )

async def notify_new_note(client_email: str, client_name: str, note_title: str, note_content: str) -> Dict[str, Any]:
    """Notifica al cliente una nuova comunicazione"""
    html = get_note_notification_template(client_name, note_title, note_content)
    return await send_email(
        to_email=client_email,
        to_name=client_name,
        subject=f"Nuova comunicazione: {note_title}",
        html_content=html
    )

async def send_welcome_email(client_email: str, client_name: str) -> Dict[str, Any]:
    """Invia email di benvenuto al nuovo cliente"""
    html = get_welcome_template(client_name)
    return await send_email(
        to_email=client_email,
        to_name=client_name,
        subject="Benvenuto in Fiscal Tax Canarie!",
        html_content=html
    )

async def send_generic_email(to_email: str, subject: str, html_body: str) -> Dict[str, Any]:
    """Invia email generica con contenuto HTML personalizzato"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #3caca4; color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 30px; color: #1e293b; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Fiscal Tax Canarie</h1>
            </div>
            <div class="content">
                {html_body}
            </div>
            <div class="footer">
                <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
                <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(
        to_email=to_email,
        to_name="",
        subject=subject,
        html_content=html_content
    )
