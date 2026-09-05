from abc import ABC, abstractmethod
from typing import Dict, Any

class ToolInterface(ABC):
    """
    Standard interface for local tools.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """The name of the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does."""
        pass
    
    @abstractmethod
    def execute(self, **kwargs) -> Any:
        """Executes the tool with the provided arguments."""
        pass
        
    @abstractmethod
    def get_input_schema(self) -> Dict[str, Any]:
        """Returns the JSON schema for the tool's expected input."""
        pass
