import unittest
from ai.execution_contract import AITaskInput, AITaskOutput, TaskStatus

class TestExecutionContract(unittest.TestCase):
    def test_task_input_serialization(self):
        input_data = {
            "task_id": "123",
            "task": "Test task",
            "task_type": "analysis",
            "capability": "general",
            "input_data": {"key": "value"},
            "files": ["file1.txt"],
            "options": {"speed": "fast"},
            "metadata": {"user": "test"}
        }
        task_input = AITaskInput.from_dict(input_data)
        self.assertEqual(task_input.task_id, "123")
        self.assertEqual(task_input.to_dict(), input_data)

    def test_task_output_serialization(self):
        output_data = {
            "task_id": "123",
            "status": "completed",
            "answer": "Here is the answer",
            "model_used": "llama3",
            "sources": ["source1.txt"],
            "files": [{"path": "/tmp/out.pdf", "format": "pdf"}],
            "verification": {"status": "passed", "confidence": 1.0},
            "errors": [],
            "metadata": {"time": 100}
        }
        task_output = AITaskOutput.from_dict(output_data)
        self.assertEqual(task_output.task_id, "123")
        self.assertEqual(task_output.status, TaskStatus.COMPLETED)
        self.assertEqual(task_output.to_dict(), output_data)
        
    def test_task_output_failure(self):
        output_data = {
            "task_id": "124",
            "status": "failed",
            "answer": "",
            "model_used": None,
            "sources": [],
            "files": [],
            "verification": {},
            "errors": ["Something went wrong"],
            "metadata": {}
        }
        task_output = AITaskOutput.from_dict(output_data)
        self.assertEqual(task_output.status, TaskStatus.FAILED)
        self.assertEqual(len(task_output.errors), 1)

if __name__ == '__main__':
    unittest.main()
