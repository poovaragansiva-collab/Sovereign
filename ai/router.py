from typing import Dict
from .models.registry import ModelRegistry

class ModelRoutingError(Exception):
    """Raised when the router cannot find an appropriate model."""
    pass

class ModelRouter:
    """
    Routes task capabilities to the appropriate registered model.
    """
    def __init__(self, registry: ModelRegistry):
        self.registry = registry

    def route(self, capability: str) -> Dict[str, str]:
        """
        Selects an appropriate model based on the requested capability.
        
        Args:
            capability: The requested capability (e.g., 'general', 'reasoning', 'coding', 'vision', 'embedding').
            
        Returns:
            A dictionary containing the selected model name, capability, and reason.
            
        Raises:
            ModelRoutingError: If no suitable enabled model is found.
        """
        enabled_models = self.registry.list_models(enabled_only=True)
        
        for model in enabled_models:
            if model.type == capability:
                return {
                    "model": model.name,
                    "capability": capability,
                    "reason": f"Deterministic match for capability '{capability}'"
                }
                
        raise ModelRoutingError(f"No enabled model found for required capability '{capability}'.")
