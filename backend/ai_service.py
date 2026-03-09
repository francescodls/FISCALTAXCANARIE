"""
Servizio AI per classificazione e analisi documenti
Utilizza OpenAI GPT tramite Emergent LLM Key
"""
import os
import base64
import logging
from typing import Optional, Dict, Any, List
import PyPDF2
from io import BytesIO
from datetime import datetime

logger = logging.getLogger(__name__)

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

async def extract_text_from_pdf(file_data: str) -> str:
    """Estrae il testo da un file PDF codificato in base64"""
    try:
        pdf_bytes = base64.b64decode(file_data)
        pdf_file = BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        
        return text.strip()[:5000]  # Limita a 5000 caratteri
    except Exception as e:
        logger.error(f"Errore estrazione PDF: {e}")
        return ""

async def analyze_document_with_ai(
    file_content: str,
    file_name: str,
    clients_list: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Analizza un documento con OpenAI GPT per:
    - Identificare il tipo di documento
    - Estrarre informazioni chiave
    - Associare al cliente corretto
    - Generare una descrizione
    - Suggerire categoria e tag
    """
    
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY non configurata")
        return {
            "success": False,
            "error": "Chiave AI non configurata"
        }
    
    try:
        from emergentintegrations.llm.chat import chat, LlmMessage
        
        # Prepara lista clienti per il prompt
        clients_info = "\n".join([
            f"- ID: {c['id']}, Nome: {c['full_name']}, Email: {c['email']}, CF/NIF: {c.get('codice_fiscale', 'N/A')}"
            for c in clients_list
        ])
        
        prompt = f"""Analizza il seguente documento fiscale/tributario e fornisci le informazioni richieste in formato JSON.

NOME FILE: {file_name}

CONTENUTO DOCUMENTO:
{file_content[:4000]}

LISTA CLIENTI DISPONIBILI:
{clients_info}

Rispondi SOLO con un JSON valido (senza markdown, senza ```json) con questa struttura:
{{
    "tipo_documento": "string - tipo documento (fattura, dichiarazione, contratto, busta_paga, modello_fiscale, comunicazione, altro)",
    "modello_tributario": "string o null - se è un modello fiscale, indica quale (es: Modelo-303, Modelo-111, IGIC, etc.)",
    "descrizione": "string - breve descrizione del documento (max 100 caratteri)",
    "descrizione_estesa": "string - spiegazione più dettagliata per il cliente (max 200 caratteri)",
    "data_documento": "string o null - data del documento se presente (formato YYYY-MM-DD)",
    "periodo_riferimento": "string o null - periodo fiscale (es: Q1 2025, Gennaio 2025, Anno 2024)",
    "importo_principale": "string o null - importo principale se presente",
    "cliente_identificato": {{
        "id": "string o null - ID del cliente dalla lista se identificato",
        "confidenza": "alta/media/bassa - quanto sei sicuro dell'associazione",
        "motivo": "string - perché hai associato questo cliente"
    }},
    "categoria_suggerita": "string - atto, imposta, contratto, busta_paga, comunicazione, altro",
    "tags": ["array di string - tag utili per la ricerca"],
    "nome_file_suggerito": "string - nome file standardizzato formato: YYYY-MM-DD_TipoDoc_NomeCliente_Riferimento"
}}"""

        messages = [
            LlmMessage(role="system", content="Sei un assistente esperto in documentazione fiscale e tributaria spagnola, specializzato nelle Isole Canarie. Analizza i documenti e fornisci informazioni strutturate in JSON."),
            LlmMessage(role="user", content=prompt)
        ]
        
        response = await chat(
            api_key=EMERGENT_LLM_KEY,
            messages=messages,
            model="gpt-4o-mini"
        )
        
        # Parse JSON response
        import json
        response_text = response.message.strip()
        
        # Rimuovi eventuali backtick markdown
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
        
        result = json.loads(response_text)
        result["success"] = True
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Errore parsing JSON risposta AI: {e}")
        return {
            "success": False,
            "error": f"Errore parsing risposta: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Errore analisi AI: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def generate_standard_filename(
    tipo_documento: str,
    data_documento: Optional[str],
    cliente_nome: Optional[str],
    riferimento: Optional[str]
) -> str:
    """Genera un nome file standardizzato"""
    
    date_str = data_documento or datetime.now().strftime("%Y-%m-%d")
    
    # Pulisci i valori
    tipo = tipo_documento.replace(" ", "-").replace("_", "-")[:20] if tipo_documento else "Documento"
    cliente = cliente_nome.replace(" ", "")[:20] if cliente_nome else "NoCliente"
    rif = riferimento.replace(" ", "-")[:15] if riferimento else ""
    
    if rif:
        return f"{date_str}_{tipo}_{cliente}_{rif}.pdf"
    else:
        return f"{date_str}_{tipo}_{cliente}.pdf"
