from abc import ABC, abstractmethod
from typing import Dict, Any, List
from enum import Enum
from pydantic import BaseModel

class PluginPermission(str, Enum):
    READ_SYSTEM_INFO = "read_system_info"
    READ_FILES = "read_files"
    WRITE_OUTPUTS = "write_outputs"
    RUN_LOCAL_CODE = "run_local_code"
    NETWORK_LOCAL_ONLY = "network_local_only"

class PluginMetadata(BaseModel):
    name: str
    version: str
    description: str
    author: str
    permissions: List[PluginPermission]
    enabled_by_default: bool = True

class BasePlugin(ABC):
    """
    Abstract Base Class for all Sovereign Local Plugins.
    Security constraint: Every plugin MUST declare its permissions upfront.
    """
    metadata: PluginMetadata

    @abstractmethod
    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific action exposed by this plugin."""
        pass

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.metadata.name,
            "version": self.metadata.version,
            "description": self.metadata.description,
            "author": self.metadata.author,
            "permissions": [p.value for p in self.metadata.permissions],
            "enabled_by_default": self.metadata.enabled_by_default
        }
