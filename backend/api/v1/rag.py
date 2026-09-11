import os
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import Document, AuditLog
from rag.retriever import RAGRetriever
from rag.vectorstore import LocalVectorStore
from rag.embeddings import LocalEmbeddings

router = APIRouter()

# Global retriever singleton
_retriever = None

def get_rag_retriever() -> RAGRetriever:
    global _retriever
    if _retriever is None:
        vs = LocalVectorStore(persist_directory="./chroma_db", collection_name="sovereign_docs")
        em = LocalEmbeddings()
        _retriever = RAGRetriever(vectorstore=vs, embeddings=em)
    return _retriever

class RAGQueryTestRequest(BaseModel):
    query: str
    k: Optional[int] = 4

class RAGReindexRequest(BaseModel):
    document_ids: Optional[List[int]] = None
    reset: Optional[bool] = False

@router.get("/status")
def get_rag_status(db: Session = Depends(get_db)):
    """Return RAG health and diagnostics statistics."""
    total_docs = db.query(Document).count()
    indexed_docs = db.query(Document).filter(Document.indexed == True).count()
    failed_docs = db.query(Document).filter(Document.status == "failed").count()

    retriever = get_rag_retriever()
    stats = retriever.get_stats()

    return {
        "status": "ready" if total_docs > 0 else "uninitialized",
        "documents": {
            "total": total_docs,
            "indexed": indexed_docs,
            "failed": failed_docs
        },
        "vector_store": stats["vector_store"],
        "collection_name": stats["collection_name"],
        "total_chunks": stats["total_chunks"],
        "embedding_dimension": stats.get("embedding_dimension"),
        "embedding_model": stats["embedding_model"],
        "ocr_available": True
    }

from backend.core.deps import get_current_user
from backend.db.models import User, Document, AuditLog

@router.post("/test")
def test_rag_retrieval(req: RAGQueryTestRequest, current_user: User = Depends(get_current_user)):
    """
    RAG Sandbox query test:
    Retrieves chunks for a query and displays text, source, page, and similarity scores.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    retriever = get_rag_retriever()
    try:
        raw_chunks = retriever.retrieve(query=req.query, user_id=current_user.id, k=req.k or 4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval error: {str(e)}")

    retrieved_chunks = []
    sources = set()

    for c in raw_chunks:
        meta = c.get("metadata", {})
        source_name = os.path.basename(str(meta.get("source", "Document")))
        # Clean UUID prefix if present
        if len(source_name) > 37 and source_name[36] == '_' and source_name[:8].isalnum():
            source_name = source_name[37:]
        page_num = meta.get("page", 1)
        score = c.get("score")
        retrieved_chunks.append({
            "id": c.get("id"),
            "text": c.get("text"),
            "source": source_name,
            "page": page_num,
            "score": round(score, 4) if score is not None else None,
            "ocr_applied": meta.get("ocr_applied", False)
        })
        sources.add(f"{source_name} (Page {page_num})")

    context_preview = "\n\n".join([
        f"--- [{c['source']} — Page {c['page']}] (Distance: {c['score']}) ---\n{c['text'][:300]}"
        for c in retrieved_chunks
    ])

    return {
        "query": req.query,
        "chunks_retrieved_count": len(retrieved_chunks),
        "sources": list(sources),
        "chunks": retrieved_chunks,
        "final_context_preview": context_preview
    }

@router.post("/reindex")
def reindex_documents(req: Optional[RAGReindexRequest] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Reindex uploaded documents through the RAG pipeline."""
    retriever = get_rag_retriever()

    if req and req.reset:
        retriever.clear()

    q = db.query(Document).filter(Document.user_id == current_user.id)
    if req and req.document_ids:
        q = q.filter(Document.id.in_(req.document_ids))
    docs = q.all()

    if not docs:
        return {"status": "success", "message": "No documents to reindex", "reindexed_count": 0}

    reindexed_count = 0
    total_chunks = 0

    for doc in docs:
        if os.path.exists(doc.file_path):
            try:
                doc.status = "indexing"
                db.commit()
                res = retriever.index_document(doc.file_path, user_id=current_user.id)
                doc.indexed = True
                doc.chunks_count = res.get("chunks_count", 0)
                doc.page_count = res.get("page_count", 1)
                doc.ocr_applied = res.get("ocr_applied", False)
                doc.status = "ready"
                db.commit()
                reindexed_count += 1
                total_chunks += doc.chunks_count
            except Exception as e:
                doc.status = "failed"
                db.commit()

    audit = AuditLog(
        action="RAG_REINDEXED",
        details=f"Reindexed {reindexed_count} documents ({total_chunks} total chunks, reset={req.reset if req else False})"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully reindexed {reindexed_count} documents",
        "reindexed_count": reindexed_count,
        "total_chunks_added": total_chunks
    }
