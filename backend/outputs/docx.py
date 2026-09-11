import os
from docx import Document

class DOCXOutputGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate(self, content: any, filename: str) -> dict:
        try:
            target_path = os.path.join(self.output_dir, f"{filename}.docx")
            doc = Document()
            
            text_content = str(content)
            for p in text_content.split('\n'):
                if p.strip():
                    doc.add_paragraph(p.strip())

            doc.save(target_path)
            return {"status": "success", "path": target_path, "filename": f"{filename}.docx"}
        except Exception as e:
            return {"status": "error", "errors": [str(e)]}
