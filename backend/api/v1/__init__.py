from fastapi import APIRouter
from backend.api.v1.health import router as health_router
from backend.api.v1.tasks import router as tasks_router
from backend.api.v1.documents import router as documents_router
from backend.api.v1.models import router as models_router
from backend.api.v1.files import router as files_router
from backend.api.v1.audit_logs import router as audit_logs_router
from backend.api.v1.dashboard import router as dashboard_router
from backend.api.v1.chat import router as chat_router
from backend.api.v1.rag import router as rag_router
from backend.api.v1.plugins import router as plugins_router
from backend.api.v1.outputs import router as outputs_router

router = APIRouter()

router.include_router(health_router, tags=["health"])
router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
router.include_router(chat_router, prefix="/chat", tags=["chat"])
router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
router.include_router(documents_router, prefix="/documents", tags=["documents"])
router.include_router(rag_router, prefix="/rag", tags=["rag"])
router.include_router(models_router, prefix="/models", tags=["models"])
router.include_router(plugins_router, prefix="/plugins", tags=["plugins"])
router.include_router(outputs_router, prefix="/outputs", tags=["outputs"])
router.include_router(files_router, prefix="/files", tags=["files"])
router.include_router(audit_logs_router, prefix="/audit-logs", tags=["audit-logs"])

