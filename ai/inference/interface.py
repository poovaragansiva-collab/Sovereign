from abc import ABC, abstractmethod
from typing import Any, Dict, List

class AIClientInterface(ABC):
    """
    Generic interface for AI inference clients.
    Future providers (e.g., vLLM) should implement this interface.
    """

    @abstractmethod
    def generate(self, prompt: str, model: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Send a basic generation request.
        
        Args:
            prompt: The input prompt text.
            model: The name of the model to use.
            **kwargs: Additional parameters (e.g., temperature).
            
        Returns:
            A dictionary containing the response.
        """
        pass

    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], model: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Send a chat completion request.
        
        Args:
            messages: A list of message dictionaries (e.g., {"role": "user", "content": "hello"}).
            model: The name of the model to use.
            **kwargs: Additional parameters.
            
        Returns:
            A dictionary containing the response.
        """
        pass
