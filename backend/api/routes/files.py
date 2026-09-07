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
    
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=file_name)
        
    # Check direct filename in OUTPUTS_DIR
    direct_path = os.path.join(OUTPUTS_DIR, safe_id)
    if os.path.exists(direct_path) and os.path.isfile(direct_path):
        return FileResponse(path=direct_path, filename=safe_id)

    # Check UPLOAD_DIR
    upload_path = os.path.join(UPLOAD_DIR, safe_id)
    if os.path.exists(upload_path) and os.path.isfile(upload_path):
        return FileResponse(path=upload_path, filename=safe_id)
        
    # Check with format extension in UPLOAD_DIR
    upload_ext_path = os.path.join(UPLOAD_DIR, file_name)
    if os.path.exists(upload_ext_path) and os.path.isfile(upload_ext_path):
        return FileResponse(path=upload_ext_path, filename=file_name)

    # Check for file matching safe_id prefix in UPLOAD_DIR
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(safe_id):
                matched = os.path.join(UPLOAD_DIR, f)
                if os.path.isfile(matched):
                    return FileResponse(path=matched, filename=f)

    raise HTTPException(status_code=404, detail="File not found")
