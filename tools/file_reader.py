import os
from typing import Dict, Any
from .interface import ToolInterface

class FileReaderTool(ToolInterface):
    """
    A safe local file reader tool. Prevents path traversal outside an allowed directory.
    """
    def __init__(self, allowed_directory: str):
        self.allowed_directory = os.path.abspath(allowed_directory)
        
    @property
    def name(self) -> str:
        return "file_reader"
        
    @property
    def description(self) -> str:
        return "Reads the text contents of a local file safely"
    
    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Relative path to the file"}
            },
            "required": ["file_path"]
        }
        
    def execute(self, file_path: str) -> str:
        # Prevent path traversal
        full_path = os.path.abspath(os.path.join(self.allowed_directory, file_path))
        
        # Ensure the resolved path is strictly within the allowed directory
        if not full_path.startswith(self.allowed_directory):
            raise PermissionError(f"Access to {file_path} is denied (path traversal attempted)")
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            raise ValueError(f"File not found: {file_path}")
        except PermissionError:
            raise PermissionError(f"Permission denied reading file: {file_path}")
        except Exception as e:
            raise RuntimeError(f"Error reading file: {str(e)}")
