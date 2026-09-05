from typing import List, Dict, Any
import uuid

try:
    import chromadb
except ImportError:
    chromadb = None

class LocalVectorStore:
    """Local vector store using ChromaDB."""
    def __init__(self, persist_directory: str = "./chroma_db", collection_name: str = "default"):
        if chromadb is None:
            raise ImportError("chromadb is not installed. Please install it to use LocalVectorStore.")
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        
    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]], embeddings: List[List[float]]):
        if not texts:
            return
            
        ids = [str(uuid.uuid4()) for _ in texts]
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )
        
    def similarity_search(self, query_embedding: List[float], k: int = 4) -> List[Dict[str, Any]]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
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
