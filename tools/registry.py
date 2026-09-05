from typing import Dict, List, Optional
from .interface import ToolInterface

class ToolRegistry:
    """
    Registry for managing available tools.
    """
    def __init__(self):
        self._tools: Dict[str, ToolInterface] = {}
        
    def register(self, tool: ToolInterface) -> None:
        """Registers a new tool."""
        self._tools[tool.name] = tool
        
    def get_tool(self, name: str) -> Optional[ToolInterface]:
        """Retrieves a tool by name."""
        return self._tools.get(name)
        
    def list_tools(self) -> List[ToolInterface]:
        """Lists all registered tools."""
        return list(self._tools.values())
        
    def remove_tool(self, name: str) -> bool:
        """Removes a tool from the registry. Returns True if removed."""
        if name in self._tools:
            del self._tools[name]
            return True
        return False
