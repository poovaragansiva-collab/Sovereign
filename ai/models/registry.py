from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class ModelInfo:
    name: str
    type: str  # e.g., 'llm', 'embedding'
    enabled: bool = True
    description: Optional[str] = None
    context_info: Optional[str] = None

class ModelRegistry:
    """
    A simple model registry to track available models.
    This prepares for the future Model Router layer.
    """
    def __init__(self):
        self._models: Dict[str, ModelInfo] = {}

    def register(self, model_info: ModelInfo) -> None:
        """Register a new model."""
        self._models[model_info.name] = model_info

    def get_model(self, name: str) -> Optional[ModelInfo]:
        """Retrieve a model by name."""
        return self._models.get(name)

    def list_models(self, enabled_only: bool = True) -> List[ModelInfo]:
        """List all registered models, optionally filtering by enabled status."""
        models = list(self._models.values())
        if enabled_only:
            return [m for m in models if m.enabled]
        return models

    def remove_model(self, name: str) -> bool:
        """Remove a model from the registry. Returns True if removed, False if not found."""
        if name in self._models:
            del self._models[name]
            return True
        return False
