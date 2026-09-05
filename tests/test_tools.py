import unittest
import tempfile
import os

from tools import ToolRegistry, CalculatorTool, FileReaderTool

class TestTools(unittest.TestCase):
    def setUp(self):
        self.registry = ToolRegistry()
        self.calculator = CalculatorTool()
        
        # Setup a temporary directory for the file reader
        self.temp_dir = tempfile.TemporaryDirectory()
        self.file_reader = FileReaderTool(allowed_directory=self.temp_dir.name)
        
        self.registry.register(self.calculator)
        self.registry.register(self.file_reader)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_registry(self):
        self.assertEqual(len(self.registry.list_tools()), 2)
        tool = self.registry.get_tool("calculator")
        self.assertIsNotNone(tool)
        self.assertEqual(tool.name, "calculator")

    def test_calculator_success(self):
        self.assertEqual(self.calculator.execute(a=5, b=3, op="+"), 8.0)
        self.assertEqual(self.calculator.execute(a=10, b=2, op="/"), 5.0)

    def test_calculator_failures(self):
        with self.assertRaises(ValueError):
            self.calculator.execute(a=5, b=0, op="/")
        with self.assertRaises(ValueError):
            self.calculator.execute(a=5, b=3, op="^")

    def test_file_reader_success(self):
        # Create a test file
        test_file_path = os.path.join(self.temp_dir.name, "test.txt")
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write("Hello Sovereign!")
            
        content = self.file_reader.execute(file_path="test.txt")
        self.assertEqual(content, "Hello Sovereign!")

    def test_file_reader_path_traversal(self):
        # Attempt to read outside the allowed directory
        with self.assertRaises(PermissionError):
            self.file_reader.execute(file_path="../outside.txt")
            
        with self.assertRaises(PermissionError):
            self.file_reader.execute(file_path="/etc/passwd")

    def test_file_reader_not_found(self):
        with self.assertRaises(ValueError):
            self.file_reader.execute(file_path="nonexistent.txt")

if __name__ == '__main__':
    unittest.main()
