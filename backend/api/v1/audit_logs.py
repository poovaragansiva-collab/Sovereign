from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.session import get_db
from backend.db.models import AuditLog, User
from backend.core.deps import get_current_active_admin

router = APIRouter()

@router.get("/")
def list_audit_logs(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), current_admin: User = Depends(get_current_active_admin)):
    logs = (
        db.query(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
        .all()
    )
    return {
        "logs": [
            {
                "id": log.id,
                "task_id": log.task_id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }
