from typing import List, Dict, Any, Optional
from backend.db.session import SessionLocal, init_db as init_sqlalchemy_db
from backend.db.models import Task, ModelConfiguration

def init_db():
    """Initializes the database schema using SQLAlchemy ORM."""
    init_sqlalchemy_db()

def get_all_models() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(ModelConfiguration).all()
        return [{"name": r.model_name, "type": r.capability, "enabled": r.enabled} for r in rows]
    finally:
        db.close()

def save_models(models: List[Dict[str, Any]]):
    db = SessionLocal()
    try:
        db.query(ModelConfiguration).delete()
        for m in models:
            enabled = bool(m.get("enabled", True))
            if m.get("type"):
                entry = ModelConfiguration(
                    model_name=m["name"],
                    capability=m["type"],
                    enabled=enabled
                )
                db.add(entry)
        db.commit()
    finally:
        db.close()

def save_task(task_id: str, task: str, capability: str, model_used: str, status: str):
    db = SessionLocal()
    try:
        existing = db.query(Task).filter(Task.task_id == task_id).first()
        if existing:
            existing.task = task
            existing.capability = capability
            existing.model_used = model_used
            existing.status = status
        else:
            new_task = Task(
                task_id=task_id,
                task=task,
                capability=capability,
                model_used=model_used,
                status=status
            )
            db.add(new_task)
        db.commit()
    finally:
        db.close()

def get_tasks() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = db.query(Task).order_by(Task.created_at.desc()).all()
        return [
            {
                "task_id": r.task_id,
                "task": r.task,
                "capability": r.capability,
                "model_used": r.model_used,
                "status": r.status,
                "created_time": r.created_at.isoformat() if r.created_at else None
            }
            for r in rows
        ]
    finally:
        db.close()

def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    db = SessionLocal()
    try:
        r = db.query(Task).filter(Task.task_id == task_id).first()
        if r:
            return {
                "task_id": r.task_id,
                "task": r.task,
                "capability": r.capability,
                "model_used": r.model_used,
                "status": r.status,
                "created_time": r.created_at.isoformat() if r.created_at else None
            }
        return None
    finally:
        db.close()
