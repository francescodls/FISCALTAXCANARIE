"""
Security Module - Hardening & Protection
=========================================
Modulo centralizzato per la sicurezza dell'applicazione Fiscal Tax Canarie.

Include:
- Rate limiting
- Brute force protection
- File upload validation
- Security headers
- Audit logging
- Password policy
- Session security
"""

import os
import re
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from functools import wraps
import logging

from fastapi import Request, HTTPException, status
from fastapi.responses import Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

# Configure security logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# ==================== CONSTANTS ====================

# Admin domain - NEVER CHANGE THIS
ADMIN_ALLOWED_DOMAIN = "fiscaltaxcanarie.com"

# Allowed admin roles
ADMIN_ROLES = ["super_admin", "admin", "commercialista"]

# Password policy
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = False  # Optional for now

# Rate limiting settings
RATE_LIMIT_LOGIN = "20/minute"
RATE_LIMIT_REGISTER = "3/minute"
RATE_LIMIT_PASSWORD_RESET = "3/minute"
RATE_LIMIT_ADMIN_INVITE = "10/minute"
RATE_LIMIT_UPLOAD = "20/minute"
RATE_LIMIT_EXPORT = "5/minute"
RATE_LIMIT_DEFAULT = "100/minute"

# Brute force protection
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

# File upload security
ALLOWED_DOCUMENT_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.txt', '.rtf', '.odt', '.ods'
}

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}

ALLOWED_MIME_TYPES = {
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    # Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
}

# Max file sizes (in bytes)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB for documents
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5MB for images

# Dangerous patterns in filenames
DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
    '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf',
    '.msc', '.msi', '.msp', '.reg', '.dll', '.sys',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.sh',
    '.pl', '.cgi', '.htaccess', '.htpasswd'
}

# Security headers
SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
}

# CSP Policy
CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "img-src 'self' data: https: blob:; "
    "connect-src 'self' https://*.fiscaltaxcanarie.com https://*.emergentagent.com; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self';"
)

# ==================== RATE LIMITER ====================

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

def get_client_ip(request: Request) -> str:
    """Extract real client IP from request, considering proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"

# In-memory storage for login attempts (use Redis in production)
_login_attempts: Dict[str, Dict[str, Any]] = {}

def record_login_attempt(ip: str, email: str, success: bool):
    """Record a login attempt for brute force protection."""
    key = f"{ip}:{email}"
    now = datetime.now(timezone.utc)
    
    if key not in _login_attempts:
        _login_attempts[key] = {"attempts": 0, "first_attempt": now, "locked_until": None}
    
    record = _login_attempts[key]
    
    # Reset if lockout expired
    if record["locked_until"] and now > record["locked_until"]:
        record["attempts"] = 0
        record["locked_until"] = None
        record["first_attempt"] = now
    
    # Reset if window expired (15 minutes)
    if now - record["first_attempt"] > timedelta(minutes=LOGIN_LOCKOUT_MINUTES):
        record["attempts"] = 0
        record["first_attempt"] = now
    
    if success:
        # Reset on successful login
        record["attempts"] = 0
        record["locked_until"] = None
    else:
        record["attempts"] += 1
        if record["attempts"] >= MAX_LOGIN_ATTEMPTS:
            record["locked_until"] = now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
            security_logger.warning(
                f"BRUTE_FORCE_LOCKOUT: IP={ip}, email={email}, attempts={record['attempts']}"
            )

def is_login_locked(ip: str, email: str) -> tuple[bool, int]:
    """Check if login is locked due to too many attempts."""
    key = f"{ip}:{email}"
    now = datetime.now(timezone.utc)
    
    if key not in _login_attempts:
        return False, 0
    
    record = _login_attempts[key]
    
    if record["locked_until"] and now < record["locked_until"]:
        remaining = int((record["locked_until"] - now).total_seconds())
        return True, remaining
    
    return False, 0

# ==================== PASSWORD POLICY ====================

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password against security policy.
    Returns (is_valid, error_message).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"La password deve essere di almeno {PASSWORD_MIN_LENGTH} caratteri"
    
    if PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "La password deve contenere almeno una lettera maiuscola"
    
    if PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "La password deve contenere almeno una lettera minuscola"
    
    if PASSWORD_REQUIRE_DIGIT and not re.search(r'\d', password):
        return False, "La password deve contenere almeno un numero"
    
    if PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "La password deve contenere almeno un carattere speciale"
    
    # Check for common weak passwords
    weak_passwords = [
        'password', '12345678', 'qwerty123', 'admin123', 'letmein',
        'welcome1', 'monkey123', 'dragon123', 'master123', 'login123'
    ]
    if password.lower() in weak_passwords:
        return False, "Questa password è troppo comune. Scegline una più sicura"
    
    return True, ""

# ==================== ADMIN DOMAIN VALIDATION ====================

def is_valid_admin_email(email: str) -> bool:
    """
    CRITICAL SECURITY CHECK: Verify email belongs to allowed admin domain.
    This is the primary gate for admin access.
    """
    if not email:
        return False
    
    email_lower = email.lower().strip()
    domain = email_lower.split('@')[-1] if '@' in email_lower else ''
    
    return domain == ADMIN_ALLOWED_DOMAIN

def validate_admin_access(email: str, role: str) -> tuple[bool, str]:
    """
    Validate that a user can have admin privileges.
    Returns (is_valid, error_message).
    """
    if role not in ADMIN_ROLES:
        return True, ""  # Non-admin role, no domain restriction
    
    if not is_valid_admin_email(email):
        security_logger.warning(
            f"ADMIN_ACCESS_DENIED: Attempted admin access with non-allowed email: {email}"
        )
        return False, f"Accesso amministratore consentito solo per email @{ADMIN_ALLOWED_DOMAIN}"
    
    return True, ""

# ==================== FILE UPLOAD SECURITY ====================

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal and injection attacks.
    """
    if not filename:
        return f"file_{secrets.token_hex(8)}"
    
    # Remove path separators
    filename = filename.replace('/', '_').replace('\\', '_')
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Remove special characters except dots, hyphens, underscores
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent double extensions (e.g., file.pdf.exe)
    parts = safe_filename.rsplit('.', 1)
    if len(parts) == 2:
        name, ext = parts
        # Remove any additional dots from the name part
        name = name.replace('.', '_')
        safe_filename = f"{name}.{ext}"
    
    # Limit filename length
    if len(safe_filename) > 200:
        name, ext = safe_filename.rsplit('.', 1) if '.' in safe_filename else (safe_filename, '')
        safe_filename = f"{name[:190]}.{ext}" if ext else name[:200]
    
    return safe_filename

def validate_file_upload(
    filename: str,
    content_type: str,
    file_size: int,
    allowed_extensions: set = None,
    max_size: int = None
) -> tuple[bool, str]:
    """
    Comprehensive file upload validation.
    Returns (is_valid, error_message).
    """
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_DOCUMENT_EXTENSIONS
    if max_size is None:
        max_size = MAX_FILE_SIZE
    
    if not filename:
        return False, "Nome file mancante"
    
    # Check file size
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"File troppo grande. Dimensione massima: {max_mb:.0f}MB"
    
    # Get and validate extension
    filename_lower = filename.lower()
    ext = ''
    if '.' in filename_lower:
        ext = '.' + filename_lower.rsplit('.', 1)[-1]
    
    # Check for dangerous extensions anywhere in filename
    for dangerous_ext in DANGEROUS_EXTENSIONS:
        if dangerous_ext in filename_lower:
            security_logger.warning(f"DANGEROUS_FILE_BLOCKED: {filename}")
            return False, "Tipo di file non consentito per motivi di sicurezza"
    
    # Check double extensions
    if filename_lower.count('.') > 1:
        # Check if any intermediate extension is dangerous
        parts = filename_lower.split('.')
        for part in parts[1:-1]:  # Skip name and final extension
            if f'.{part}' in DANGEROUS_EXTENSIONS:
                security_logger.warning(f"DOUBLE_EXTENSION_BLOCKED: {filename}")
                return False, "Nome file con estensione doppia non consentito"
    
    # Validate extension
    if ext not in allowed_extensions:
        allowed_list = ', '.join(sorted(allowed_extensions))
        return False, f"Estensione file non consentita. Tipi permessi: {allowed_list}"
    
    # Validate MIME type
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        # Allow generic octet-stream as fallback
        if content_type != 'application/octet-stream':
            security_logger.warning(f"INVALID_MIME_TYPE: {filename} - {content_type}")
            return False, f"Tipo MIME non consentito: {content_type}"
    
    return True, ""

def generate_secure_filename(original_filename: str, prefix: str = "") -> str:
    """
    Generate a secure random filename while preserving the extension.
    """
    ext = ''
    if '.' in original_filename:
        ext = '.' + original_filename.rsplit('.', 1)[-1].lower()
    
    # Validate extension is safe
    if ext and ext in DANGEROUS_EXTENSIONS:
        ext = '.bin'  # Replace with safe extension
    
    random_name = secrets.token_hex(16)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    if prefix:
        return f"{prefix}_{timestamp}_{random_name}{ext}"
    return f"{timestamp}_{random_name}{ext}"

# ==================== SECURITY HEADERS MIDDLEWARE ====================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Skip X-Frame-Options for document preview endpoints (they need to be shown in iframe)
        is_preview_endpoint = "/preview" in request.url.path
        
        # Add security headers
        for header, value in SECURITY_HEADERS.items():
            # Skip X-Frame-Options for preview endpoints to allow iframe embedding
            if header == "X-Frame-Options" and is_preview_endpoint:
                continue
            response.headers[header] = value
        
        # For preview endpoints, allow same-origin framing
        if is_preview_endpoint:
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # Add CSP header (be careful with this in development)
        if os.environ.get('ENVIRONMENT') == 'production':
            response.headers["Content-Security-Policy"] = CSP_POLICY
        
        return response

# ==================== AUDIT LOGGING ====================

class AuditEvent:
    """Enum-like class for audit event types."""
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    
    # Admin
    ADMIN_INVITE_SENT = "admin_invite_sent"
    ADMIN_INVITE_ACCEPTED = "admin_invite_accepted"
    ADMIN_CREATED = "admin_created"
    ADMIN_DELETED = "admin_deleted"
    ADMIN_ROLE_CHANGED = "admin_role_changed"
    
    # Client
    CLIENT_REGISTERED = "client_registered"
    CLIENT_ACTIVATED = "client_activated"
    CLIENT_DELETED = "client_deleted"
    CLIENT_DATA_MODIFIED = "client_data_modified"
    
    # Documents
    DOCUMENT_UPLOADED = "document_uploaded"
    DOCUMENT_DOWNLOADED = "document_downloaded"
    DOCUMENT_DELETED = "document_deleted"
    DOCUMENT_ASSIGNED = "document_assigned"
    
    # Data
    DATA_EXPORTED = "data_exported"
    DECLARATION_CREATED = "declaration_created"
    DECLARATION_DELETED = "declaration_deleted"
    FEE_CREATED = "fee_created"
    FEE_MODIFIED = "fee_modified"
    FEE_DELETED = "fee_deleted"
    
    # Notifications
    NOTIFICATION_SENT = "notification_sent"
    BULK_NOTIFICATION_SENT = "bulk_notification_sent"
    
    # Security
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"

def log_security_event(
    event_type: str,
    user_id: Optional[str],
    user_email: Optional[str],
    user_role: Optional[str],
    ip_address: str,
    user_agent: str,
    details: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log a security-relevant event for audit purposes.
    """
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "user_id": user_id,
        "user_email": user_email,
        "user_role": user_role,
        "ip_address": ip_address,
        "user_agent": user_agent[:200] if user_agent else None,  # Truncate long user agents
        "details": details,
        "metadata": metadata or {}
    }
    
    # Log to security logger
    if event_type in [
        AuditEvent.LOGIN_FAILED, 
        AuditEvent.UNAUTHORIZED_ACCESS,
        AuditEvent.SUSPICIOUS_ACTIVITY,
        AuditEvent.RATE_LIMIT_EXCEEDED
    ]:
        security_logger.warning(f"SECURITY_EVENT: {log_entry}")
    else:
        security_logger.info(f"AUDIT_EVENT: {log_entry}")
    
    return log_entry

async def log_audit_to_db(db, event: dict):
    """
    Persist audit event to database for compliance and investigation.
    """
    try:
        event["_id"] = None  # Let MongoDB generate ID
        await db.audit_logs.insert_one(event)
    except Exception as e:
        security_logger.error(f"Failed to persist audit log: {e}")

# ==================== REQUEST VALIDATION ====================

def validate_redirect_url(url: str, allowed_domains: List[str] = None) -> bool:
    """
    Validate that a redirect URL is safe (prevents open redirect attacks).
    """
    if not url:
        return False
    
    if allowed_domains is None:
        allowed_domains = [
            'app.fiscaltaxcanarie.com',
            'fiscaltaxcanarie.com',
            'localhost',
            '127.0.0.1'
        ]
    
    # Allow relative URLs
    if url.startswith('/') and not url.startswith('//'):
        return True
    
    # Check against allowed domains
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Remove port if present
        if ':' in domain:
            domain = domain.split(':')[0]
        
        for allowed in allowed_domains:
            if domain == allowed or domain.endswith('.' + allowed):
                return True
        
        return False
    except:
        return False

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """
    Basic input sanitization to prevent injection attacks.
    """
    if not value:
        return ""
    
    # Truncate
    value = value[:max_length]
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Remove control characters except newlines and tabs
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
    
    return value.strip()

# ==================== IDOR PROTECTION ====================

def verify_resource_ownership(
    user_id: str,
    user_role: str,
    resource_owner_id: str,
    allow_admin: bool = True
) -> bool:
    """
    Verify that a user has access to a resource (IDOR protection).
    """
    # Admins can access all resources if allowed
    if allow_admin and user_role in ADMIN_ROLES:
        return True
    
    # Users can only access their own resources
    return user_id == resource_owner_id

# ==================== EXPORT ====================

__all__ = [
    # Constants
    'ADMIN_ALLOWED_DOMAIN',
    'ADMIN_ROLES',
    'ALLOWED_DOCUMENT_EXTENSIONS',
    'ALLOWED_IMAGE_EXTENSIONS',
    'MAX_FILE_SIZE',
    'MAX_IMAGE_SIZE',
    
    # Rate limiter
    'limiter',
    'RATE_LIMIT_LOGIN',
    'RATE_LIMIT_REGISTER',
    'RATE_LIMIT_PASSWORD_RESET',
    'RATE_LIMIT_ADMIN_INVITE',
    'RATE_LIMIT_UPLOAD',
    'RATE_LIMIT_EXPORT',
    
    # Brute force
    'record_login_attempt',
    'is_login_locked',
    'get_client_ip',
    
    # Password
    'validate_password_strength',
    
    # Admin validation
    'is_valid_admin_email',
    'validate_admin_access',
    
    # File upload
    'sanitize_filename',
    'validate_file_upload',
    'generate_secure_filename',
    
    # Middleware
    'SecurityHeadersMiddleware',
    
    # Audit
    'AuditEvent',
    'log_security_event',
    'log_audit_to_db',
    
    # Validation
    'validate_redirect_url',
    'sanitize_input',
    'verify_resource_ownership',
]
