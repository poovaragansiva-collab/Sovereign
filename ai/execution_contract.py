from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

class TaskStatus(str, Enum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    ROUTING = "routing"
    EXECUTING = "executing"
    RETRIEVING = "retrieving"
    VERIFYING = "verifying"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_APPROVAL = "needs_approval"

@dataclass
class AITaskInput:
    task_id: str
    task: str
    task_type: str = "general"
    capability: Optional[str] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    files: List[str] = field(default_factory=list)
    options: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task": self.task,
            "task_type": self.task_type,
            "capability": self.capability,
            "input_data": self.input_data,
            "files": self.files,
            "options": self.options,
            "metadata": self.metadata
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AITaskInput':
        return cls(**data)

@dataclass
class AITaskOutput:
    task_id: str
    status: TaskStatus
    answer: str
    model_used: Optional[str] = None
    sources: List[str] = field(default_factory=list)
    files: List[Dict[str, Any]] = field(default_factory=list)
    verification: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "status": self.status.value,
            "answer": self.answer,
            "model_used": self.model_used,
            "sources": self.sources,
            "files": self.files,
            "verification": self.verification,
            "errors": self.errors,
            "metadata": self.metadata
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AITaskOutput':
        if "status" in data and isinstance(data["status"], str):
            data["status"] = TaskStatus(data["status"])
        return cls(**data)
