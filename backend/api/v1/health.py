import requests
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import ModelConfiguration, Task, Document
from ai.config import get_ollama_base_url

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "sovereign-api"
    }

@router.get("/health/system")
def system_health(db: Session = Depends(get_db)):
    base_url = get_ollama_base_url()
    ollama_online = False
    discovered_models = []
    
    try:
        res = requests.get(f"{base_url}/api/tags", timeout=2)
        if res.status_code == 200:
            ollama_online = True
            discovered_models = [m.get("name") for m in res.json().get("models", [])]
    except Exception:
        pass

    configured_count = db.query(ModelConfiguration).count()
    task_count = db.query(Task).count()
    doc_count = db.query(Document).count()

    return {
        "status": "online" if ollama_online else "degraded",
        "ollama": {
            "online": ollama_online,
            "base_url": base_url,
            "models_detected": len(discovered_models)
        },
        "database": {
            "tasks_count": task_count,
            "documents_count": doc_count,
            "configured_models_count": configured_count
        }
    }
