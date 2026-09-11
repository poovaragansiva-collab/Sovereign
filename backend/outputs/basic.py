import os
import json

class JSONOutputGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate(self, content: any, filename: str) -> dict:
        try:
            target_path = os.path.join(self.output_dir, f"{filename}.json")
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)
            return {"status": "success", "path": target_path, "filename": f"{filename}.json"}
        except Exception as e:
            return {"status": "error", "errors": [str(e)]}

class TXTOutputGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir

    def generate(self, content: any, filename: str) -> dict:
        try:
            target_path = os.path.join(self.output_dir, f"{filename}.txt")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(str(content))
            return {"status": "success", "path": target_path, "filename": f"{filename}.txt"}
        except Exception as e:
            return {"status": "error", "errors": [str(e)]}
