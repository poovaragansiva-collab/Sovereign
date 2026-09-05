from typing import TypedDict, Optional, List, Dict, Any
try:
    from typing import NotRequired
except ImportError:
    from typing_extensions import NotRequired

class AgentState(TypedDict):
    """
    Typed state object containing information for the agent workflow.
    """
    task: str
    task_type: str
    capability: str
    selected_model: Optional[str]
    input_data: NotRequired[Dict[str, Any]]
    tool_results: NotRequired[List[Dict[str, Any]]]
    retrieved_context: NotRequired[List[Dict[str, Any]]]
    vision_results: NotRequired[Dict[str, Any]]
    response: Optional[str]
    verification: NotRequired[Dict[str, Any]]
    errors: NotRequired[List[str]]
    metadata: NotRequired[Dict[str, Any]]
