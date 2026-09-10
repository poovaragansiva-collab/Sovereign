import math
import re
from typing import List, Optional
import logging

logger = logging.getLogger("sovereign.rag.embeddings")

# SentenceTransformer stub for test patching (avoids downloading models at runtime)
SentenceTransformer = None

class LocalEmbeddings:
    """
    Flexible local embedding generator.
    Supports Ollama native embeddings via /api/embed (e.g. qwen2.5-coder:3b, nomic-embed-text)
    with seamless fallback to deterministic semantic hash vectorization.
    Requires zero cloud services and zero external dependencies.
    """
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name
        self._dim = 384
        self._st_model = None
        global SentenceTransformer
        if SentenceTransformer is not None:
            try:
                self._st_model = SentenceTransformer(model_name or "all-MiniLM-L6-v2")
            except Exception:
                pass

    def _get_embedding_model(self) -> Optional[str]:
        if self.model_name:
            return self.model_name

        # 1. Check DB for configured embedding model
        try:
            from backend.db.session import SessionLocal
            from backend.db.models import ModelConfiguration
            db = SessionLocal()
            try:
                row = db.query(ModelConfiguration).filter(
                    ModelConfiguration.capability == "embedding",
                    ModelConfiguration.enabled == True
                ).first()
                if row and row.model_name:
                    return row.model_name
            finally:
                db.close()
        except Exception:
            pass

        # 2. Check Ollama for installed models that support embed
        try:
            import urllib.request, json
            from ai.config import get_ollama_base_url
            base = get_ollama_base_url().rstrip('/')
            req = urllib.request.Request(f"{base}/api/tags")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                models = [m.get("name") for m in data.get("models", [])]
                # Check for known good embedding models
                for m in models:
                    if any(k in m.lower() for k in ["embed", "bge", "nomic", "all-minilm"]):
                        return m
                # qwen2.5-coder supports /api/embed natively
                for m in models:
                    if "qwen2.5-coder" in m.lower():
                        return m
                # default to first model if available
                if models:
                    return models[0]
        except Exception:
            pass

        return None

    def _deterministic_vector(self, text: str, dim: int = 384) -> List[float]:
        """Fast, deterministic semantic bag-of-words vector with subword n-grams."""
        vec = [0.0] * dim
        words = re.findall(r'\w+', text.lower())
        if not words:
            return vec

        for word in words:
            # Word hash
            h = abs(hash(word))
            vec[h % dim] += 1.0
            # Character n-grams for typo-resilience
            for n in (3, 4):
                if len(word) >= n:
                    for i in range(len(word) - n + 1):
                        sub = word[i:i+n]
                        sh = abs(hash(sub))
                        vec[sh % dim] += 0.3

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self._st_model is not None:
            try:
                res = self._st_model.encode(texts, convert_to_numpy=True)
                return [list(map(float, vec)) for vec in res]
            except Exception as e:
                logger.warning(f"SentenceTransformer encode failed: {e}")

        model = self._get_embedding_model()
        if model:
            try:
                from ai.inference.ollama_client import OllamaClient
                from ai.config import get_ollama_base_url
                client = OllamaClient(base_url=get_ollama_base_url())
                embeddings = client.embed(input_data=texts, model=model)
                if embeddings and len(embeddings) == len(texts):
                    return embeddings
            except Exception as e:
                logger.warning(f"Ollama embed failed with model '{model}', falling back to local semantic vector: {e}")

        # Fallback to local deterministic semantic vectors
        return [self._deterministic_vector(t, self._dim) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        results = self.embed_documents([text])
        return results[0] if results else [0.0] * self._dim

