import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
OUTPUTS_DIR = os.path.join(os.getcwd(), "local_outputs")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Sanitize filename to prevent path traversal
    safe_filename = os.path.basename(file.filename)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(safe_filename)[1]
    saved_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_name)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    return {
        "file_id": file_id,
        "filename": safe_filename,
        "path": file_path
    }

@router.get("/{file_id}/download")
async def download_file(file_id: str, format: str = "txt"):
    # Basic path traversal protection
    safe_id = os.path.basename(file_id)
    safe_format = os.path.basename(format)
    file_name = f"{safe_id}.{safe_format}"
    file_path = os.path.join(OUTPUTS_DIR, file_name)
    
    if not os.path.exists(file_path):
        # Could also be in uploads depending on usecase, but req says generated files
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(path=file_path, filename=file_name)
