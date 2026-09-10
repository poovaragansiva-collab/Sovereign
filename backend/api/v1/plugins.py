from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import AuditLog
from plugins.manager import get_plugin_manager

router = APIRouter()

class TogglePluginRequest(BaseModel):
    enabled: bool

class ExecutePluginRequest(BaseModel):
    action: str
    params: Optional[Dict[str, Any]] = {}

@router.get("/")
def list_plugins():
    """List all available plugins, declared permissions, and enabled states."""
    pm = get_plugin_manager()
    return {"plugins": pm.list_plugins()}

@router.post("/{name}/toggle")
def toggle_plugin(name: str, req: TogglePluginRequest, db: Session = Depends(get_db)):
    """Enable or disable a plugin with audit logging."""
    pm = get_plugin_manager()
    success = pm.toggle_plugin(name, req.enabled)
    if not success:
        raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")

    audit = AuditLog(
        action="PLUGIN_TOGGLED",
        details=f"Plugin '{name}' set to {'ENABLED' if req.enabled else 'DISABLED'}"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "plugin": name, "enabled": req.enabled}

@router.post("/{name}/execute")
def execute_plugin(name: str, req: ExecutePluginRequest, db: Session = Depends(get_db)):
    """Execute an authorized plugin action."""
    pm = get_plugin_manager()
    res = pm.execute_plugin(name, req.action, req.params or {})
    if "error" in res and "not found" in res["error"]:
        raise HTTPException(status_code=404, detail=res["error"])
    elif "error" in res and "disabled" in res["error"]:
        raise HTTPException(status_code=403, detail=res["error"])

    audit = AuditLog(
        action="PLUGIN_EXECUTED",
        details=f"Executed plugin '{name}' action '{req.action}'"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "plugin": name, "action": req.action, "result": res}
