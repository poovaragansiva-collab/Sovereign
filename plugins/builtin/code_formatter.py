import json
from typing import Dict, Any
from plugins.interface import BasePlugin, PluginMetadata, PluginPermission

class CodeFormatterPlugin(BasePlugin):
    metadata = PluginMetadata(
        name="Code Formatter & Linter",
        version="1.0.0",
        description="Inspects and formats code snippets or JSON payloads, checking syntax validity and indentation.",
        author="Sovereign Core",
        permissions=[PluginPermission.READ_FILES],
        enabled_by_default=True
    )

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        code = params.get("code", "")
        language = params.get("language", "json").lower()

        if not code.strip():
            return {"error": "No code content provided"}

        if language == "json":
            try:
                parsed = json.loads(code)
                formatted = json.dumps(parsed, indent=2)
                return {
                    "valid": True,
                    "language": "json",
                    "formatted_code": formatted,
                    "message": "JSON syntax valid and properly formatted."
                }
            except json.JSONDecodeError as e:
                return {
                    "valid": False,
                    "language": "json",
                    "error": f"JSON Syntax Error at line {e.lineno}, column {e.colno}: {e.msg}"
                }
        elif language in ["python", "py"]:
            import ast
            try:
                ast.parse(code)
                return {
                    "valid": True,
                    "language": "python",
                    "formatted_code": code,
                    "message": "Python AST parse succeeded. No syntax errors detected."
                }
            except SyntaxError as e:
                return {
                    "valid": False,
                    "language": "python",
                    "error": f"Python SyntaxError at line {e.lineno}: {e.msg}"
                }
        else:
            return {
                "valid": True,
                "language": language,
                "formatted_code": code,
                "message": f"Syntax check not implemented for {language}; code returned unchanged."
            }
