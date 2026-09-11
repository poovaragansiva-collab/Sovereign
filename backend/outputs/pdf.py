import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

class PDFOutputGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate(self, content: any, filename: str) -> dict:
        try:
            target_path = os.path.join(self.output_dir, f"{filename}.pdf")
            doc = SimpleDocTemplate(target_path, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []

            text_content = str(content)
            # Basic newlines to paragraphs
            for p in text_content.split('\n'):
                if p.strip():
                    story.append(Paragraph(p, styles['Normal']))
                    story.append(Spacer(1, 12))

            doc.build(story)
            return {"status": "success", "path": target_path, "filename": f"{filename}.pdf"}
        except Exception as e:
            return {"status": "error", "errors": [str(e)]}
