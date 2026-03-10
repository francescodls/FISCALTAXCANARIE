"""
Servizio per Backblaze B2 Cloud Storage
Gestisce upload, download e eliminazione file
"""
import os
import logging
from typing import Optional, Dict, Any
from b2sdk.v2 import InMemoryAccountInfo, B2Api
from b2sdk.v2.exception import B2Error

logger = logging.getLogger(__name__)

# Configurazione B2
B2_KEY_ID = os.environ.get("B2_KEY_ID")
B2_APPLICATION_KEY = os.environ.get("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.environ.get("B2_BUCKET_NAME", "fiscaltaxcanarie")

# Istanza globale B2 API
_b2_api: Optional[B2Api] = None
_b2_bucket = None

def is_b2_configured() -> bool:
    """Verifica se Backblaze B2 è configurato"""
    return bool(B2_KEY_ID and B2_APPLICATION_KEY and B2_BUCKET_NAME)

def get_b2_api():
    """Ottiene l'istanza B2 API (singleton)"""
    global _b2_api, _b2_bucket
    
    if not is_b2_configured():
        logger.warning("Backblaze B2 non configurato. Usa storage locale MongoDB.")
        return None, None
    
    if _b2_api is None:
        try:
            info = InMemoryAccountInfo()
            _b2_api = B2Api(info)
            _b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
            _b2_bucket = _b2_api.get_bucket_by_name(B2_BUCKET_NAME)
            logger.info(f"Connesso a Backblaze B2 bucket: {B2_BUCKET_NAME}")
        except B2Error as e:
            logger.error(f"Errore connessione B2: {e}")
            return None, None
    
    return _b2_api, _b2_bucket

async def upload_file_to_b2(
    file_data: bytes,
    file_name: str,
    client_id: str,
    doc_type: str = "documents",
    content_type: str = "application/pdf"
) -> Dict[str, Any]:
    """
    Carica un file su Backblaze B2
    
    Args:
        file_data: Contenuto del file in bytes
        file_name: Nome del file
        client_id: ID del cliente proprietario
        doc_type: Tipo documento (documents, payslips, etc.)
        content_type: MIME type del file
    
    Returns:
        Dict con storage_path, file_id, download_url
    """
    api, bucket = get_b2_api()
    
    if not api or not bucket:
        return {"success": False, "error": "B2 non configurato"}
    
    try:
        # Costruisci il path: clients/{client_id}/{doc_type}/{file_name}
        storage_path = f"clients/{client_id}/{doc_type}/{file_name}"
        
        # Upload del file
        file_version = bucket.upload_bytes(
            data_bytes=file_data,
            file_name=storage_path,
            content_type=content_type
        )
        
        # Genera URL di download
        download_url = api.get_download_url_for_fileid(file_version.id_)
        
        logger.info(f"File caricato su B2: {storage_path}")
        
        return {
            "success": True,
            "storage_path": storage_path,
            "file_id": file_version.id_,
            "download_url": download_url,
            "file_size": len(file_data)
        }
    
    except B2Error as e:
        logger.error(f"Errore upload B2: {e}")
        return {"success": False, "error": str(e)}

async def download_file_from_b2(storage_path: str) -> Optional[bytes]:
    """
    Scarica un file da Backblaze B2
    
    Args:
        storage_path: Path del file su B2
    
    Returns:
        Contenuto del file in bytes o None se errore
    """
    api, bucket = get_b2_api()
    
    if not api or not bucket:
        return None
    
    try:
        downloaded_file = bucket.download_file_by_name(storage_path)
        file_content = downloaded_file.response.content
        logger.info(f"File scaricato da B2: {storage_path}")
        return file_content
    
    except B2Error as e:
        logger.error(f"Errore download B2: {e}")
        return None

async def delete_file_from_b2(storage_path: str, file_id: Optional[str] = None) -> bool:
    """
    Elimina un file da Backblaze B2
    
    Args:
        storage_path: Path del file su B2
        file_id: ID del file (opzionale, se non fornito cerca per nome)
    
    Returns:
        True se eliminato con successo
    """
    api, bucket = get_b2_api()
    
    if not api or not bucket:
        return False
    
    try:
        if file_id:
            # Elimina per file_id
            api.delete_file_version(file_id, storage_path)
        else:
            # Cerca il file e elimina
            file_version = bucket.get_file_info_by_name(storage_path)
            api.delete_file_version(file_version.id_, storage_path)
        
        logger.info(f"File eliminato da B2: {storage_path}")
        return True
    
    except B2Error as e:
        logger.error(f"Errore eliminazione B2: {e}")
        return False

async def get_file_url(storage_path: str, valid_duration_seconds: int = 3600) -> Optional[str]:
    """
    Genera un URL temporaneo per accedere a un file
    
    Args:
        storage_path: Path del file su B2
        valid_duration_seconds: Durata validità URL (default 1 ora)
    
    Returns:
        URL temporaneo o None se errore
    """
    api, bucket = get_b2_api()
    
    if not api or not bucket:
        return None
    
    try:
        # Genera URL autorizzato
        auth_token = bucket.get_download_authorization(
            file_name_prefix=storage_path,
            valid_duration_in_seconds=valid_duration_seconds
        )
        
        download_url = api.get_download_url_for_fileid(storage_path)
        return f"{download_url}?Authorization={auth_token}"
    
    except B2Error as e:
        logger.error(f"Errore generazione URL B2: {e}")
        return None

def get_b2_status() -> Dict[str, Any]:
    """Ottiene lo stato della connessione B2"""
    if not is_b2_configured():
        return {
            "configured": False,
            "status": "not_configured",
            "message": "Credenziali B2 mancanti"
        }
    
    api, bucket = get_b2_api()
    
    if not api or not bucket:
        return {
            "configured": True,
            "status": "error",
            "message": "Impossibile connettersi a B2"
        }
    
    return {
        "configured": True,
        "status": "connected",
        "bucket_name": B2_BUCKET_NAME,
        "message": "Connesso a Backblaze B2"
    }
