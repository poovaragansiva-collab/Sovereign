from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import requests
from backend.services.config_db import get_all_models, save_models
from ai.config import get_ollama_base_url

router = APIRouter()

class ModelConfigItem(BaseModel):
    name: str
    type: Optional[str] = None
    available: Optional[bool] = None

class ModelConfigRequest(BaseModel):
    models: List[ModelConfigItem]

@router.get("/")
def get_ollama_models():
    """Discover models dynamically from Ollama."""
    base_url = get_ollama_base_url()
    try:
        response = requests.get(f"{base_url}/api/tags", timeout=5)
        response.raise_for_status()
        data = response.json()
        ollama_models = data.get("models", [])
    except Exception as e:
        # Returning empty or handled state if Ollama is off
        return {"models": []}

    configured = {m["name"]: m for m in get_all_models()}
    
    result = []
    for om in ollama_models:
        name = om["name"]
        conf = configured.get(name, {})
        result.append({
            "name": name,
            "available": True,
            "type": conf.get("type")
        })
        
    return {"models": result}

@router.get("/config")
def get_config():
    """Return the current SOVEREIGN model-role configuration."""
    models = get_all_models()
    return {
        "configured": len(models) > 0,
        "models": models
    }

@router.post("/config")
def update_config(config: ModelConfigRequest):
    """Allow the frontend to configure model purposes."""
    valid_types = ["general", "reasoning", "coding", "vision"]
    
    # Validate types
    models_to_save = []
    for m in config.models:
        if m.type and m.type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid type: {m.type}")
        if m.type:
            models_to_save.append({
                "name": m.name,
                "type": m.type,
                "enabled": True
            })
            
    save_models(models_to_save)
    return {"status": "success"}

@router.get("/setup-status")
def setup_status():
    """Check if configuration exists."""
    models = get_all_models()
    return {
        "setup_required": len(models) == 0
    }
