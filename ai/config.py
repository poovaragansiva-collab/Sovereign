import os

# Default Ollama Base URL
DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"

def get_ollama_base_url() -> str:
    """
    Retrieve the Ollama Base URL from environment variables.
    Falls back to the default localhost URL if not configured.
    """
    return os.environ.get("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL)
