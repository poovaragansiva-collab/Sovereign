import os
import re
from typing import Dict, Any
from plugins.interface import BasePlugin, PluginMetadata, PluginPermission
from rag.loaders import load_document

class FileSummarizerPlugin(BasePlugin):
    metadata = PluginMetadata(
        name="File Summarizer",
        version="1.0.0",
        description="Analyzes and summarizes local text, PDF, and DOCX documents, calculating word counts, reading times, and key excerpts.",
        author="Sovereign Core",
        permissions=[PluginPermission.READ_FILES],
        enabled_by_default=True
    )

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        file_path = params.get("file_path") or params.get("filename")
        if not file_path or not os.path.exists(file_path):
            return {"error": f"File path does not exist: '{file_path}'"}

        try:
            docs = load_document(file_path)
            full_text = "\n\n".join([d.get("text", "") for d in docs])
            words = re.findall(r'\b\w+\b', full_text)
            lines = [l for l in full_text.splitlines() if l.strip()]
            reading_time_min = max(1, round(len(words) / 200))

            # Basic extractive summary: take first 3 significant paragraphs
            summary_snippets = lines[:4]

            return {
                "file_path": file_path,
                "file_size_bytes": os.path.getsize(file_path),
                "total_words": len(words),
                "total_lines": len(lines),
                "estimated_reading_time_minutes": reading_time_min,
                "pages_detected": max([d.get("metadata", {}).get("page", 1) for d in docs], default=1),
                "excerpt": "\n\n".join(summary_snippets)
            }
        except Exception as e:
            return {"error": f"Summarization failed: {str(e)}"}
