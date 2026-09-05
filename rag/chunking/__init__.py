from typing import List, Dict, Any

class TextSplitter:
    """Deterministic text chunker."""
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
    def split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc in documents:
            text = doc["text"]
            metadata = doc["metadata"]
            
            start = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                chunk_text = text[start:end]
                chunks.append({
                    "text": chunk_text,
                    "metadata": {**metadata, "chunk_start": start, "chunk_end": end}
                })
                if end == len(text):
                    break
                start += self.chunk_size - self.chunk_overlap
                
        return chunks
