import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

BASE_DIR = os.getcwd()
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "data", "uploads"))
OUTPUTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "data", "outputs"))
LEGACY_OUTPUTS_DIR = os.path.abspath(os.path.join(BASE_DIR, "local_outputs"))

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(LEGACY_OUTPUTS_DIR, exist_ok=True)

def _is_safe_path(base_dir: str, path: str) -> bool:
    try:
        common = os.path.commonpath([os.path.abspath(path), os.path.abspath(base_dir)])
        return common == os.path.abspath(base_dir)
    except Exception:
        return False

@router.post("/upload")
async def upload_task_file(file: UploadFile = File(...)):
    # Sanitize filename
    safe_filename = os.path.basename(file.filename)
    if not safe_filename or safe_filename in [".", ".."]:
        safe_filename = "unnamed_upload.bin"

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(safe_filename)[1]
    saved_filename = f"{file_id}{ext}"
    target_path = os.path.abspath(os.path.join(UPLOAD_DIR, saved_filename))

    if not _is_safe_path(UPLOAD_DIR, target_path):
        raise HTTPException(status_code=400, detail="Invalid filename or path traversal detected")

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    return {
        "file_id": file_id,
        "filename": safe_filename,
        "saved_filename": saved_filename,
        "path": target_path,
        "size": file_size,
        "mime_type": file.content_type
    }

@router.get("/{file_id}/download")
async def download_file(file_id: str, format: str = "txt"):
    safe_id = os.path.basename(file_id)
    safe_format = os.path.basename(format)
    file_with_ext = f"{safe_id}.{safe_format}" if not safe_id.endswith(f".{safe_format}") else safe_id

    # Check search directories in priority order: data/outputs -> local_outputs -> data/uploads
    search_locations = [
        (OUTPUTS_DIR, file_with_ext),
        (OUTPUTS_DIR, safe_id),
        (LEGACY_OUTPUTS_DIR, file_with_ext),
        (LEGACY_OUTPUTS_DIR, safe_id),
        (UPLOAD_DIR, safe_id),
        (UPLOAD_DIR, file_with_ext)
    ]

    for dir_path, fname in search_locations:
        candidate = os.path.abspath(os.path.join(dir_path, fname))
        if _is_safe_path(dir_path, candidate) and os.path.isfile(candidate):
            return FileResponse(path=candidate, filename=fname)

    # Prefix match in uploads (e.g. uuid.png)
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(safe_id):
                candidate = os.path.abspath(os.path.join(UPLOAD_DIR, fname))
                if _is_safe_path(UPLOAD_DIR, candidate) and os.path.isfile(candidate):
                    return FileResponse(path=candidate, filename=fname)

    raise HTTPException(status_code=404, detail="File not found")
