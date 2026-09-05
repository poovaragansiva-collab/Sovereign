import os
from typing import List, Dict, Any

class TextLoader:
    """Simple loader for text documents."""
    def load(self, file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")
            
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        return [{"text": text, "metadata": {"source": file_path}}]
