import unittest
from ai.models.registry import ModelRegistry, ModelInfo
from ai.router import ModelRouter, ModelRoutingError

class TestModelRouter(unittest.TestCase):
    def setUp(self):
        self.registry = ModelRegistry()
        # Register some test models
        self.registry.register(ModelInfo(name="qwen2.5-coder", type="coding", enabled=True))
        self.registry.register(ModelInfo(name="llama3", type="general", enabled=True))
        self.registry.register(ModelInfo(name="llava", type="vision", enabled=True))
        self.registry.register(ModelInfo(name="deepseek-r1", type="reasoning", enabled=False))  # Disabled model

        self.router = ModelRouter(self.registry)

    def test_coding_routing(self):
        result = self.router.route("coding")
        self.assertEqual(result["model"], "qwen2.5-coder")
        self.assertEqual(result["capability"], "coding")
        self.assertIn("Deterministic match", result["reason"])

    def test_general_routing(self):
        result = self.router.route("general")
        self.assertEqual(result["model"], "llama3")
        self.assertEqual(result["capability"], "general")

    def test_vision_routing(self):
        result = self.router.route("vision")
        self.assertEqual(result["model"], "llava")
        self.assertEqual(result["capability"], "vision")

    def test_unknown_capability(self):
        with self.assertRaises(ModelRoutingError) as context:
            self.router.route("audio")
        self.assertIn("No enabled model found", str(context.exception))
        self.assertIn("audio", str(context.exception))

    def test_unavailable_model(self):
        # The reasoning model is registered but disabled.
        with self.assertRaises(ModelRoutingError) as context:
            self.router.route("reasoning")
        self.assertIn("No enabled model found", str(context.exception))
        self.assertIn("reasoning", str(context.exception))

    def test_registry_router_integration(self):
        # Ensure that dynamically adding a model makes it routable
        self.registry.register(ModelInfo(name="nomic-embed-text", type="embedding", enabled=True))
        result = self.router.route("embedding")
        self.assertEqual(result["model"], "nomic-embed-text")

if __name__ == '__main__':
    unittest.main()
