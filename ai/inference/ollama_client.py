import json
import urllib.request
import urllib.error
from typing import Any, Dict, List

from .interface import AIClientInterface

class OllamaConnectionError(Exception):
    """Raised when the Ollama server cannot be reached."""
    pass

class OllamaRequestError(Exception):
    """Raised when the Ollama API returns an error."""
    pass

class OllamaClient(AIClientInterface):
    """
    Ollama implementation of the AIClientInterface.
    Uses standard library urllib to minimize dependencies.
    """
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def _make_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/api/{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result
        except urllib.error.HTTPError as e:
            # Handle HTTP errors returned by Ollama (e.g., model not found)
            error_message = e.read().decode("utf-8")
            raise OllamaRequestError(f"Ollama returned HTTP error {e.code}: {error_message}")
        except urllib.error.URLError as e:
            # Handle connection errors (e.g., connection refused, timeout)
            raise OllamaConnectionError(f"Failed to connect to Ollama at {self.base_url}. Is it running? Details: {e}")
        except json.JSONDecodeError:
            raise OllamaRequestError("Received invalid JSON from Ollama.")

    def generate(self, prompt: str, model: str, **kwargs: Any) -> Dict[str, Any]:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,  # No streaming for phase 1 by default
            **kwargs
        }
        return self._make_request("generate", payload)

    def chat(self, messages: List[Dict[str, str]], model: str, **kwargs: Any) -> Dict[str, Any]:
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            **kwargs
        }
        return self._make_request("chat", payload)
