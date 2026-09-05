import os
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any

class OutputGeneratorInterface(ABC):
    def __init__(self, output_dir: str = "local_outputs"):
        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)
        
    def _get_safe_path(self, filename: str) -> str:
        """Ensures the path does not traverse outside the output directory."""
        # Clean filename to avoid path traversal
        clean_filename = os.path.basename(filename)
        if not clean_filename or clean_filename == '.' or clean_filename == '..':
            clean_filename = f"output_{uuid.uuid4().hex[:8]}"
            
        full_path = os.path.abspath(os.path.join(self.output_dir, clean_filename))
        
        # Verify it's within the intended directory
        if not full_path.startswith(self.output_dir):
            raise PermissionError(f"Path traversal attempt blocked: {filename}")
            
        # Do not overwrite existing files directly if avoiding overwrites is a requirement,
        # but for simple generation we'll allow it or append a uuid if needed.
        # Let's append UUID to make unique safe filenames if the caller didn't specify one
        return full_path

    @abstractmethod
    def generate(self, content: Any, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generates an output file.
        Returns a dictionary containing status, format, path, filename, and metadata.
        """
        pass
