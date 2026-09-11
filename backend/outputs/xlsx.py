import os
from openpyxl import Workbook
import json

class XLSXOutputGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate(self, content: any, filename: str) -> dict:
        try:
            target_path = os.path.join(self.output_dir, f"{filename}.xlsx")
            wb = Workbook()
            ws = wb.active

            # Handle JSON array of arrays or objects
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except:
                    pass

            if isinstance(content, list):
                if len(content) > 0 and isinstance(content[0], dict):
                    # Write headers
                    headers = list(content[0].keys())
                    ws.append(headers)
                    # Write rows
                    for item in content:
                        row = [item.get(h, "") for h in headers]
                        ws.append(row)
                elif len(content) > 0 and isinstance(content[0], list):
                    for row in content:
                        ws.append(row)
                else:
                    for item in content:
                        ws.append([str(item)])
            elif isinstance(content, dict):
                ws.append(["Key", "Value"])
                for k, v in content.items():
                    ws.append([str(k), str(v)])
            else:
                ws.append([str(content)])

            wb.save(target_path)
            return {"status": "success", "path": target_path, "filename": f"{filename}.xlsx"}
        except Exception as e:
            return {"status": "error", "errors": [str(e)]}
