"""
Servizio Storage Cloud per Fiscal Tax Canarie
Utilizza Emergent Object Storage per salvare documenti in modo sicuro e scalabile
"""
import os
import logging
import requests
import uuid
from typing import Optional, Tuple, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Storage API configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "fiscal-tax-canarie"

# Module-level storage key (initialized once)
_storage_key: Optional[str] = None

# MIME types mapping
MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "json": "application/json",
    "csv": "text/csv",
    "txt": "text/plain",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "zip": "application/zip",
    "p12": "application/x-pkcs12"
}


def get_emergent_key() -> Optional[str]:
    """Get Emergent LLM key from environment"""
    return os.environ.get("EMERGENT_LLM_KEY")


def init_storage() -> Optional[str]:
    """
    Initialize storage and get storage key.
    Call ONCE at startup. Returns a session-scoped, reusable storage_key.
    """
    global _storage_key
    
    if _storage_key:
        return _storage_key
    
    emergent_key = get_emergent_key()
    if not emergent_key:
        logger.warning("EMERGENT_LLM_KEY not set - cloud storage disabled")
        return None
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": emergent_key},
            timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Cloud storage initialized successfully")
        return _storage_key
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}")
        return None


def is_storage_enabled() -> bool:
    """Check if cloud storage is available"""
    return init_storage() is not None


def get_content_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")


def generate_storage_path(client_id: str, filename: str, folder: str = "documents") -> str:
    """
    Generate a unique storage path for a file.
    Format: {app_name}/{folder}/{client_id}/{uuid}.{ext}
    """
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    unique_id = str(uuid.uuid4())
    return f"{APP_NAME}/{folder}/{client_id}/{unique_id}.{ext}"


async def upload_file(
    file_data: bytes,
    client_id: str,
    original_filename: str,
    folder: str = "documents"
) -> Dict[str, Any]:
    """
    Upload a file to cloud storage.
    
    Args:
        file_data: File content in bytes
        client_id: ID of the client the file belongs to
        original_filename: Original name of the file
        folder: Storage folder (documents, payslips, backups, certificates)
    
    Returns:
        Dict with storage_path, size, etag, or error
    """
    storage_key = init_storage()
    
    if not storage_key:
        return {
            "success": False,
            "error": "Cloud storage not configured",
            "fallback": "base64"  # Signal to use MongoDB fallback
        }
    
    try:
        path = generate_storage_path(client_id, original_filename, folder)
        content_type = get_content_type(original_filename)
        
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={
                "X-Storage-Key": storage_key,
                "Content-Type": content_type
            },
            data=file_data,
            timeout=120
        )
        resp.raise_for_status()
        result = resp.json()
        
        logger.info(f"File uploaded to cloud: {path}")
        
        return {
            "success": True,
            "storage_path": result.get("path", path),
            "size": result.get("size", len(file_data)),
            "etag": result.get("etag"),
            "content_type": content_type
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback": "base64"
        }


async def download_file(storage_path: str) -> Tuple[Optional[bytes], str]:
    """
    Download a file from cloud storage.
    
    Args:
        storage_path: Path in cloud storage
    
    Returns:
        Tuple of (file_bytes, content_type) or (None, error_message)
    """
    storage_key = init_storage()
    
    if not storage_key:
        return None, "Cloud storage not configured"
    
    try:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{storage_path}",
            headers={"X-Storage-Key": storage_key},
            timeout=60
        )
        resp.raise_for_status()
        
        content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return resp.content, content_type
        
    except Exception as e:
        logger.error(f"Download failed for {storage_path}: {e}")
        return None, str(e)


async def upload_backup(
    backup_data: bytes,
    backup_name: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Upload a backup file to cloud storage.
    
    Args:
        backup_data: Backup content (ZIP file)
        backup_name: Name of the backup
        user_id: ID of the user creating the backup
    
    Returns:
        Dict with storage_path and metadata
    """
    return await upload_file(
        file_data=backup_data,
        client_id=user_id,
        original_filename=backup_name,
        folder="backups"
    )


async def get_storage_stats(client_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get storage statistics.
    Note: Since we can't list files from storage, this returns DB-based stats.
    """
    return {
        "storage_enabled": is_storage_enabled(),
        "storage_provider": "Emergent Object Storage" if is_storage_enabled() else "MongoDB (fallback)"
    }
