import csv
import io
import json
from typing import Dict, Any, List
from plugins.interface import BasePlugin, PluginMetadata, PluginPermission

class DataConverterPlugin(BasePlugin):
    metadata = PluginMetadata(
        name="Data Converter",
        version="1.0.0",
        description="Converts tabular data seamlessly between JSON, CSV, and Markdown table formats.",
        author="Sovereign Core",
        permissions=[],
        enabled_by_default=True
    )

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        data = params.get("data", "")
        from_format = params.get("from", "json").lower()
        to_format = params.get("to", "markdown").lower()

        if not data.strip():
            return {"error": "Input data cannot be empty"}

        try:
            # 1. Parse into list of dicts
            rows: List[Dict[str, Any]] = []
            if from_format == "json":
                parsed = json.loads(data)
                rows = parsed if isinstance(parsed, list) else [parsed]
            elif from_format == "csv":
                reader = csv.DictReader(io.StringIO(data.strip()))
                rows = list(reader)
            else:
                return {"error": f"Unsupported source format: '{from_format}'"}

            if not rows:
                return {"error": "No records found in input data"}

            # 2. Convert to target format
            if to_format == "json":
                out_str = json.dumps(rows, indent=2)
            elif to_format == "csv":
                buf = io.StringIO()
                writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
                out_str = buf.getvalue()
            elif to_format == "markdown":
                headers = list(rows[0].keys())
                header_line = "| " + " | ".join(headers) + " |"
                sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                data_lines = [
                    "| " + " | ".join(str(r.get(h, "")) for h in headers) + " |"
                    for r in rows
                ]
                out_str = "\n".join([header_line, sep_line] + data_lines)
            else:
                return {"error": f"Unsupported target format: '{to_format}'"}

            return {
                "converted_data": out_str,
                "rows_count": len(rows),
                "from_format": from_format,
                "to_format": to_format
            }
        except Exception as e:
            return {"error": f"Data conversion failed: {str(e)}"}
