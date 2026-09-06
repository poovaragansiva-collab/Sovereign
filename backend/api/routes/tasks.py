from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import uuid
import os
import json

from ai.execution import AIExecutionService
from ai.execution_contract import AITaskInput

router = APIRouter()

# Instantiate the service once, but we need to override how it builds the registry 
# if we want it to use the DB instead of the env var. 
# Alternatively, since we don't want to rewrite AIExecutionService, we can inject 
# the SOVEREIGN_MODELS env var before execution based on DB contents, 
# or we just rely on the existing _build_registry fallback.
# Wait, the requirements state: "DO NOT rewrite AIExecutionService".
# We must use local persistent configuration, and AIExecutionService reads os.getenv("SOVEREIGN_MODELS").
# So we can dynamically set os.environ["SOVEREIGN_MODELS"] before calling AIExecutionService.

class TaskExecuteRequest(BaseModel):
    task: str
    capability: str = "general"
    task_type: str = "general"
    input_data: Dict[str, Any] = Field(default_factory=dict)
    files: List[str] = Field(default_factory=list)
    options: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

@router.post("/execute")
def execute_task(req: TaskExecuteRequest):
    # Set the SOVEREIGN_MODELS env var based on DB so AIExecutionService sees it
    from backend.services.config_db import get_all_models, save_task
    db_models = get_all_models()
    
    if db_models:
        os.environ["SOVEREIGN_MODELS"] = json.dumps(db_models)

    task_id = str(uuid.uuid4())
    
    task_input = AITaskInput(
        task_id=task_id,
        task=req.task,
        task_type=req.task_type,
        capability=req.capability,
        input_data=req.input_data,
        files=req.files,
        options=req.options,
        metadata=req.metadata
    )
    
    try:
        service = AIExecutionService()
        output = service.execute(task_input)
        
        # Save to history
        save_task(task_id, req.task, req.capability, output.model_used or "unknown", output.status.value)
        
        return output.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def list_tasks():
    from backend.services.config_db import get_tasks
    return {"tasks": get_tasks()}

@router.get("/{task_id}")
def get_task_details(task_id: str):
    from backend.services.config_db import get_task
    t = get_task(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t
