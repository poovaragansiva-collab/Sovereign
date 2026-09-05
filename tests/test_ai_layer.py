import os
import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error

from ai import (
    get_ollama_base_url,
    ModelRegistry,
    ModelInfo,
    OllamaClient,
    OllamaConnectionError,
    OllamaRequestError,
)

class TestAIConfiguration(unittest.TestCase):
    @patch.dict(os.environ, {"OLLAMA_BASE_URL": "http://custom-host:11434"}, clear=True)
    def test_get_ollama_base_url_custom(self):
        self.assertEqual(get_ollama_base_url(), "http://custom-host:11434")

    @patch.dict(os.environ, {}, clear=True)
    def test_get_ollama_base_url_default(self):
        self.assertEqual(get_ollama_base_url(), "http://localhost:11434")

class TestModelRegistry(unittest.TestCase):
    def setUp(self):
        self.registry = ModelRegistry()

    def test_register_and_get_model(self):
        model = ModelInfo(name="llama3", type="llm", description="Meta Llama 3")
        self.registry.register(model)
        
        retrieved = self.registry.get_model("llama3")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "llama3")
        self.assertEqual(retrieved.type, "llm")
        self.assertEqual(retrieved.description, "Meta Llama 3")

    def test_list_models_enabled_only(self):
        self.registry.register(ModelInfo(name="llama3", type="llm", enabled=True))
        self.registry.register(ModelInfo(name="mistral", type="llm", enabled=False))
        
        enabled_models = self.registry.list_models(enabled_only=True)
        self.assertEqual(len(enabled_models), 1)
        self.assertEqual(enabled_models[0].name, "llama3")

        all_models = self.registry.list_models(enabled_only=False)
        self.assertEqual(len(all_models), 2)

    def test_remove_model(self):
        self.registry.register(ModelInfo(name="llama3", type="llm"))
        self.assertTrue(self.registry.remove_model("llama3"))
        self.assertIsNone(self.registry.get_model("llama3"))
        self.assertFalse(self.registry.remove_model("nonexistent"))

class TestOllamaClient(unittest.TestCase):
    def setUp(self):
        self.client = OllamaClient("http://localhost:11434")

    @patch('urllib.request.urlopen')
    def test_generate_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"response": "Hello world"}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = self.client.generate(prompt="Say hi", model="llama3")
        self.assertEqual(result.get("response"), "Hello world")

    @patch('urllib.request.urlopen')
    def test_chat_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({"message": {"role": "assistant", "content": "Hi"}}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        result = self.client.chat(messages=[{"role": "user", "content": "Say hi"}], model="llama3")
        self.assertEqual(result.get("message", {}).get("content"), "Hi")

    @patch('urllib.request.urlopen')
    def test_connection_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")
        
        with self.assertRaises(OllamaConnectionError):
            self.client.generate(prompt="Say hi", model="llama3")

    @patch('urllib.request.urlopen')
    def test_http_error(self, mock_urlopen):
        mock_error = urllib.error.HTTPError(
            url="http://localhost:11434/api/generate",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=MagicMock()
        )
        mock_error.fp.read.return_value = b"model 'llama3' not found"
        mock_error.read = mock_error.fp.read
        mock_urlopen.side_effect = mock_error

        with self.assertRaises(OllamaRequestError) as context:
            self.client.generate(prompt="Say hi", model="llama3")
        
        self.assertIn("404", str(context.exception))
        self.assertIn("not found", str(context.exception))

if __name__ == '__main__':
    unittest.main()
