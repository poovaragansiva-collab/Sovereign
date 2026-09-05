from typing import List, Dict, Any
from ..loaders import TextLoader
from ..chunking import TextSplitter
from ..embeddings import LocalEmbeddings
from ..vectorstore import LocalVectorStore

class RAGRetriever:
    """High-level retriever interface that orchestrates the RAG pipeline."""
    def __init__(self, vectorstore: LocalVectorStore, embeddings: LocalEmbeddings):
        self.vectorstore = vectorstore
        self.embeddings = embeddings
        
    def index_document(self, file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200):
        loader = TextLoader()
        docs = loader.load(file_path)
        
        splitter = TextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = splitter.split_documents(docs)
        
        if chunks:
            texts = [c["text"] for c in chunks]
            metadatas = [c["metadata"] for c in chunks]
            
            # Generate embeddings and add to store
            embedded = self.embeddings.embed_documents(texts)
            self.vectorstore.add_texts(texts, metadatas, embedded)
            
    def retrieve(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        query_embedding = self.embeddings.embed_query(query)
        return self.vectorstore.similarity_search(query_embedding, k=k)
