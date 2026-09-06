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

class PDFLoader:
    """Loader for PDF documents using PyPDF2."""
    def load(self, file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")

        import PyPDF2
        text_content = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text_content.append(page.extract_text() or "")

        return [{"text": "\n".join(text_content), "metadata": {"source": file_path}}]

class DOCXLoader:
    """Loader for DOCX documents using python-docx."""
    def load(self, file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document not found: {file_path}")

        import docx
        doc = docx.Document(file_path)
        text_content = [p.text for p in doc.paragraphs if p.text]

        return [{"text": "\n".join(text_content), "metadata": {"source": file_path}}]
