import os
import uuid
import datetime
from typing import Optional, Any, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import Output, AuditLog
from outputs.pdf import PDFOutputGenerator
from outputs.docx import DOCXOutputGenerator
from outputs.xlsx import XLSXOutputGenerator
from outputs.pptx import PPTXOutputGenerator
from outputs.basic import JSONOutputGenerator, TXTOutputGenerator

router = APIRouter()

OUTPUTS_DIR = os.path.abspath(os.path.join(os.getcwd(), "local_outputs"))
os.makedirs(OUTPUTS_DIR, exist_ok=True)

class GenerateOutputRequest(BaseModel):
    title: str
    content: Any
    format: str  # "pdf", "docx", "xlsx", "pptx", "json", "txt", "md"
    task_id: Optional[str] = None
    conversation_id: Optional[str] = None

@router.get("/")
def list_outputs(db: Session = Depends(get_db)):
    """List all generated outputs."""
    db_outputs = db.query(Output).order_by(desc(Output.created_at)).all()
    results = []
    for o in db_outputs:
        f_size = o.file_size
        if f_size == 0 and os.path.exists(o.file_path):
            f_size = os.path.getsize(o.file_path)
        results.append({
            "id": o.id,
            "filename": o.filename,
            "format": o.format,
            "file_size": f_size,
            "task_id": o.task_id,
            "conversation_id": o.conversation_id,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
    return {"outputs": results}

@router.post("/generate")
def generate_output(req: GenerateOutputRequest, db: Session = Depends(get_db)):
    """Generate a downloadable output file in the specified format."""
    fmt = req.format.lower()
    clean_title = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip()
    if not clean_title:
        clean_title = "Report"
    
    filename_base = f"{clean_title}_{uuid.uuid4().hex[:6]}"

    if fmt == "pdf":
        gen = PDFOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base)
    elif fmt in ["docx", "word"]:
        gen = DOCXOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base)
        fmt = "docx"
    elif fmt in ["xlsx", "excel"]:
        gen = XLSXOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base)
        fmt = "xlsx"
    elif fmt in ["pptx", "powerpoint"]:
        gen = PPTXOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base, metadata={"title": req.title})
        fmt = "pptx"
    elif fmt == "json":
        gen = JSONOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base)
    else:
        gen = TXTOutputGenerator(OUTPUTS_DIR)
        res = gen.generate(content=req.content, filename=filename_base)
        fmt = "txt"

    if res.get("status") != "success":
        errors = res.get("errors", ["Unknown generator error"])
        raise HTTPException(status_code=500, detail=f"Generation failed: {'; '.join(errors)}")

    target_path = res["path"]
    final_filename = res["filename"]
    f_size = os.path.getsize(target_path) if os.path.exists(target_path) else 0

    record = Output(
        filename=final_filename,
        file_path=target_path,
        format=fmt,
        file_size=f_size,
        task_id=req.task_id,
        conversation_id=req.conversation_id
    )
    db.add(record)
    
    audit = AuditLog(
        action="OUTPUT_GENERATED",
        details=f"Generated {fmt.upper()} output '{final_filename}' ({f_size} bytes)"
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "filename": record.filename,
        "format": record.format,
        "file_size": record.file_size,
        "task_id": record.task_id,
        "conversation_id": record.conversation_id,
        "created_at": record.created_at.isoformat() if record.created_at else None
    }

@router.get("/{output_id}/download")
def download_output(output_id: int, db: Session = Depends(get_db)):
    """Download an existing output file."""
    record = db.query(Output).filter(Output.id == output_id).first()
    if not record or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Output file not found on disk")

    mime_map = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "json": "application/json",
        "txt": "text/plain",
        "md": "text/markdown"
    }

    mime_type = mime_map.get(record.format, "application/octet-stream")
    return FileResponse(
        path=record.file_path,
        filename=record.filename,
        media_type=mime_type
    )
