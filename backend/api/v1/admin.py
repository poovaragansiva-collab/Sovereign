import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.db.session import get_db
from backend.db.models import User, AuditLog
from backend.core.deps import get_current_active_admin

router = APIRouter()

class UserUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/users")
def get_users(db: Session = Depends(get_db), current_admin: User = Depends(get_current_active_admin)):
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "display_name": u.display_name,
                "role": u.role,
                "status": u.status,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None
            } for u in users
        ]
    }

@router.put("/users/{user_id}")
def update_user(user_id: str, update_data: UserUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_active_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if update_data.role is not None:
        user.role = update_data.role
    if update_data.status is not None:
        user.status = update_data.status
    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    audit = AuditLog(
        actor_user_id=current_admin.id,
        action="USER_UPDATED",
        resource_type="user",
        resource_id=user.id,
        details=f"Admin updated user {user.username}. New status: {user.status}, Role: {user.role}, Active: {user.is_active}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return {"status": "success", "message": f"User {user.username} updated"}

@router.get("/audit-logs")
def get_audit_logs(limit: int = Query(100), db: Session = Depends(get_db), current_admin: User = Depends(get_current_active_admin)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {
        "logs": [
            {
                "id": log.id,
                "actor_user_id": log.actor_user_id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None
            } for log in logs
        ]
    }
