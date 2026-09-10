import os
import json
import requests
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import ModelConfiguration, AuditLog
from ai.config import get_ollama_base_url

router = APIRouter()

class ModelConfigItem(BaseModel):
    name: str
    type: Optional[str] = None
    enabled: Optional[bool] = True

class ModelConfigRequest(BaseModel):
    models: List[ModelConfigItem]

def sync_sovereign_models_env(db: Session):
    """Sync active model configurations from database into SOVEREIGN_MODELS env var."""
    configs = db.query(ModelConfiguration).filter(ModelConfiguration.enabled == True).all()
    models_data = [{"name": c.model_name, "type": c.capability, "enabled": c.enabled} for c in configs]
    if models_data:
        os.environ["SOVEREIGN_MODELS"] = json.dumps(models_data)
    elif "SOVEREIGN_MODELS" in os.environ:
        del os.environ["SOVEREIGN_MODELS"]

@router.get("/")
def get_ollama_models(db: Session = Depends(get_db)):
    """Discover models dynamically from local Ollama and merge with DB configuration."""
    base_url = get_ollama_base_url()
    ollama_models = []
    ollama_online = False
    
    try:
        res = requests.get(f"{base_url}/api/tags", timeout=3)
        if res.status_code == 200:
            ollama_online = True
            ollama_models = res.json().get("models", [])
    except Exception:
        pass

    db_configs = {c.model_name: c for c in db.query(ModelConfiguration).all()}
    
    result = []
    # Detected in Ollama
    for om in ollama_models:
        name = om["name"]
        conf = db_configs.get(name)
        result.append({
            "name": name,
            "available": True,
            "type": conf.capability if conf else None,
            "enabled": conf.enabled if conf else True,
            "size": om.get("size", 0),
            "modified_at": om.get("modified_at")
        })

    # Also include configured models that might currently be offline
    detected_names = {om["name"] for om in ollama_models}
    for name, conf in db_configs.items():
        if name not in detected_names:
            result.append({
                "name": name,
                "available": False,
                "type": conf.capability,
                "enabled": conf.enabled,
                "size": 0,
                "modified_at": None
            })

    return {
        "ollama_online": ollama_online,
        "models": result
    }

@router.get("/config")
def get_model_config(db: Session = Depends(get_db)):
    """Return the active model-role configuration from database."""
    configs = db.query(ModelConfiguration).all()
    return {
        "configured": len(configs) > 0,
        "models": [
            {
                "name": c.model_name,
                "type": c.capability,
                "enabled": c.enabled
            }
            for c in configs
        ]
    }

@router.post("/config")
def save_model_config(req: ModelConfigRequest, db: Session = Depends(get_db)):
    """Update model purpose configurations in the database."""
    valid_capabilities = ["general", "reasoning", "coding", "vision", "embedding"]

    # Clear old configurations
    db.query(ModelConfiguration).delete()

    for item in req.models:
        if item.type:
            if item.type not in valid_capabilities:
                raise HTTPException(status_code=400, detail=f"Invalid capability: {item.type}. Allowed: {valid_capabilities}")
            
            config_entry = ModelConfiguration(
                model_name=item.name,
                capability=item.type,
                enabled=item.enabled if item.enabled is not None else True
            )
            db.add(config_entry)

    # Log audit
    audit = AuditLog(
        action="MODEL_CONFIG_UPDATED",
        details=f"Updated {len(req.models)} model configurations"
    )
    db.add(audit)
    db.commit()

    # Sync environment variable for AI Engine
    sync_sovereign_models_env(db)

    return {"status": "success", "message": "Model configurations updated successfully"}

@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """Check if model setup is required."""
    count = db.query(ModelConfiguration).count()
    return {
        "setup_required": count == 0
    }

class PullModelRequest(BaseModel):
    name: str

@router.post("/pull")
def pull_model(req: PullModelRequest, db: Session = Depends(get_db)):
    """Pull a model directly into Ollama."""
    base_url = get_ollama_base_url()
    try:
        res = requests.post(f"{base_url}/api/pull", json={"name": req.name, "stream": False}, timeout=120)
        if res.status_code == 200:
            audit = AuditLog(
                action="MODEL_PULLED",
                details=f"Pulled model '{req.name}' into Ollama"
            )
            db.add(audit)
            db.commit()
            return {"status": "success", "message": f"Successfully pulled '{req.name}'"}
        else:
            raise HTTPException(status_code=res.status_code, detail=res.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pull model: {str(e)}")

@router.delete("/{model_name}")
def delete_model(model_name: str, db: Session = Depends(get_db)):
    """Delete a model from local Ollama and remove its DB configuration."""
    base_url = get_ollama_base_url()
    try:
        res = requests.delete(f"{base_url}/api/delete", json={"name": model_name}, timeout=10)
        # Also remove from DB configurations if present
        db.query(ModelConfiguration).filter(ModelConfiguration.model_name == model_name).delete()
        
        audit = AuditLog(
            action="MODEL_DELETED",
            details=f"Deleted model '{model_name}' from Ollama"
        )
        db.add(audit)
        db.commit()
        sync_sovereign_models_env(db)
        return {"status": "success", "message": f"Deleted model '{model_name}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")

