import uuid
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import Task, TaskFile, Output, AuditLog
from backend.services.task_intelligence import TaskIntelligenceService
from backend.api.v1.models import sync_sovereign_models_env
from ai.execution_contract import AITaskInput
from ai.execution import AIExecutionService

router = APIRouter()
task_intelligence = TaskIntelligenceService()

class CreateTaskRequest(BaseModel):
    task: str
    capability: Optional[str] = None
    task_type: Optional[str] = "general"
    files: List[str] = Field(default_factory=list)
    options: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TaskExecuteDirectRequest(BaseModel):
    task: str
    capability: Optional[str] = None
    task_type: Optional[str] = "general"
    files: List[str] = Field(default_factory=list)
    options: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

@router.post("/")
def create_task(req: CreateTaskRequest, db: Session = Depends(get_db)):
    """Create a new AI task in PostgreSQL with Task Intelligence pre-analysis."""
    analysis = task_intelligence.analyze(
        task=req.task,
        files=req.files,
        capability=req.capability,
        task_type=req.task_type,
        options=req.options
    )

    task_id = str(uuid.uuid4())
    
    # Merge detected options if not explicitly provided
    merged_options = dict(req.options)
    if analysis.output_format and "output_format" not in merged_options and "format" not in merged_options:
        merged_options["output_format"] = analysis.output_format

    db_task = Task(
        task_id=task_id,
        task=req.task,
        task_type=analysis.task_type,
        capability=analysis.capability,
        status="queued"
    )
    db.add(db_task)

    # Attach files
    for f in req.files:
        db_file = TaskFile(
            task_id=task_id,
            filename=f.split("/")[-1].split("\\")[-1],
            file_path=f
        )
        db.add(db_file)

    # Audit log
    audit = AuditLog(
        task_id=task_id,
        action="TASK_CREATED",
        details=f"Created task '{req.task[:50]}' (capability: {analysis.capability})"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_task)

    return {
        "task_id": task_id,
        "task": db_task.task,
        "capability": db_task.capability,
        "task_type": db_task.task_type,
        "status": db_task.status,
        "intelligence": analysis.to_dict(),
        "created_at": db_task.created_at.isoformat()
    }

@router.post("/{task_id}/execute")
def execute_task_by_id(task_id: str, db: Session = Depends(get_db)):
    """Execute an existing task through the AI Engine."""
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    # Sync model configuration with AI Engine
    sync_sovereign_models_env(db)

    # Gather attached files
    task_files = [tf.file_path for tf in db_task.files]

    # Re-run task intelligence for options/tool extraction
    analysis = task_intelligence.analyze(
        task=db_task.task,
        files=task_files,
        capability=db_task.capability,
        task_type=db_task.task_type
    )

    task_input = AITaskInput(
        task_id=task_id,
        task=db_task.task,
        task_type=db_task.task_type,
        capability=db_task.capability,
        input_data=analysis.input_data,
        files=task_files,
        options={"output_format": analysis.output_format} if analysis.output_format else {},
        metadata={"created_at": db_task.created_at.isoformat()}
    )

    # Update status to executing
    db_task.status = "executing"
    db.commit()

    try:
        service = AIExecutionService()
        output = service.execute(task_input)

        # Update task in DB
        db_task.status = output.status.value
        db_task.answer = output.answer
        db_task.model_used = output.model_used
        db_task.completed_at = datetime.datetime.utcnow()

        if output.verification:
            db_task.verification_status = output.verification.get("status")
            db_task.verification_confidence = output.verification.get("confidence")

        if output.errors:
            db_task.error = "\n".join(output.errors)

        # Store generated output records
        for gen_file in output.files:
            out_rec = Output(
                task_id=task_id,
                filename=gen_file.get("filename", f"{task_id}.{gen_file.get('format', 'bin')}"),
                file_path=gen_file.get("path", ""),
                format=gen_file.get("format", "txt")
            )
            db.add(out_rec)

        # Audit log
        audit = AuditLog(
            task_id=task_id,
            action="TASK_EXECUTED",
            details=f"Task completed with status '{output.status.value}' using model '{output.model_used}'"
        )
        db.add(audit)
        db.commit()

        return output.to_dict()
    except Exception as e:
        db_task.status = "failed"
        db_task.error = str(e)
        db_task.completed_at = datetime.datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

@router.post("/execute")
def execute_task_direct(req: TaskExecuteDirectRequest, db: Session = Depends(get_db)):
    """Convenience endpoint: create and immediately execute task."""
    # 1. Run Task Intelligence
    analysis = task_intelligence.analyze(
        task=req.task,
        files=req.files,
        capability=req.capability,
        task_type=req.task_type,
        options=req.options
    )

    task_id = str(uuid.uuid4())
    
    # 2. Sync model configuration
    sync_sovereign_models_env(db)

    # 3. Create DB record
    db_task = Task(
        task_id=task_id,
        task=req.task,
        task_type=analysis.task_type,
        capability=analysis.capability,
        status="executing"
    )
    db.add(db_task)

    for f in req.files:
        db.add(TaskFile(task_id=task_id, filename=f.split("/")[-1].split("\\")[-1], file_path=f))
    
    db.commit()

    # 4. Construct AITaskInput
    merged_options = dict(req.options)
    if analysis.output_format and "output_format" not in merged_options and "format" not in merged_options:
        merged_options["output_format"] = analysis.output_format

    task_input = AITaskInput(
        task_id=task_id,
        task=req.task,
        task_type=analysis.task_type,
        capability=analysis.capability,
        input_data=analysis.input_data,
        files=req.files,
        options=merged_options,
        metadata=req.metadata
    )

    try:
        service = AIExecutionService()
        output = service.execute(task_input)

        # 5. Update DB
        db_task.status = output.status.value
        db_task.answer = output.answer
        db_task.model_used = output.model_used
        db_task.completed_at = datetime.datetime.utcnow()

        if output.verification:
            db_task.verification_status = output.verification.get("status")
            db_task.verification_confidence = output.verification.get("confidence")

        if output.errors:
            db_task.error = "\n".join(output.errors)

        for gen_file in output.files:
            db.add(Output(
                task_id=task_id,
                filename=gen_file.get("filename", f"{task_id}.{gen_file.get('format', 'bin')}"),
                file_path=gen_file.get("path", ""),
                format=gen_file.get("format", "txt")
            ))

        db.add(AuditLog(
            task_id=task_id,
            action="TASK_EXECUTED",
            details=f"Direct task executed with status '{output.status.value}' (model: {output.model_used})"
        ))
        db.commit()

        return output.to_dict()
    except Exception as e:
        db_task.status = "failed"
        db_task.error = str(e)
        db_task.completed_at = datetime.datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

@router.get("/")
def list_tasks(
    status: Optional[str] = Query(None),
    capability: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve list of tasks with optional filters."""
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == status)
    if capability:
        q = q.filter(Task.capability == capability)

    tasks = q.order_by(desc(Task.created_at)).limit(limit).all()

    return {
        "tasks": [
            {
                "task_id": t.task_id,
                "task": t.task,
                "task_type": t.task_type,
                "capability": t.capability,
                "status": t.status,
                "model_used": t.model_used,
                "verification_status": t.verification_status,
                "verification_confidence": t.verification_confidence,
                "error": t.error,
                "created_time": t.created_at.isoformat() if t.created_at else None,
                "completed_time": t.completed_at.isoformat() if t.completed_at else None
            }
            for t in tasks
        ]
    }

@router.get("/{task_id}")
def get_task_details(task_id: str, db: Session = Depends(get_db)):
    """Retrieve comprehensive task details including files, outputs, and verification."""
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_files = [
        {"id": f.id, "filename": f.filename, "file_path": f.file_path, "size": f.size}
        for f in db_task.files
    ]

    outputs = [
        {"id": o.id, "filename": o.filename, "file_path": o.file_path, "format": o.format}
        for o in db_task.outputs
    ]

    return {
        "task_id": db_task.task_id,
        "task": db_task.task,
        "task_type": db_task.task_type,
        "capability": db_task.capability,
        "status": db_task.status,
        "model_used": db_task.model_used,
        "answer": db_task.answer,
        "error": db_task.error,
        "verification": {
            "status": db_task.verification_status,
            "confidence": db_task.verification_confidence
        } if db_task.verification_status else None,
        "files": task_files,
        "outputs": outputs,
        "created_time": db_task.created_at.isoformat() if db_task.created_at else None,
        "completed_time": db_task.completed_at.isoformat() if db_task.completed_at else None
    }

@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    """Delete a task and its associated files and outputs."""
    db_task = db.query(Task).filter(Task.task_id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.add(AuditLog(
        task_id=task_id,
        action="TASK_DELETED",
        details=f"Deleted task {task_id}"
    ))
    db.commit()

    return {"status": "success", "message": f"Task {task_id} deleted"}
