import base64
import os
from typing import Dict, Any
from .interface import VisionClientInterface
from ai.inference.interface import AIClientInterface

class OllamaVisionClient(VisionClientInterface):
    """Vision client bridging local images to Ollama vision models (e.g., LLaVA)."""
    def __init__(self, ai_client: AIClientInterface):
        self.ai_client = ai_client
        
    def analyze_image(self, image_path: str, prompt: str, model: str) -> Dict[str, Any]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
            
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")
            
        # Ollama expects images as base64 strings
        return self.ai_client.generate(prompt=prompt, model=model, images=[image_b64])
