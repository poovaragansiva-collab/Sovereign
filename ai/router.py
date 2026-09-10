import json
import urllib.request
from typing import Dict, Optional
from .models.registry import ModelRegistry, ModelInfo
from ai.config import get_ollama_base_url

class ModelRoutingError(Exception):
    """Raised when the router cannot find an appropriate model."""
    pass

class ModelRouter:
    """
    Routes task capabilities to the appropriate registered model.
    Checks in-memory registry, database configurations, and live Ollama models.
    Strictly forbids fake or non-existent model fallbacks.
    """
    def __init__(self, registry: Optional[ModelRegistry] = None):
        self.registry = registry or ModelRegistry()

    def _get_live_ollama_models(self) -> list[str]:
        """Fetch real installed models directly from Ollama."""
        base_url = get_ollama_base_url().rstrip('/')
        try:
            req = urllib.request.Request(f"{base_url}/api/tags")
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception:
            return []

    def _get_db_configured_model(self, capability: str) -> Optional[str]:
        """Check the database model_configurations table."""
        try:
            from backend.db.session import SessionLocal
            from backend.db.models import ModelConfiguration
            db = SessionLocal()
            try:
                row = db.query(ModelConfiguration).filter(
                    ModelConfiguration.capability == capability,
                    ModelConfiguration.enabled == True
                ).first()
                if row and row.model_name:
                    return row.model_name
            finally:
                db.close()
        except Exception:
            pass
        return None

    def route(self, capability: str) -> Dict[str, str]:
        """
        Selects an appropriate model based on the requested capability.
        
        Args:
            capability: The requested capability ('general', 'reasoning', 'coding', 'vision', 'embedding').
            
        Returns:
            A dictionary containing the selected model name, capability, and reason.
            
        Raises:
            ModelRoutingError: If no suitable model is found.
        """
        VALID_CAPABILITIES = {"general", "reasoning", "coding", "vision", "embedding"}
        if capability not in VALID_CAPABILITIES:
            raise ModelRoutingError(f"No enabled model found for required capability '{capability}'.")

        # 1. In-memory registry check
        enabled_models = self.registry.list_models(enabled_only=True)
        for model in enabled_models:
            if model.type == capability:
                return {
                    "model": model.name,
                    "capability": capability,
                    "reason": f"Deterministic match from registry for capability '{capability}'"
                }

        # Check if model is registered for this capability but disabled
        all_registered = self.registry.list_models(enabled_only=False)
        if any(m.type == capability for m in all_registered):
            raise ModelRoutingError(f"No enabled model found for required capability '{capability}'.")

        # 2. Database configuration check
        db_model = self._get_db_configured_model(capability)
        if db_model:
            return {
                "model": db_model,
                "capability": capability,
                "reason": f"User configured model from database for '{capability}'"
            }

        # 3. Dynamic local Ollama discovery
        live_models = self._get_live_ollama_models()
        if not live_models:
            raise ModelRoutingError(
                f"No local models detected in Ollama. Please ensure Ollama is running and has installed models."
            )

        # Vision capability check: do NOT pretend text models have vision
        if capability == "vision":
            vision_models = [m for m in live_models if any(k in m.lower() for k in ["llava", "vision", "minicpm-v", "qwen-vl", "moondream", "bakllava"])]
            if vision_models:
                return {
                    "model": vision_models[0],
                    "capability": "vision",
                    "reason": f"Auto-detected vision model '{vision_models[0]}'"
                }
            raise ModelRoutingError("Vision model not installed. No locally installed vision-capable model detected in Ollama.")

        # Embedding capability check
        if capability == "embedding":
            embed_models = [m for m in live_models if any(k in m.lower() for k in ["embed", "bge", "nomic", "all-minilm", "qwen2.5-coder"])]
            if embed_models:
                return {
                    "model": embed_models[0],
                    "capability": "embedding",
                    "reason": f"Auto-detected embedding model '{embed_models[0]}'"
                }
            raise ModelRoutingError("Embedding model not installed. No compatible local embedding model detected.")

        # Coding capability check
        if capability == "coding":
            coder_models = [m for m in live_models if any(k in m.lower() for k in ["code", "coder", "starcoder", "deepseek-coder"])]
            if coder_models:
                return {
                    "model": coder_models[0],
                    "capability": "coding",
                    "reason": f"Auto-detected coding model '{coder_models[0]}'"
                }

        # Reasoning capability check
        if capability == "reasoning":
            reasoning_models = [m for m in live_models if any(k in m.lower() for k in ["deepseek", "qwen", "reason", "r1"])]
            if reasoning_models:
                return {
                    "model": reasoning_models[0],
                    "capability": "reasoning",
                    "reason": f"Auto-detected reasoning model '{reasoning_models[0]}'"
                }

        # General / default fallback to first available local model
        selected = live_models[0]
        return {
            "model": selected,
            "capability": capability,
            "reason": f"Defaulted to installed local model '{selected}' for '{capability}'"
        }

