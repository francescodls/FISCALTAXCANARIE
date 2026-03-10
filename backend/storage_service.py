"""
Servizio Storage Cloud per Fiscal Tax Canarie
Utilizza Backblaze B2 per salvare documenti in modo sicuro e scalabile
"""
import os
import io
import logging
import uuid
from typing import Optional, Tuple, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Backblaze B2 configuration
B2_KEY_ID = os.environ.get("B2_KEY_ID")
B2_APPLICATION_KEY = os.environ.get("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.environ.get("B2_BUCKET_NAME", "fiscaltaxcanarie")

# Module-level B2 objects (initialized once)
_b2_api = None
_b2_bucket = None

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


def init_b2_storage():
    """
    Initialize Backblaze B2 connection.
    Call ONCE at startup. Returns bucket object.
    """
    global _b2_api, _b2_bucket
    
    if _b2_bucket:
        return _b2_bucket
    
    if not B2_KEY_ID or not B2_APPLICATION_KEY:
        logger.warning("Backblaze B2 credentials not set - cloud storage disabled")
        return None
    
    try:
        from b2sdk.v2 import B2Api, InMemoryAccountInfo
        
        info = InMemoryAccountInfo()
        _b2_api = B2Api(info)
        _b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
        
        # Get or create bucket
        try:
            _b2_bucket = _b2_api.get_bucket_by_name(B2_BUCKET_NAME)
        except Exception:
            # Bucket doesn't exist, create it
            _b2_bucket = _b2_api.create_bucket(B2_BUCKET_NAME, "allPrivate")
        
        logger.info(f"Backblaze B2 initialized successfully - Bucket: {B2_BUCKET_NAME}")
        return _b2_bucket
        
    except Exception as e:
        logger.error(f"Failed to initialize Backblaze B2: {e}")
        return None


def is_storage_enabled() -> bool:
    """Check if cloud storage is available"""
    return init_b2_storage() is not None


def get_content_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")


def generate_storage_path(client_id: str, filename: str, folder: str = "documents") -> str:
    """
    Generate a unique storage path for a file.
    Format: {folder}/{client_id}/{uuid}_{filename}
    """
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-").strip()
    return f"{folder}/{client_id}/{unique_id}_{safe_filename}"


async def upload_file(
    file_data: bytes,
    client_id: str,
    original_filename: str,
    folder: str = "documents"
) -> Dict[str, Any]:
    """
    Upload a file to Backblaze B2.
    
    Args:
        file_data: File content in bytes
        client_id: ID of the client the file belongs to
        original_filename: Original name of the file
        folder: Storage folder (documents, payslips, backups, certificates)
    
    Returns:
        Dict with storage_path, size, file_id, or error
    """
    bucket = init_b2_storage()
    
    if not bucket:
        return {
            "success": False,
            "error": "Cloud storage not configured",
            "fallback": "base64"
        }
    
    try:
        path = generate_storage_path(client_id, original_filename, folder)
        content_type = get_content_type(original_filename)
        
        # Upload to B2
        file_info = bucket.upload_bytes(
            data_bytes=file_data,
            file_name=path,
            content_type=content_type
        )
        
        logger.info(f"File uploaded to B2: {path} ({len(file_data)} bytes)")
        
        return {
            "success": True,
            "storage_path": path,
            "file_id": file_info.id_,
            "size": len(file_data),
            "content_type": content_type,
            "download_url": f"https://f002.backblazeb2.com/file/{B2_BUCKET_NAME}/{path}"
        }
        
    except Exception as e:
        logger.error(f"Upload to B2 failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback": "base64"
        }


async def download_file(storage_path: str) -> Tuple[Optional[bytes], str]:
    """
    Download a file from Backblaze B2.
    
    Args:
        storage_path: Path in B2 storage
    
    Returns:
        Tuple of (file_bytes, content_type) or (None, error_message)
    """
    bucket = init_b2_storage()
    
    if not bucket:
        return None, "Cloud storage not configured"
    
    try:
        # Download file
        downloaded_file = bucket.download_file_by_name(storage_path)
        
        # Read content
        output = io.BytesIO()
        downloaded_file.save(output)
        output.seek(0)
        
        content_type = get_content_type(storage_path)
        return output.read(), content_type
        
    except Exception as e:
        logger.error(f"Download from B2 failed for {storage_path}: {e}")
        return None, str(e)


async def delete_file(storage_path: str) -> Dict[str, Any]:
    """
    Delete a file from Backblaze B2.
    
    Args:
        storage_path: Path in B2 storage
    
    Returns:
        Dict with success status
    """
    bucket = init_b2_storage()
    
    if not bucket:
        return {"success": False, "error": "Cloud storage not configured"}
    
    try:
        # Get file version
        file_version = bucket.get_file_info_by_name(storage_path)
        
        # Delete file
        bucket.delete_file_version(file_version.id_, storage_path)
        
        logger.info(f"File deleted from B2: {storage_path}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Delete from B2 failed for {storage_path}: {e}")
        return {"success": False, "error": str(e)}


async def list_files(prefix: str = "", max_files: int = 1000) -> Dict[str, Any]:
    """
    List files in Backblaze B2.
    
    Args:
        prefix: Filter by path prefix (e.g., "documents/client_id/")
        max_files: Maximum number of files to return
    
    Returns:
        Dict with list of files
    """
    bucket = init_b2_storage()
    
    if not bucket:
        return {"success": False, "error": "Cloud storage not configured", "files": []}
    
    try:
        files = []
        for file_version, _ in bucket.ls(folder_to_list=prefix, latest_only=True, recursive=True):
            files.append({
                "name": file_version.file_name,
                "size": file_version.size,
                "content_type": file_version.content_type,
                "upload_timestamp": file_version.upload_timestamp,
                "file_id": file_version.id_
            })
            if len(files) >= max_files:
                break
        
        return {"success": True, "files": files, "count": len(files)}
        
    except Exception as e:
        logger.error(f"List files from B2 failed: {e}")
        return {"success": False, "error": str(e), "files": []}


async def get_storage_stats() -> Dict[str, Any]:
    """
    Get storage statistics from Backblaze B2.
    """
    bucket = init_b2_storage()
    
    if not bucket:
        return {
            "storage_enabled": False,
            "storage_provider": "Non configurato"
        }
    
    try:
        # Count files by folder
        docs = await list_files(prefix="documents/", max_files=10000)
        payslips = await list_files(prefix="payslips/", max_files=10000)
        backups = await list_files(prefix="backups/", max_files=100)
        
        total_size = sum(f["size"] for f in docs.get("files", []))
        total_size += sum(f["size"] for f in payslips.get("files", []))
        
        return {
            "storage_enabled": True,
            "storage_provider": "Backblaze B2",
            "bucket_name": B2_BUCKET_NAME,
            "statistics": {
                "documents_count": docs.get("count", 0),
                "payslips_count": payslips.get("count", 0),
                "backups_count": backups.get("count", 0),
                "total_files": docs.get("count", 0) + payslips.get("count", 0),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_size_gb": round(total_size / (1024 * 1024 * 1024), 3)
            }
        }
        
    except Exception as e:
        logger.error(f"Get storage stats failed: {e}")
        return {
            "storage_enabled": True,
            "storage_provider": "Backblaze B2",
            "error": str(e)
        }


async def upload_backup(
    backup_data: bytes,
    backup_name: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Upload a backup file to Backblaze B2.
    """
    return await upload_file(
        file_data=backup_data,
        client_id=user_id,
        original_filename=backup_name,
        folder="backups"
    )
