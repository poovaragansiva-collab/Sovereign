import requests
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.session import get_db
from backend.db.models import Task, Document, ModelConfiguration
from ai.config import get_ollama_base_url

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    failed_tasks = db.query(Task).filter(Task.status == "failed").count()
    pending_tasks = db.query(Task).filter(Task.status.in_(["queued", "executing", "analyzing"])).count()
    total_documents = db.query(Document).count()
    configured_models = db.query(ModelConfiguration).filter(ModelConfiguration.enabled == True).count()

    # Query Ollama for live model count
    base_url = get_ollama_base_url()
    ollama_models_count = 0
    ollama_online = False
    try:
        res = requests.get(f"{base_url}/api/tags", timeout=2)
        if res.status_code == 200:
            ollama_online = True
            ollama_models_count = len(res.json().get("models", []))
    except Exception:
        pass

    recent_tasks = (
        db.query(Task)
        .order_by(desc(Task.created_at))
        .limit(10)
        .all()
    )

    return {
        "metrics": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
            "pending_tasks": pending_tasks,
            "total_documents": total_documents,
            "configured_models": configured_models,
            "detected_models": ollama_models_count,
            "ollama_online": ollama_online
        },
        "recent_tasks": [
            {
                "task_id": t.task_id,
                "task": t.task,
                "capability": t.capability,
                "status": t.status,
                "model_used": t.model_used,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in recent_tasks
        ]
    }
