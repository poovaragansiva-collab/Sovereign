from typing import List, Dict, Any
from ..loaders import load_document
from ..chunking import TextSplitter
from ..embeddings import LocalEmbeddings
from ..vectorstore import LocalVectorStore

class RAGRetriever:
    """
    Production retriever interface orchestrating document loading,
    chunking, local embeddings, and vector storage.
    """
    def __init__(self, vectorstore: LocalVectorStore, embeddings: LocalEmbeddings):
        self.vectorstore = vectorstore
        self.embeddings = embeddings

    def index_document(self, file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> Dict[str, Any]:
        """Index any supported document (PDF, DOCX, TXT, image OCR) into the vector store."""
        docs = load_document(file_path)
        splitter = TextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = splitter.split_documents(docs)

        chunks_count = len(chunks)
        page_count = max([c.get("metadata", {}).get("page", 1) for c in chunks], default=1)
        ocr_applied = any(c.get("metadata", {}).get("ocr_applied", False) for c in chunks)

        if chunks:
            # Delete any existing chunks for this source to prevent duplicate accumulation
            self.vectorstore.delete_by_source(file_path)
            texts = [c["text"] for c in chunks]
            metadatas = [c["metadata"] for c in chunks]
            # Generate local embeddings
            embedded = self.embeddings.embed_documents(texts)
            self.vectorstore.add_texts(texts, metadatas, embedded)

        return {
            "status": "indexed",
            "chunks_count": chunks_count,
            "page_count": page_count,
            "ocr_applied": ocr_applied
        }

    def delete_document(self, file_path: str):
        """Prune chunks for a deleted document from the vector store."""
        self.vectorstore.delete_by_source(file_path)

    def clear(self):
        """Purge all indexed document chunks."""
        self.vectorstore.clear()

    def retrieve(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        """Retrieve top-k relevant document chunks with similarity scores."""
        query_embedding = self.embeddings.embed_query(query)
        results = self.vectorstore.similarity_search(query_embedding, k=k)
        return results

    def get_stats(self) -> Dict[str, Any]:
        """Return diagnostic metrics about the vector store."""
        total_chunks = 0
        dim = None
        try:
            total_chunks = self.vectorstore.collection.count()
            dim = self.vectorstore.get_dimension()
        except Exception:
            pass

        return {
            "total_chunks": total_chunks,
            "embedding_dimension": dim,
            "collection_name": getattr(self.vectorstore.collection, "name", "default"),
            "embedding_model": self.embeddings._get_embedding_model() or "deterministic-hash",
            "vector_store": "ChromaDB (Local)"
        }

