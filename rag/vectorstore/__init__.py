from typing import List, Dict, Any, Optional
import uuid
import logging

logger = logging.getLogger("sovereign.rag.vectorstore")

try:
    import chromadb
except ImportError:
    chromadb = None

class LocalVectorStore:
    """Local vector store using ChromaDB with dimension resilience and document pruning."""
    def __init__(self, persist_directory: str = "./chroma_db", collection_name: str = "default"):
        if chromadb is None:
            raise ImportError("chromadb is not installed. Please install it to use LocalVectorStore.")
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        
    def get_dimension(self) -> Optional[int]:
        """Inspect the current embedding dimension of the collection."""
        try:
            peek = self.collection.peek(limit=1)
            if peek is not None and peek.get('embeddings') is not None:
                embs = peek['embeddings']
                if len(embs) > 0:
                    return int(len(embs[0]))
        except Exception:
            pass
        return None

    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]):
        if not texts or not embeddings:
            return
            
        current_dim = self.get_dimension()
        new_dim = len(embeddings[0])

        # If existing collection has a different dimension, recreate collection cleanly
        if current_dim is not None and current_dim != new_dim and self.collection.count() > 0:
            logger.warning(f"Dimension changed from {current_dim} to {new_dim}. Recreating collection '{self.collection_name}'.")
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.get_or_create_collection(name=self.collection_name)

        ids = [str(uuid.uuid4()) for _ in texts]
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )
        
    def delete_by_source(self, source_path: str):
        """Delete all chunks belonging to a specific source document."""
        try:
            self.collection.delete(where={"source": source_path})
        except Exception as e:
            logger.debug(f"Could not delete chunks for source '{source_path}': {e}")

    def clear(self):
        """Purge all chunks from the collection."""
        try:
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
        except Exception as e:
            logger.warning(f"Error clearing collection '{self.collection_name}': {e}")

    def similarity_search(self, query_embedding: List[float], k: int = 4, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.collection.count() == 0:
            return []

        # Ensure query embedding matches collection dimension
        expected_dim = self.get_dimension()
        if expected_dim is not None and len(query_embedding) != expected_dim:
            if len(query_embedding) < expected_dim:
                # Pad with zeros
                query_embedding = query_embedding + [0.0] * (expected_dim - len(query_embedding))
            else:
                # Truncate to expected dimension
                query_embedding = query_embedding[:expected_dim]

        kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": k
        }
        if user_id:
            kwargs["where"] = {"user_id": user_id}

        results = self.collection.query(**kwargs)
        
        docs = []
        if results and results['documents'] and results['documents'][0]:
            for i in range(len(results['documents'][0])):
                docs.append({
                    "id": results['ids'][0][i],
                    "text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "score": results['distances'][0][i] if 'distances' in results and results['distances'] else None
                })
        return docs
