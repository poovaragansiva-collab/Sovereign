from typing import Dict, Any, List
from .interface import VerifierInterface

class StructuredVerifier(VerifierInterface):
    """
    A foundational verifier performing structural, tool-completion, and sanity checks.
    Does not guarantee factual correctness, but provides a structured assessment.
    """
    def verify(self, result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        issues: List[str] = []
        notes: List[str] = []
        status = "passed"
        confidence = 1.0
        evidence: List[str] = []
        
        # 1. Structural verification
        response_text = result.get("response")
        if not response_text:
            issues.append("Response is empty or missing.")
            status = "failed"
            confidence = 0.0
            
        # 2. Agent execution verification (errors present?)
        if "errors" in result and result["errors"]:
            issues.append(f"Errors occurred during execution: {result['errors']}")
            status = "failed"
            confidence = 0.0
            
        # 3. RAG evidence verification
        retrieved_context = context.get("retrieved_context")
        if retrieved_context:
            notes.append("RAG context was provided. Ensure response cites sources if applicable.")
            evidence.extend([doc.get("metadata", {}).get("source", "Unknown") for doc in retrieved_context])
            
            # Simple heuristic check
            if response_text and len(response_text.strip()) < 10:
                issues.append("Response is suspiciously short given the retrieved context.")
                confidence = max(0.0, confidence - 0.5)
                status = "requires_review" if status != "failed" else status

        return self._build_result(status, confidence, issues, evidence, notes)
        
    def _build_result(self, status: str, confidence: float, issues: List[str], evidence: List[str], notes: List[str]) -> Dict[str, Any]:
        return {
            "status": status,
            "confidence": confidence,
            "issues": issues,
            "evidence": list(set(evidence)),  # deduplicate
            "notes": notes
        }
