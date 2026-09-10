import os
import shutil
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.session import get_db
from backend.db.models import Document, AuditLog

router = APIRouter()

BASE_DIR = os.getcwd()
DOCUMENTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "data", "documents"))
os.makedirs(DOCUMENTS_DIR, exist_ok=True)

def _is_safe_path(base_dir: str, path: str) -> bool:
    try:
        common = os.path.commonpath([os.path.abspath(path), os.path.abspath(base_dir)])
        return common == os.path.abspath(base_dir)
    except Exception:
        return False

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    safe_filename = os.path.basename(file.filename)
    if not safe_filename or safe_filename in [".", ".."]:
        safe_filename = "unnamed_document.bin"

    doc_uuid = str(uuid.uuid4())
    ext = os.path.splitext(safe_filename)[1]
    saved_filename = f"{doc_uuid}_{safe_filename}"
    target_path = os.path.abspath(os.path.join(DOCUMENTS_DIR, saved_filename))

    if not _is_safe_path(DOCUMENTS_DIR, target_path):
        raise HTTPException(status_code=400, detail="Invalid filename or path traversal detected")

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store document: {str(e)}")

    # Index into RAG vectorstore
    chunks_count = 0
    page_count = 1
    ocr_applied = False
    index_status = "ready"
    try:
        from backend.api.v1.rag import get_rag_retriever
        retriever = get_rag_retriever()
        idx_res = retriever.index_document(target_path)
        chunks_count = idx_res.get("chunks_count", 0)
        page_count = idx_res.get("page_count", 1)
        ocr_applied = idx_res.get("ocr_applied", False)
    except Exception as e:
        index_status = "failed"

    doc_record = Document(
        filename=safe_filename,
        file_path=target_path,
        mime_type=file.content_type,
        size=file_size,
        indexed=(index_status == "ready"),
        chunks_count=chunks_count,
        ocr_applied=ocr_applied,
        page_count=page_count,
        status=index_status
    )
    db.add(doc_record)
    
    audit = AuditLog(
        action="DOCUMENT_UPLOADED",
        details=f"Uploaded and indexed '{safe_filename}' ({file_size} bytes, {chunks_count} chunks, {page_count} pages, OCR: {ocr_applied})"
    )
    db.add(audit)
    db.commit()
    db.refresh(doc_record)

    return {
        "id": doc_record.id,
        "filename": doc_record.filename,
        "file_path": doc_record.file_path,
        "size": doc_record.size,
        "mime_type": doc_record.mime_type,
        "indexed": doc_record.indexed,
        "chunks_count": doc_record.chunks_count,
        "page_count": doc_record.page_count,
        "ocr_applied": doc_record.ocr_applied,
        "status": doc_record.status,
        "created_at": doc_record.created_at.isoformat() if doc_record.created_at else None
    }

@router.get("/")
def list_documents(query: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Document)
    if query:
        q = q.filter(Document.filename.ilike(f"%{query}%"))
    
    docs = q.order_by(desc(Document.created_at)).all()
    return {
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "file_path": d.file_path,
                "size": d.size,
                "mime_type": d.mime_type,
                "indexed": d.indexed,
                "chunks_count": getattr(d, "chunks_count", 0),
                "page_count": getattr(d, "page_count", 1),
                "ocr_applied": getattr(d, "ocr_applied", False),
                "status": getattr(d, "status", "ready"),
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None
            }
            for d in docs
        ]
    }

@router.get("/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_path": doc.file_path,
        "size": doc.size,
        "mime_type": doc.mime_type,
        "indexed": doc.indexed,
        "chunks_count": getattr(doc, "chunks_count", 0),
        "page_count": getattr(doc, "page_count", 1),
        "ocr_applied": getattr(doc, "ocr_applied", False),
        "status": getattr(doc, "status", "ready"),
        "created_at": doc.created_at.isoformat() if doc.created_at else None
    }


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove physical file if exists
    if os.path.exists(doc.file_path) and _is_safe_path(DOCUMENTS_DIR, doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # Prune chunks from vectorstore
    try:
        from backend.api.v1.rag import get_rag_retriever
        get_rag_retriever().delete_document(doc.file_path)
    except Exception:
        pass

    filename = doc.filename
    db.delete(doc)

    audit = AuditLog(
        action="DOCUMENT_DELETED",
        details=f"Deleted document '{filename}' (ID: {document_id})"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Document '{filename}' deleted"}
