# Routes package
from .auth import router as auth_router
from .clients import router as clients_router
from .documents import router as documents_router
from .employees import router as employees_router
from .consulenti import router as consulenti_router
from .fees import router as fees_router
from .admin import router as admin_router

__all__ = [
    "auth_router",
    "clients_router", 
    "documents_router",
    "employees_router",
    "consulenti_router",
    "fees_router",
    "admin_router"
]
