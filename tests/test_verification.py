import unittest
from verification import StructuredVerifier

class TestStructuredVerifier(unittest.TestCase):
    def setUp(self):
        self.verifier = StructuredVerifier()

    def test_verify_success(self):
        result = {"response": "This is a valid and sufficiently long response to a query."}
        context = {}
        
        verification = self.verifier.verify(result, context)
        self.assertEqual(verification["status"], "passed")
        self.assertEqual(verification["confidence"], 1.0)
        self.assertEqual(len(verification["issues"]), 0)

    def test_verify_empty_response(self):
        result = {"response": ""}
        context = {}
        
        verification = self.verifier.verify(result, context)
        self.assertEqual(verification["status"], "failed")
        self.assertEqual(verification["confidence"], 0.0)
        self.assertIn("empty or missing", verification["issues"][0])

    def test_verify_execution_errors(self):
        result = {
            "response": "Here is what I found.",
            "errors": ["Failed to connect to Ollama"]
        }
        context = {}
        
        verification = self.verifier.verify(result, context)
        self.assertEqual(verification["status"], "failed")
        self.assertEqual(verification["confidence"], 0.0)
        self.assertTrue(any("Errors occurred" in issue for issue in verification["issues"]))

    def test_verify_rag_context_short_response(self):
        result = {"response": "yes"}
        context = {
            "retrieved_context": [
                {"metadata": {"source": "doc1.txt"}, "text": "Some long context"}
            ]
        }
        
        verification = self.verifier.verify(result, context)
        self.assertEqual(verification["status"], "requires_review")
        self.assertEqual(verification["confidence"], 0.5)
        self.assertTrue(any("suspiciously short" in issue for issue in verification["issues"]))
        self.assertIn("doc1.txt", verification["evidence"])

if __name__ == '__main__':
    unittest.main()
