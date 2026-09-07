import unittest
from backend.services.task_intelligence import TaskIntelligenceService

class TestTaskIntelligence(unittest.TestCase):
    def setUp(self):
        self.ti = TaskIntelligenceService()

    def test_general_task(self):
        result = self.ti.analyze("Explain what zero trust security means.")
        self.assertEqual(result.capability, "general")
        self.assertEqual(result.task_type, "general")
        self.assertIsNone(result.output_format)

    def test_coding_task_keyword(self):
        result = self.ti.analyze("Write a python function to compute factorial.")
        self.assertEqual(result.capability, "coding")
        self.assertEqual(result.task_type, "coding")

    def test_reasoning_task(self):
        result = self.ti.analyze("Perform a step by step root cause analysis on this outage.")
        self.assertEqual(result.capability, "reasoning")
        self.assertEqual(result.task_type, "reasoning")

    def test_vision_task_with_image(self):
        result = self.ti.analyze("Describe what is in this image", files=["receipt.png"])
        self.assertEqual(result.capability, "vision")
        self.assertEqual(result.task_type, "vision")
        self.assertEqual(result.input_data.get("image_path"), "receipt.png")

    def test_output_format_detection_pdf(self):
        result = self.ti.analyze("Analyze the quarterly financial report and generate a PDF summary.")
        self.assertEqual(result.output_format, "pdf")

    def test_output_format_detection_docx(self):
        result = self.ti.analyze("Draft an onboarding guideline in docx format.")
        self.assertEqual(result.output_format, "docx")

    def test_output_format_detection_xlsx(self):
        result = self.ti.analyze("Export the sales forecast to an excel spreadsheet.")
        self.assertEqual(result.output_format, "xlsx")

    def test_output_format_detection_json(self):
        result = self.ti.analyze("Extract the structured user list as a JSON object.")
        self.assertEqual(result.output_format, "json")

    def test_calculator_tool_detection(self):
        result = self.ti.analyze("calculate 125 * 48")
        self.assertEqual(result.task_type, "calculation")
        self.assertEqual(len(result.tools_to_run), 1)
        self.assertEqual(result.tools_to_run[0]["name"], "calculator")
        self.assertEqual(result.tools_to_run[0]["args"], {"a": 125.0, "b": 48.0, "op": "*"})

    def test_rag_routing_with_document(self):
        result = self.ti.analyze("What is the remote work policy?", files=["handbook.pdf"])
        self.assertEqual(result.rag_query, "What is the remote work policy?")
        self.assertIn("rag_query", result.input_data)

    def test_explicit_capability_override(self):
        # Even if prompt mentions python, explicit capability overrides
        result = self.ti.analyze("Review this python script for logical soundness", capability="reasoning")
        self.assertEqual(result.capability, "reasoning")

if __name__ == "__main__":
    unittest.main()
