import requests
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.session import get_db
from backend.db.models import Task, Document, ModelConfiguration, Conversation, Output, AuditLog
from ai.config import get_ollama_base_url
from plugins.manager import get_plugin_manager
from backend.api.v1.rag import get_rag_retriever

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    failed_tasks = db.query(Task).filter(Task.status == "failed").count()
    pending_tasks = db.query(Task).filter(Task.status.in_(["queued", "executing", "analyzing"])).count()
    
    total_conversations = db.query(Conversation).count()
    total_documents = db.query(Document).count()
    indexed_documents = db.query(Document).filter(Document.indexed == True).count()
    total_outputs = db.query(Output).count()
    
    # Query Ollama for live status and installed models
    base_url = get_ollama_base_url()
    ollama_models_count = 0
    ollama_online = False
    installed_models = []
    try:
        res = requests.get(f"{base_url}/api/tags", timeout=2)
        if res.status_code == 200:
            ollama_online = True
            installed_models = [m.get("name") for m in res.json().get("models", [])]
            ollama_models_count = len(installed_models)
    except Exception:
        pass

    # Active model from general role or first installed
    active_model = None
    gen_config = db.query(ModelConfiguration).filter(
        ModelConfiguration.capability == "general",
        ModelConfiguration.enabled == True
    ).first()
    if gen_config:
        active_model = gen_config.model_name
    elif installed_models:
        active_model = installed_models[0]

    # Plugins count
    pm = get_plugin_manager()
    plugins_list = pm.list_plugins()
    plugins_installed = len(plugins_list)
    plugins_enabled = sum(1 for p in plugins_list if p.get("enabled", True))

    # RAG status
    rag_retriever = get_rag_retriever()
    rag_stats = rag_retriever.get_stats()
    rag_status = "READY" if (total_documents > 0 and rag_stats["total_chunks"] > 0) else ("STANDBY" if total_documents > 0 else "NOT CONFIGURED")

    recent_tasks = (
        db.query(Task)
        .order_by(desc(Task.created_at))
        .limit(6)
        .all()
    )

    recent_logs = (
        db.query(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .limit(6)
        .all()
    )

    return {
        "metrics": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
            "pending_tasks": pending_tasks,
            "total_conversations": total_conversations,
            "total_documents": total_documents,
            "indexed_documents": indexed_documents,
            "total_outputs": total_outputs,
            "configured_models": db.query(ModelConfiguration).filter(ModelConfiguration.enabled == True).count(),
            "detected_models": ollama_models_count,
            "installed_models": installed_models,
            "active_model": active_model,
            "ollama_online": ollama_online,
            "local_ai_status": "ONLINE" if ollama_online else "OFFLINE",
            "rag_status": rag_status,
            "rag_chunks": rag_stats["total_chunks"],
            "plugins_installed": plugins_installed,
            "plugins_enabled": plugins_enabled
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
        ],
        "recent_activity": [
            {
                "id": a.id,
                "action": a.action,
                "details": a.details,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in recent_logs
        ]
    }

