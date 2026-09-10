from typing import List, Dict, Any

class TextSplitter:
    """Deterministic text chunker."""
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
    def split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc_idx, doc in enumerate(documents):
            text = doc["text"]
            metadata = doc.get("metadata", {})
            
            start = 0
            chunk_num = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                chunk_text = text[start:end]
                chunk_num += 1
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        **metadata,
                        "chunk_index": chunk_num,
                        "chunk_start": start,
                        "chunk_end": end,
                        "source": metadata.get("source", "unknown"),
                        "page": metadata.get("page", 1)
                    }
                })
                if end == len(text):
                    break
                start += self.chunk_size - self.chunk_overlap
                
        return chunks

