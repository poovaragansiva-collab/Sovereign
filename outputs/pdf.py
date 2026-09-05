from typing import Dict, Any
from .interface import OutputGeneratorInterface

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
except ImportError:
    canvas = None
    SimpleDocTemplate = None

class PDFOutputGenerator(OutputGeneratorInterface):
    def generate(self, content: Any, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if SimpleDocTemplate is None:
            return {
                "status": "failed",
                "format": "pdf",
                "errors": ["reportlab is not installed."],
                "metadata": metadata or {}
            }
            
        if not filename.endswith('.pdf'):
            filename += '.pdf'
            
        safe_path = self._get_safe_path(filename)
        metadata = metadata or {}
        
        try:
            doc = SimpleDocTemplate(safe_path, pagesize=letter)
            styles = getSampleStyleSheet()
            flowables = []
            
            if isinstance(content, list):
                for item in content:
                    flowables.append(Paragraph(str(item), styles['Normal']))
            elif isinstance(content, dict):
                for k, v in content.items():
                    flowables.append(Paragraph(f"<b>{str(k)}</b>", styles['Heading1']))
                    flowables.append(Paragraph(str(v), styles['Normal']))
            else:
                flowables.append(Paragraph(str(content).replace('\n', '<br/>'), styles['Normal']))
                
            doc.build(flowables)
                
            return {
                "status": "success",
                "format": "pdf",
                "path": safe_path,
                "filename": filename,
                "metadata": metadata
            }
        except Exception as e:
            return {
                "status": "failed",
                "format": "pdf",
                "errors": [str(e)],
                "metadata": metadata
            }
