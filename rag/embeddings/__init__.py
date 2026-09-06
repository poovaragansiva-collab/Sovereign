from typing import List
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

class LocalEmbeddings:
    """Local embedding generation using sentence-transformers."""
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers is not installed. Please install it to use LocalEmbeddings.")
        try:
            self.model = SentenceTransformer(model_name, local_files_only=True)
        except Exception as e:
            raise RuntimeError(f"Failed to load embedding model '{model_name}' locally. Please pre-download weights to ensure offline functionality. Error: {e}")
        
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Generate embeddings
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist() if hasattr(embeddings, 'tolist') else embeddings
        
    def embed_query(self, text: str) -> List[float]:
        return self.embed_documents([text])[0]
