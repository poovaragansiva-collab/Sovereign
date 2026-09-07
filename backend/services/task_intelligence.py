import re
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class TaskAnalysisResult:
    task_type: str
    capability: str
    output_format: Optional[str] = None
    tools_to_run: List[Dict[str, Any]] = field(default_factory=list)
    rag_query: Optional[str] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_type": self.task_type,
            "capability": self.capability,
            "output_format": self.output_format,
            "tools_to_run": self.tools_to_run,
            "rag_query": self.rag_query,
            "input_data": self.input_data,
            "metadata": self.metadata
        }

class TaskIntelligenceService:
    """
    Deterministic rule-based Task Intelligence engine.
    Analyzes task description, attached files, and options to determine
    the execution requirements without making external AI calls.
    """

    IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif"}
    DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv", ".json"}
    CODE_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx", ".cpp", ".c", ".java", ".go", ".rs", ".sql", ".sh"}

    def analyze(
        self,
        task: str,
        files: Optional[List[str]] = None,
        capability: Optional[str] = None,
        task_type: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> TaskAnalysisResult:
        files = files or []
        options = options or {}
        task_lower = task.lower().strip()
        
        # 1. Determine Output Format
        output_format = options.get("output_format") or options.get("format")
        if not output_format:
            output_format = self._detect_output_format(task_lower)

        # 2. Inspect Files
        has_image = any(os.path.splitext(f)[1].lower() in self.IMAGE_EXTENSIONS for f in files)
        has_code_file = any(os.path.splitext(f)[1].lower() in self.CODE_EXTENSIONS for f in files)
        has_document = any(os.path.splitext(f)[1].lower() in self.DOCUMENT_EXTENSIONS for f in files)

        # 3. Detect Tools (e.g. Calculator)
        tools_to_run = []
        calc_match = self._detect_calculator_expression(task)
        if calc_match:
            tools_to_run.append({
                "name": "calculator",
                "args": calc_match
            })

        # 4. Determine Capability
        determined_capability = capability
        if not determined_capability or determined_capability == "auto":
            if has_image or any(k in task_lower for k in ["image", "photo", "picture", "ocr", "scan", "diagram", "screenshot"]):
                determined_capability = "vision"
            elif has_code_file or self._is_coding_task(task_lower):
                determined_capability = "coding"
            elif self._is_reasoning_task(task_lower):
                determined_capability = "reasoning"
            else:
                determined_capability = "general"

        # 5. Determine Task Type
        determined_type = task_type
        if not determined_type or determined_type == "general":
            if determined_capability == "coding":
                determined_type = "coding"
            elif determined_capability == "vision":
                determined_type = "vision"
            elif tools_to_run:
                determined_type = "calculation"
            elif has_document or any(k in task_lower for k in ["summarize", "summary", "analyze", "extract", "search in"]):
                determined_type = "analysis"
            elif determined_capability == "reasoning":
                determined_type = "reasoning"
            else:
                determined_type = "general"

        # 6. RAG Context Routing
        rag_query = None
        if has_document and determined_capability != "vision":
            rag_query = task

        input_data = dict(options.get("input_data", {}))
        if tools_to_run:
            input_data["tools_to_run"] = tools_to_run
        if rag_query:
            input_data["rag_query"] = rag_query
        if has_image and files:
            for f in files:
                if os.path.splitext(f)[1].lower() in self.IMAGE_EXTENSIONS:
                    input_data["image_path"] = f
                    break

        return TaskAnalysisResult(
            task_type=determined_type,
            capability=determined_capability,
            output_format=output_format,
            tools_to_run=tools_to_run,
            rag_query=rag_query,
            input_data=input_data,
            metadata={"inferred": True}
        )

    def _detect_output_format(self, text: str) -> Optional[str]:
        if re.search(r'\b(as\s+a\s+|in\s+)?pdf(\s+format|\s+file|\s+document)?\b', text):
            return "pdf"
        if re.search(r'\b(as\s+a\s+|in\s+)?(docx|word|doc)(\s+format|\s+file|\s+document)?\b', text):
            return "docx"
        if re.search(r'\b(as\s+a\s+|in\s+)?(xlsx|excel|spreadsheet|csv)(\s+format|\s+file)?\b', text):
            return "xlsx"
        if re.search(r'\b(as\s+a\s+|in\s+)?json(\s+format|\s+object)?\b', text):
            return "json"
        if re.search(r'\b(as\s+a\s+|in\s+)?(txt|text|plain\s+text)(\s+file)?\b', text):
            return "txt"
        return None

    def _is_coding_task(self, text: str) -> bool:
        coding_patterns = [
            r'\bpython\b', r'\bjavascript\b', r'\btypescript\b', r'\bjava\b', r'\bc\+\+\b', r'\brust\b', r'\bgolang\b',
            r'\bsql\b', r'\bhtml\b', r'\bcss\b', r'\bfunction\b', r'\bclass\b', r'\balgorithm\b',
            r'\bwrite\s+code\b', r'\bwrite\s+a\s+script\b', r'\bwrite\s+a\s+program\b', r'\brefactor\b', r'\bdebug\b',
            r'\bsyntax\s+error\b', r'\bregex\b', r'\bapi\s+endpoint\b', r'\bfastapi\b', r'\breact\s+component\b',
            r'\bunit\s+test\b', r'\bfix\s+bug\b', r'\bcode\s+review\b'
        ]
        return any(re.search(p, text) for p in coding_patterns)

    def _is_reasoning_task(self, text: str) -> bool:
        reasoning_patterns = [
            r'\bstep[\s\-]by[\s\-]step\b', r'\bdeep\s+analysis\b',
            r'\bdeduce\b', r'\bmathematical\s+proof\b', r'\blogical\s+deduction\b',
            r'\bcompare\s+and\s+contrast\b', r'\bpros\s+and\s+cons\b', r'\broot\s+cause\s+analysis\b',
            r'\bphilosophical\b', r'\bfirst\s+principles\b', r'\bwhy\s+did\s+this\s+happen\b'
        ]
        return any(re.search(p, text) for p in reasoning_patterns)

    def _detect_calculator_expression(self, text: str) -> Optional[Dict[str, Any]]:
        # Match expressions like "calculate 125 * 48" or "100 / 4"
        pattern = r'(?:calculate|compute|what is)?\s*([0-9]+(?:\.[0-9]+)?)\s*([\+\-\*\/])\s*([0-9]+(?:\.[0-9]+)?)'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            a, op, b = match.groups()
            return {
                "a": float(a),
                "b": float(b),
                "op": op
            }
        return None
