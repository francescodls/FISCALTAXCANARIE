"""
Assistente AI Chatbot per clienti
Risponde a domande su documenti, scadenze e modelli tributari
"""
import os
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from pathlib import Path

# Carica .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

def get_emergent_key():
    """Ottiene la chiave Emergent in modo lazy"""
    return os.environ.get('EMERGENT_LLM_KEY', '')

SYSTEM_PROMPT = """Sei l'assistente virtuale di Fiscal Tax Canarie, uno studio di commercialisti alle Isole Canarie (Spagna).

Il tuo ruolo è:
- Rispondere a domande generali sui modelli tributari spagnoli e canari
- Spiegare scadenze fiscali e adempimenti
- Aiutare i clienti a capire i loro documenti
- Fornire informazioni sui servizi dello studio

REGOLE IMPORTANTI:
1. Rispondi SEMPRE in italiano
2. Sii professionale ma amichevole
3. NON dare consigli fiscali specifici - suggerisci sempre di contattare il commercialista per questioni complesse
4. Se non sei sicuro di qualcosa, dillo chiaramente
5. Ricorda che le Isole Canarie hanno un regime fiscale speciale (IGIC invece di IVA, ZEC, etc.)
6. Mantieni le risposte concise ma complete

DISCLAIMER: Le tue risposte sono informative e non sostituiscono la consulenza professionale del commercialista.

CONTATTI STUDIO:
- Email: info@fiscaltaxcanarie.com
- Telefono: +34 658 071 848
"""

async def chat_with_assistant(
    user_message: str,
    client_name: str,
    conversation_history: List[Dict[str, str]] = None,
    client_documents: List[str] = None,
    client_deadlines: List[str] = None,
    modelli_tributari: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Gestisce una conversazione con l'assistente AI
    
    Args:
        user_message: Messaggio dell'utente
        client_name: Nome del cliente
        conversation_history: Storico conversazione [{role, content}]
        client_documents: Lista titoli documenti del cliente
        client_deadlines: Lista scadenze del cliente
        modelli_tributari: Lista modelli tributari disponibili
    
    Returns:
        Dict con risposta e metadata
    """
    
    api_key = get_emergent_key()
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY non configurata")
        return {
            "success": False,
            "error": "Assistente AI non disponibile",
            "response": "Mi dispiace, l'assistente non è disponibile al momento. Contatta lo studio al +34 658 071 848."
        }
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Costruisci contesto personalizzato
        context_parts = [f"Stai parlando con {client_name}."]
        
        if client_documents:
            context_parts.append(f"\nDocumenti del cliente: {', '.join(client_documents[:10])}")
        
        if client_deadlines:
            context_parts.append(f"\nScadenze del cliente: {', '.join(client_deadlines[:5])}")
        
        if modelli_tributari:
            modelli_info = "\n\nMODELLI TRIBUTARI DISPONIBILI:"
            for m in modelli_tributari[:8]:
                modelli_info += f"\n- {m.get('codice', '')}: {m.get('nome', '')} ({m.get('periodicita', '')})"
            context_parts.append(modelli_info)
        
        personalized_context = "\n".join(context_parts)
        full_system_message = SYSTEM_PROMPT + "\n\n" + personalized_context
        
        # Costruisci cronologia conversazione come stringa di contesto
        history_context = ""
        if conversation_history:
            for msg in conversation_history[-6:]:
                role_label = "Cliente" if msg["role"] == "user" else "Assistente"
                history_context += f"\n{role_label}: {msg['content']}"
        
        if history_context:
            full_system_message += f"\n\nCronologia conversazione precedente:{history_context}\n\nRispondi al prossimo messaggio del cliente:"
        
        # Crea chat instance
        llm_chat = LlmChat(
            api_key=api_key,
            session_id=f"fiscal_tax_{client_name}",
            system_message=full_system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Invia messaggio
        response = await llm_chat.send_message(UserMessage(text=user_message))
        
        assistant_response = response.message.strip() if hasattr(response, 'message') else str(response).strip()
        
        return {
            "success": True,
            "response": assistant_response,
            "model": "gpt-4o-mini"
        }
        
    except Exception as e:
        logger.error(f"Errore chatbot AI: {e}")
        return {
            "success": False,
            "error": str(e),
            "response": "Mi dispiace, si è verificato un errore. Riprova o contatta lo studio al +34 658 071 848."
        }

async def get_quick_answer(question: str, modelli_tributari: List[Dict[str, Any]] = None) -> str:
    """
    Risposta rapida per domande frequenti senza contesto cliente
    """
    result = await chat_with_assistant(
        user_message=question,
        client_name="Utente",
        modelli_tributari=modelli_tributari
    )
    return result.get("response", "Mi dispiace, non sono riuscito a elaborare la richiesta.")
