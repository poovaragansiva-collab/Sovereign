from fastapi import APIRouter
import requests
from backend.services.config_db import get_all_models
from ai.config import get_ollama_base_url

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.get("/api/ai/status")
def ai_status():
    base_url = get_ollama_base_url()
    ollama_available = False
    
    try:
        response = requests.get(base_url, timeout=2)
        if response.status_code == 200:
            ollama_available = True
    except Exception:
        pass
    
    models = get_all_models()
    
    # We could also fetch actual models from Ollama to mark them available
    # but for status, maybe we just return the configured models.
    
    return {
        "status": "online" if ollama_available else "degraded",
        "ollama": {
            "available": ollama_available,
            "base_url": base_url
        },
        "models": [
            {
                "name": m["name"],
                "type": m["type"],
                "available": ollama_available # Simplified, could check real availability
            }
            for m in models
        ]
    }
