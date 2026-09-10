import unittest
import os
import tempfile
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend.db import init_db, SessionLocal, Task, Document, ModelConfiguration, AuditLog

class TestAPIv1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["SOVEREIGN_DB_PATH"] = "test_v1_sovereign.db"
        init_db()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        from backend.db.session import get_engine
        try:
            get_engine().dispose()
        except Exception:
            pass
        if os.path.exists("test_v1_sovereign.db"):
            try:
                os.remove("test_v1_sovereign.db")
            except PermissionError:
                pass

    def setUp(self):
        # Clear database between tests
        db = SessionLocal()
        db.query(AuditLog).delete()
        db.query(Task).delete()
        db.query(Document).delete()
        db.query(ModelConfiguration).delete()
        db.commit()
        db.close()

    def test_health_endpoints(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok", "service": "sovereign-api"})

        res_sys = self.client.get("/api/v1/health/system")
        self.assertEqual(res_sys.status_code, 200)
        data = res_sys.json()
        self.assertIn("ollama", data)
        self.assertIn("database", data)

    def test_dashboard_stats(self):
        res = self.client.get("/api/v1/dashboard/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("metrics", data)
        self.assertIn("total_tasks", data["metrics"])
        self.assertIn("recent_tasks", data)

    def test_task_creation_and_lifecycle(self):
        # 1. Create task
        create_res = self.client.post("/api/v1/tasks", json={
            "task": "Write a python algorithm to reverse a linked list and generate a pdf report.",
            "options": {}
        })
        self.assertEqual(create_res.status_code, 200)
        created = create_res.json()
        task_id = created["task_id"]
        self.assertEqual(created["capability"], "coding")
        self.assertEqual(created["intelligence"]["output_format"], "pdf")
        self.assertEqual(created["status"], "queued")

        # 2. Get details
        detail_res = self.client.get(f"/api/v1/tasks/{task_id}")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["task_id"], task_id)
        self.assertEqual(detail["status"], "queued")

        # 3. List tasks
        list_res = self.client.get("/api/v1/tasks")
        self.assertEqual(list_res.status_code, 200)
        tasks = list_res.json()["tasks"]
        self.assertEqual(len(tasks), 1)

        # 4. Delete task
        del_res = self.client.delete(f"/api/v1/tasks/{task_id}")
        self.assertEqual(del_res.status_code, 200)

        # 5. Verify deleted
        verify_res = self.client.get(f"/api/v1/tasks/{task_id}")
        self.assertEqual(verify_res.status_code, 404)

    @patch('ai.execution.OllamaClient')
    def test_direct_task_execution(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client.generate.return_value = {"response": "def reverse_linked_list(): pass"}
        mock_client_cls.return_value = mock_client

        # Configure model in DB
        self.client.post("/api/v1/models/config", json={
            "models": [{"name": "qwen2.5-coder", "type": "coding", "enabled": True}]
        })

        exec_res = self.client.post("/api/v1/tasks/execute", json={
            "task": "Write python code to reverse a list",
            "capability": "coding"
        })
        self.assertEqual(exec_res.status_code, 200)
        data = exec_res.json()
        self.assertIn("task_id", data)
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["model_used"], "qwen2.5-coder")
        self.assertIn("reverse", data["answer"])

    def test_document_management(self):
        # 1. Upload document
        file_content = b"Sovereign AI document content for testing."
        res = self.client.post(
            "/api/v1/documents/upload",
            files={"file": ("test_doc.txt", file_content, "text/plain")}
        )
        self.assertEqual(res.status_code, 200)
        doc = res.json()
        doc_id = doc["id"]
        self.assertEqual(doc["filename"], "test_doc.txt")
        self.assertTrue(doc["indexed"])

        # 2. List documents
        list_res = self.client.get("/api/v1/documents")
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()["documents"]), 1)

        # 3. Search document
        search_res = self.client.get("/api/v1/documents?query=test_doc")
        self.assertEqual(search_res.status_code, 200)
        self.assertEqual(len(search_res.json()["documents"]), 1)

        # 4. Delete document
        del_res = self.client.delete(f"/api/v1/documents/{doc_id}")
        self.assertEqual(del_res.status_code, 200)

        # 5. Verify deletion
        list_after = self.client.get("/api/v1/documents")
        self.assertEqual(len(list_after.json()["documents"]), 0)

    def test_model_configuration(self):
        # 1. Setup status when empty
        status_res = self.client.get("/api/v1/models/setup-status")
        self.assertEqual(status_res.status_code, 200)
        self.assertTrue(status_res.json()["setup_required"])

        # 2. Save config
        save_res = self.client.post("/api/v1/models/config", json={
            "models": [
                {"name": "llama3:8b", "type": "general"},
                {"name": "qwen2.5-coder:7b", "type": "coding"}
            ]
        })
        self.assertEqual(save_res.status_code, 200)

        # 3. Verify config
        config_res = self.client.get("/api/v1/models/config")
        self.assertEqual(config_res.status_code, 200)
        models = config_res.json()["models"]
        self.assertEqual(len(models), 2)

    def test_audit_logs(self):
        # Trigger an action
        self.client.post("/api/v1/models/config", json={
            "models": [{"name": "llama3", "type": "general"}]
        })

        logs_res = self.client.get("/api/v1/audit-logs")
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json()["logs"]
        self.assertTrue(len(logs) > 0)
        self.assertEqual(logs[0]["action"], "MODEL_CONFIG_UPDATED")

if __name__ == "__main__":
    unittest.main()
