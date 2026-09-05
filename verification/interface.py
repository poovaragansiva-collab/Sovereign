from abc import ABC, abstractmethod
from typing import Dict, Any

class VerifierInterface(ABC):
    @abstractmethod
    def verify(self, result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verifies a generated result based on the provided context.
        Returns a structured verification result (status, confidence, issues, evidence, notes).
        """
        pass
