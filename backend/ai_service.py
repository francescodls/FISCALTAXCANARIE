"""
Servizio AI per classificazione e analisi documenti
Utilizza OpenAI GPT tramite Emergent LLM Key
"""
import os
import base64
import logging
import re
from typing import Optional, Dict, Any, List
import PyPDF2
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Carica .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

def get_emergent_key():
    """Ottiene la chiave Emergent in modo lazy"""
    return os.environ.get('EMERGENT_LLM_KEY', '')

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
    
    api_key = get_emergent_key()
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY non configurata")
        return {
            "success": False,
            "error": "Chiave AI non configurata"
        }
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
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
    "is_busta_paga": "boolean - true se il documento è una busta paga/cedolino/payslip/nómina, false altrimenti",
    "mese_busta_paga": "string o null - se è una busta paga, indica il mese (Gennaio, Febbraio, etc.)",
    "anno_busta_paga": "integer o null - se è una busta paga, indica l'anno (es: 2025)",
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

        # Crea chat instance
        llm_chat = LlmChat(
            api_key=api_key,
            session_id="doc_analysis",
            system_message="Sei un assistente esperto in documentazione fiscale e tributaria spagnola, specializzato nelle Isole Canarie. Analizza i documenti e fornisci informazioni strutturate in JSON."
        ).with_model("openai", "gpt-4o-mini")
        
        # Invia messaggio
        response = await llm_chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON response
        import json
        response_text = response.message.strip() if hasattr(response, 'message') else str(response).strip()
        
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
    riferimento: Optional[str],
    original_extension: str = ".pdf"
) -> str:
    """
    Genera un nome file standardizzato nel formato:
    YYYY-MM-DD_TipoDocumento_NomeCliente_Riferimento.ext
    
    Es: 2025-01-15_Fattura_MarioRossi_Q1-2025.pdf
    """
    
    # Data: usa quella del documento o oggi
    if data_documento:
        try:
            # Prova a parsare vari formati
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
                try:
                    date_obj = datetime.strptime(data_documento, fmt)
                    date_str = date_obj.strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
            else:
                date_str = datetime.now().strftime("%Y-%m-%d")
        except Exception:
            date_str = datetime.now().strftime("%Y-%m-%d")
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Pulisci e formatta tipo documento
    tipo_map = {
        "fattura": "Fattura",
        "dichiarazione": "Dichiarazione",
        "contratto": "Contratto",
        "busta_paga": "BustaPaga",
        "modello_fiscale": "ModelloFiscale",
        "comunicazione": "Comunicazione",
        "atto": "Atto",
        "imposta": "Imposta",
        "altro": "Documento"
    }
    tipo = tipo_map.get(tipo_documento.lower() if tipo_documento else "altro", "Documento")
    
    # Pulisci nome cliente (rimuovi spazi, caratteri speciali)
    if cliente_nome:
        cliente = re.sub(r'[^a-zA-Z0-9]', '', cliente_nome)[:25]
    else:
        cliente = "NoCliente"
    
    # Pulisci riferimento
    if riferimento:
        rif = re.sub(r'[^a-zA-Z0-9-]', '', riferimento.replace(" ", "-"))[:20]
    else:
        rif = ""
    
    # Estensione
    ext = original_extension if original_extension.startswith('.') else f".{original_extension}"
    
    # Costruisci nome file
    if rif:
        return f"{date_str}_{tipo}_{cliente}_{rif}{ext}"
    else:
        return f"{date_str}_{tipo}_{cliente}{ext}"


async def search_documents_semantic(
    query: str,
    documents: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Ricerca semantica nei documenti usando AI.
    Restituisce documenti ordinati per rilevanza.
    """
    
    api_key = get_emergent_key()
    if not api_key:
        # Fallback a ricerca testuale semplice
        query_lower = query.lower()
        results = []
        for doc in documents:
            score = 0
            title = (doc.get("title") or "").lower()
            desc = (doc.get("description") or "").lower()
            category = (doc.get("category") or "").lower()
            tags = " ".join(doc.get("tags") or []).lower()
            ai_desc = (doc.get("ai_description") or "").lower()
            
            # Calcola score semplice
            for word in query_lower.split():
                if word in title:
                    score += 10
                if word in desc:
                    score += 5
                if word in category:
                    score += 3
                if word in tags:
                    score += 4
                if word in ai_desc:
                    score += 6
            
            if score > 0:
                results.append({**doc, "relevance_score": score})
        
        return sorted(results, key=lambda x: x.get("relevance_score", 0), reverse=True)
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Prepara lista documenti per AI
        docs_info = []
        for i, doc in enumerate(documents[:50]):  # Limita a 50 documenti
            docs_info.append({
                "index": i,
                "title": doc.get("title", ""),
                "description": doc.get("description", ""),
                "category": doc.get("category", ""),
                "tags": doc.get("tags", []),
                "ai_description": doc.get("ai_description", "")
            })
        
        import json
        prompt = f"""Data la seguente query di ricerca e lista di documenti, restituisci gli indici dei documenti più rilevanti ordinati per pertinenza.

QUERY: "{query}"

DOCUMENTI:
{json.dumps(docs_info, ensure_ascii=False, indent=2)}

Rispondi SOLO con un array JSON di numeri (indici) dei documenti rilevanti, ordinati dal più rilevante al meno rilevante.
Se nessun documento è rilevante, rispondi con un array vuoto [].
Esempio: [3, 1, 7, 0]"""

        llm_chat = LlmChat(
            api_key=api_key,
            session_id="doc_search",
            system_message="Sei un assistente che aiuta a trovare documenti pertinenti a una ricerca. Rispondi solo con JSON."
        ).with_model("openai", "gpt-4o-mini")
        
        response = await llm_chat.send_message(UserMessage(text=prompt))
        response_text = response.message.strip() if hasattr(response, 'message') else str(response).strip()
        
        # Parse indices
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
        
        indices = json.loads(response_text)
        
        # Restituisci documenti nell'ordine di rilevanza
        results = []
        for idx in indices:
            if 0 <= idx < len(documents):
                doc = documents[idx]
                doc["relevance_score"] = len(indices) - indices.index(idx)
                results.append(doc)
        
        return results
        
    except Exception as e:
        logger.error(f"Errore ricerca semantica: {e}")
        # Fallback a ricerca semplice
        return [doc for doc in documents if query.lower() in (doc.get("title", "") + doc.get("description", "")).lower()]
