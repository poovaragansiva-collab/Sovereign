from abc import ABC, abstractmethod
from typing import Dict, Any

class OCRInterface(ABC):
    @abstractmethod
    def extract_text(self, image_path: str) -> str:
        """Extracts text from an image."""
        pass

class VisionClientInterface(ABC):
    @abstractmethod
    def analyze_image(self, image_path: str, prompt: str, model: str) -> Dict[str, Any]:
        """Analyzes an image using a vision model."""
        pass
