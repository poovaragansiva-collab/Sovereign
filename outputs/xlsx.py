from typing import Dict, Any
from .interface import OutputGeneratorInterface

try:
    import openpyxl
except ImportError:
    openpyxl = None

class XLSXOutputGenerator(OutputGeneratorInterface):
    def generate(self, content: Any, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if openpyxl is None:
            return {
                "status": "failed",
                "format": "xlsx",
                "errors": ["openpyxl is not installed."],
                "metadata": metadata or {}
            }
            
        if not filename.endswith('.xlsx'):
            filename += '.xlsx'
            
        safe_path = self._get_safe_path(filename)
        metadata = metadata or {}
        
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            
            if isinstance(content, list):
                # Assuming list of dicts for rows
                if content and isinstance(content[0], dict):
                    headers = list(content[0].keys())
                    ws.append(headers)
                    for item in content:
                        if isinstance(item, dict):
                            ws.append([str(item.get(h, "")) for h in headers])
                else:
                    # List of lists or simple values
                    for item in content:
                        if isinstance(item, (list, tuple)):
                            ws.append(list(item))
                        else:
                            ws.append([str(item)])
            elif isinstance(content, dict):
                ws.append(["Key", "Value"])
                for k, v in content.items():
                    ws.append([str(k), str(v)])
            else:
                ws.append([str(content)])
                
            wb.save(safe_path)
                
            return {
                "status": "success",
                "format": "xlsx",
                "path": safe_path,
                "filename": filename,
                "metadata": metadata
            }
        except Exception as e:
            return {
                "status": "failed",
                "format": "xlsx",
                "errors": [str(e)],
                "metadata": metadata
            }
