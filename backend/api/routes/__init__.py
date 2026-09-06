from fastapi import APIRouter
from backend.api.routes.health import router as health_router
from backend.api.routes.models import router as models_router
from backend.api.routes.tasks import router as tasks_router

router = APIRouter()

router.include_router(health_router, tags=["health"])
router.include_router(models_router, prefix="/api/models", tags=["models"])
router.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])
