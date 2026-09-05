import unittest
import os
import shutil
from unittest.mock import patch, MagicMock

from ai.execution_contract import AITaskInput, AITaskOutput, TaskStatus
from ai.execution import AIExecutionService
from ai.models.registry import ModelInfo
from tools.calculator import CalculatorTool

class FakeLocalEmbeddings:
    def __init__(self, *args, **kwargs):
        pass
    def embed_documents(self, texts):
        return [[0.1] * 6 for _ in texts]
    def embed_query(self, text):
        return [0.1] * 6

class FakeLocalVectorStore:
    def __init__(self, *args, **kwargs):
        pass
    def similarity_search(self, query_embedding, k=4):
        return [{"page_content": "Deterministic test context.", "metadata": {"source": "fake_doc.txt"}}]
    def add_texts(self, texts, metadatas, embeddings):
        pass

def fake_ollama_generate(prompt, model, images=None, **kwargs):
    if "failure" in prompt.lower():
        raise Exception("Deterministic test exception")
        
    if images:
        return {"response": f"Vision analysis completed for image using {model}."}
        
    if "Calculate." in prompt:
        return {"response": "The result is 2.0."}
        
    if "Explain zero trust" in prompt:
        return {"response": "Zero trust architecture requires continuous verification of all identities and devices, regardless of their location. This verifies securely."}

    if "Summarize" in prompt:
        return {"response": "Here is the summary based on context: Deterministic test context."}
        
    # E.g. coding
    if "script" in prompt.lower():
        return {"response": "print('Hello world!')"}
        
    return {"response": f"General response from {model}. Meaningful length to pass verification."}


class TestE2EWorkflow(unittest.TestCase):
    """
    True End-to-End tests validating the full SOVEREIGN AI Execution Service flow using REAL components
    wherever possible (Router, AgentWorkflow, Verifier, Tools, RAG orchestration),
    only mocking the external LLM runtime transport (Ollama generate) and heavy embedding models.
    """
    
    def setUp(self):
        self.output_dir = "e2e_outputs_real"
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Patch heavy external embedding models so we test RAG retrieval purely locally
        self.patcher_emb = patch('ai.execution.LocalEmbeddings', new=FakeLocalEmbeddings)
        self.patcher_vs = patch('ai.execution.LocalVectorStore', new=FakeLocalVectorStore)
        self.patcher_emb.start()
        self.patcher_vs.start()
        
        # Clear env to ensure we do not use accidentally hardcoded installed models
        os.environ["SOVEREIGN_MODELS"] = '[]'
        
        self.service = AIExecutionService(output_dir=self.output_dir)
        
        # 1. Provide a completely configurable test registry
        self.service.registry.register(ModelInfo(name="test-llama", type="general", enabled=True))
        self.service.registry.register(ModelInfo(name="test-coder", type="coding", enabled=True))
        self.service.registry.register(ModelInfo(name="test-vision", type="vision", enabled=True))
        self.service.registry.register(ModelInfo(name="test-embed", type="embedding", enabled=True))
        
        # 3. Patch ONLY the external Ollama transport to be offline and deterministic
        self.service.ai_client.generate = MagicMock(side_effect=fake_ollama_generate)

        # 4. Dummy image for vision tests
        self.test_img_path = "temp_e2e_img.png"
        with open(self.test_img_path, "wb") as f:
            f.write(b"fake_image_data")

    def tearDown(self):
        self.patcher_emb.stop()
        self.patcher_vs.stop()
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)
        if os.path.exists(self.test_img_path):
            os.remove(self.test_img_path)
        if "SOVEREIGN_MODELS" in os.environ:
            del os.environ["SOVEREIGN_MODELS"]

    def test_invalid_sovereign_models_config(self):
        os.environ["SOVEREIGN_MODELS"] = "{invalid_json}"
        with self.assertRaises(ValueError) as context:
            AIExecutionService(output_dir=self.output_dir)
        self.assertIn("Invalid SOVEREIGN_MODELS configuration", str(context.exception))
        
    def test_valid_sovereign_models_config(self):
        os.environ["SOVEREIGN_MODELS"] = '[{"name": "qwen2.5-coder:3b", "type": "coding", "enabled": true}]'
        service = AIExecutionService(output_dir=self.output_dir)
        # Check if the model is correctly registered
        models = service.registry.list_models()
        self.assertTrue(any(m.name == "qwen2.5-coder:3b" and m.type == "coding" for m in models))

    def test_scenario_1_general_question(self):
        task = AITaskInput(task_id="t1", task="Explain zero trust architecture.", capability="general")
        
        result = self.service.execute(task)
        
        self.assertIsInstance(result, AITaskOutput)
        self.assertEqual(result.task_id, "t1")
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertEqual(result.model_used, "test-llama")
        self.assertIn("Zero trust", result.answer)
        self.assertEqual(result.verification["status"], "passed")
        
    def test_scenario_2_coding(self):
        task = AITaskInput(task_id="t2", task="Write a Python script.", capability="coding")
        
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertEqual(result.model_used, "test-coder")
        self.assertIn("print", result.answer)

    def test_scenario_3_document_rag(self):
        task = AITaskInput(task_id="t3", task="Summarize docs.", capability="general", input_data={"rag_query": "docs"})
        
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertEqual(result.model_used, "test-llama")
        
        # RAG context reaches output through actual components
        self.assertIn("Deterministic test context.", result.answer)
        self.assertEqual(len(result.sources), 1)
        self.assertEqual(result.sources[0], "fake_doc.txt")

    def test_scenario_4_tool_integration(self):
        task = AITaskInput(
            task_id="t4", 
            task="Calculate.", 
            capability="general", 
            input_data={"tools_to_run": [{"name": "calculator", "args": {"a": 1.0, "b": 1.0, "op": "+"}}]}
        )
        
        result = self.service.execute(task)
        
        # The REAL CalculatorTool is executed during AgentWorkflow execution
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertIn("The result is 2.0.", result.answer)
        
        # Verify the actual tool output (2.0) was passed into the LLM prompt
        call_args = self.service.ai_client.generate.call_args[1]
        self.assertIn("2.0", call_args["prompt"])

    def test_scenario_5_vision_integration(self):
        task = AITaskInput(
            task_id="t5", 
            task="Describe image.", 
            capability="vision", 
            files=[self.test_img_path]
        )
        
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertEqual(result.model_used, "test-vision")
        self.assertIn("test-vision", result.answer)
        
        # Verify REAL OllamaVisionClient extracted the file and sent base64
        call_args = self.service.ai_client.generate.call_args[1]
        self.assertIn("images", call_args)
        self.assertEqual(len(call_args["images"]), 1)

    def test_scenario_6_verification_requires_review(self):
        # A very short response string will trigger StructuredVerifier to return requires_review when RAG is present
        task = AITaskInput(task_id="t6", task="Summarize.", capability="general", input_data={"rag_query": "docs"})
        
        # Force the LLM to give an unusually short answer
        self.service.ai_client.generate = MagicMock(return_value={"response": "Short."})
        result = self.service.execute(task)
        
        # The REAL StructuredVerifier sees the short response + RAG context and downgrades status
        self.assertEqual(result.status, TaskStatus.NEEDS_APPROVAL)
        self.assertEqual(result.verification["status"], "requires_review")
        self.assertIn("suspiciously short", " ".join(result.verification["issues"]))

    def test_scenario_7_execution_failure(self):
        task = AITaskInput(task_id="t7", task="Simulate failure please.", capability="general")
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.FAILED)
        self.assertTrue(any("Deterministic test exception" in err for err in result.errors))
        
        # Since it failed execution, verifier won't pass
        self.assertEqual(result.verification["status"], "failed")

    def test_scenario_8_routing_failure(self):
        # Request a capability not in our test registry
        task = AITaskInput(task_id="t8", task="Explain.", capability="audio_generation")
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.FAILED)
        self.assertTrue(any("audio_generation" in err for err in result.errors))
        self.assertIsNone(result.model_used)

    def test_scenario_9_file_generation(self):
        task = AITaskInput(
            task_id="t9", 
            task="Create a PDF report.", 
            capability="general", 
            options={"output_format": "pdf"}
        )
        
        result = self.service.execute(task)
        
        self.assertEqual(result.status, TaskStatus.COMPLETED)
        self.assertEqual(len(result.files), 1)
        self.assertEqual(result.files[0]["format"], "pdf")
        self.assertTrue(os.path.exists(result.files[0]["path"]))

if __name__ == '__main__':
    unittest.main()
