import unittest
from unittest.mock import MagicMock

from agents import AgentWorkflow, AgentState
from ai.models.registry import ModelRegistry, ModelInfo
from ai.router import ModelRouter

class TestAgentWorkflow(unittest.TestCase):
    def setUp(self):
        # Set up mock registry and router
        self.registry = ModelRegistry()
        self.registry.register(ModelInfo(name="llama3", type="general", enabled=True))
        self.router = ModelRouter(self.registry)
        
        # Set up mock AI client
        self.mock_client = MagicMock()
        self.mock_client.generate.return_value = {"response": "Mocked response"}
        
        # Set up mocks for integrations
        self.mock_retriever = MagicMock()
        self.mock_retriever.retrieve.return_value = [{"page_content": "rag context", "metadata": {"source": "test.txt"}}]
        
        self.mock_tool = MagicMock()
        self.mock_tool.execute.return_value = "tool executed"
        self.mock_tool_registry = MagicMock()
        self.mock_tool_registry.get_tool.return_value = self.mock_tool
        
        self.mock_vision_client = MagicMock()
        self.mock_vision_client.analyze_image.return_value = {"response": "vision response"}
        
        self.mock_verifier = MagicMock()
        self.mock_verifier.verify.return_value = {"status": "passed", "confidence": 1.0, "issues": [], "evidence": [], "notes": []}
        
        self.workflow = AgentWorkflow(
            router=self.router, 
            ai_client=self.mock_client,
            verifier=self.mock_verifier,
            retriever=self.mock_retriever,
            tool_registry=self.mock_tool_registry,
            vision_client=self.mock_vision_client
        )

    def test_successful_execution_general(self):
        initial_state: AgentState = {
            "task": "Test task",
            "task_type": "qa",
            "capability": "general",
            "selected_model": None,
            "response": None
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertEqual(final_state["selected_model"], "llama3")
        self.assertEqual(final_state["response"], "Mocked response")
        self.assertEqual(final_state.get("verification", {}).get("status"), "passed")
        self.assertNotIn("errors", final_state)
        
        # Verify AI client was called correctly
        self.mock_client.generate.assert_called_once_with(prompt="Test task", model="llama3")
        self.mock_verifier.verify.assert_called_once()

    def test_rag_integration(self):
        initial_state: AgentState = {
            "task": "Test task",
            "task_type": "qa",
            "capability": "general",
            "selected_model": None,
            "response": None,
            "input_data": {"rag_query": "search term"}
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertIn("retrieved_context", final_state)
        self.assertEqual(len(final_state["retrieved_context"]), 1)
        
        # Verify AI client was called with context
        call_args = self.mock_client.generate.call_args[1]
        self.assertIn("Context: [{'page_content': 'rag context', 'metadata': {'source': 'test.txt'}}]", call_args["prompt"])

    def test_tool_integration(self):
        initial_state: AgentState = {
            "task": "Test task",
            "task_type": "qa",
            "capability": "general",
            "selected_model": None,
            "response": None,
            "input_data": {"tools_to_run": [{"name": "calculator", "args": {"expr": "1+1"}}]}
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertIn("tool_results", final_state)
        self.assertEqual(final_state["tool_results"][0]["result"], "tool executed")
        
        call_args = self.mock_client.generate.call_args[1]
        self.assertIn("Tool Results:", call_args["prompt"])
        
    def test_vision_integration(self):
        initial_state: AgentState = {
            "task": "Analyze this",
            "task_type": "qa",
            "capability": "general",
            "selected_model": None,
            "response": None,
            "input_data": {"image_path": "test.png"}
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertIn("vision_results", final_state)
        self.assertEqual(final_state["response"], "vision response")
        # Text generation should be skipped if vision returns a response
        self.mock_client.generate.assert_not_called()

    def test_routing_failure(self):
        initial_state: AgentState = {
            "task": "Test task",
            "task_type": "qa",
            "capability": "vision",  # Vision model is not registered
            "selected_model": None,
            "response": None
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertIsNone(final_state.get("selected_model"))
        self.assertIsNone(final_state.get("response"))
        self.assertIn("errors", final_state)
        self.assertTrue(any("vision" in err for err in final_state["errors"]))
        
        # Verify AI client was not called
        self.mock_client.generate.assert_not_called()

    def test_execution_failure(self):
        # Make the mock client raise an exception
        self.mock_client.generate.side_effect = Exception("Ollama connection failed")
        
        initial_state: AgentState = {
            "task": "Test task",
            "task_type": "qa",
            "capability": "general",
            "selected_model": None,
            "response": None
        }
        
        final_state = self.workflow.invoke(initial_state)
        
        self.assertEqual(final_state["selected_model"], "llama3")
        self.assertIsNone(final_state.get("response"))
        self.assertIn("errors", final_state)
        self.assertTrue(any("Ollama connection failed" in err for err in final_state["errors"]))
        
        # Verify verifier was still called and passed errors
        call_args = self.mock_verifier.verify.call_args[0]
        self.assertTrue(len(call_args[0]["errors"]) > 0)

if __name__ == '__main__':
    unittest.main()
