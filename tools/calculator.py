import operator
from typing import Dict, Any
from .interface import ToolInterface

class CalculatorTool(ToolInterface):
    """
    A simple, safe calculator tool for basic arithmetic.
    """
    @property
    def name(self) -> str:
        return "calculator"
        
    @property
    def description(self) -> str:
        return "Performs basic arithmetic operations (+, -, *, /)"
    
    def get_input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
                "op": {"type": "string", "enum": ["+", "-", "*", "/"]}
            },
            "required": ["a", "b", "op"]
        }
        
    def execute(self, a: float, b: float, op: str) -> float:
        ops = {
            "+": operator.add,
            "-": operator.sub,
            "*": operator.mul,
            "/": operator.truediv
        }
        
        if op not in ops:
            raise ValueError(f"Unknown operator: {op}")
            
        if op == "/" and b == 0:
            raise ValueError("Division by zero")
            
        return float(ops[op](a, b))
