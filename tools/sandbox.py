import subprocess
import tempfile
import os
import sys
import uuid
import ast
from typing import Dict, Any

from tools.interface import ToolInterface

class PythonSandboxTool(ToolInterface):
    """
    A tool for executing generated Python code safely within the application's bounds.
    """
    @property
    def name(self) -> str:
        return "coding_sandbox"

    @property
    def description(self) -> str:
        return "Executes Python code in a restricted subprocess, capturing stdout/stderr and enforcing timeouts."

    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The python code to execute"
                }
            },
            "required": ["code"]
        }

    def validate_code(self, code: str) -> bool:
        # Basic check to prevent some obvious OS/network imports if desired, 
        # but in a true Docker container they might be okay. We will parse AST to check for
        # forbidden modules just to add a basic layer of safety against `os.system` etc.
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name in ["os", "subprocess", "sys", "socket", "requests", "httpx"]:
                            return False
                elif isinstance(node, ast.ImportFrom):
                    if node.module in ["os", "subprocess", "sys", "socket", "requests", "httpx"]:
                        return False
            return True
        except Exception:
            return False

    def execute(self, code: str, **kwargs) -> Dict[str, Any]:
        if not code:
            return {"error": "No code provided"}

        if not self.validate_code(code):
            return {"error": "Code contains restricted modules (os, subprocess, socket, etc.)"}

        timeout = 10 # 10 seconds timeout

        # Secure temporary directory (cleans up automatically)
        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = os.path.join(temp_dir, f"script_{uuid.uuid4().hex}.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Strip environment variables to prevent leaking secrets
            safe_env = {
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": temp_dir
            }

            try:
                result = subprocess.run(
                    [sys.executable, script_path],
                    cwd=temp_dir,
                    env=safe_env,
                    capture_output=True,
                    timeout=timeout,
                    text=True
                )
                
                return {
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
            except subprocess.TimeoutExpired:
                return {"error": f"Execution timed out after {timeout} seconds."}
            except Exception as e:
                return {"error": f"Execution failed: {str(e)}"}
