import os
from .interface import OCRInterface

try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None

class LocalOCR(OCRInterface):
    """Local OCR implementation using Tesseract."""
    def extract_text(self, image_path: str) -> str:
        if Image is None or pytesseract is None:
            raise ImportError("Pillow and pytesseract must be installed for LocalOCR.")
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
            
        try:
            image = Image.open(image_path)
            return pytesseract.image_to_string(image)
        except Exception as e:
            raise RuntimeError(f"OCR extraction failed: {str(e)}")
