import json
from typing import Dict, Any
from .interface import OutputGeneratorInterface

class JSONOutputGenerator(OutputGeneratorInterface):
    def generate(self, content: Any, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if not filename.endswith('.json'):
            filename += '.json'
            
        safe_path = self._get_safe_path(filename)
        metadata = metadata or {}
        
        try:
            with open(safe_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
                
            return {
                "status": "success",
                "format": "json",
                "path": safe_path,
                "filename": filename,
                "metadata": metadata
            }
        except Exception as e:
            return {
                "status": "failed",
                "format": "json",
                "errors": [str(e)],
                "metadata": metadata
            }

class TXTOutputGenerator(OutputGeneratorInterface):
    def generate(self, content: Any, filename: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if not filename.endswith('.txt'):
            filename += '.txt'
            
        safe_path = self._get_safe_path(filename)
        metadata = metadata or {}
        
        try:
            with open(safe_path, 'w', encoding='utf-8') as f:
                # Assuming content is convertible to string
                f.write(str(content))
                
            return {
                "status": "success",
                "format": "txt",
                "path": safe_path,
                "filename": filename,
                "metadata": metadata
            }
        except Exception as e:
            return {
                "status": "failed",
                "format": "txt",
                "errors": [str(e)],
                "metadata": metadata
            }
