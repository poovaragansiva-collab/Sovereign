import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.config_db import init_db, save_models
import os

client = TestClient(app)

class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use an in-memory DB or temporary file for tests if possible
        # Here we just re-init the standard db for simplicity
        os.environ["SOVEREIGN_DB_PATH"] = "test_sovereign.db"
        init_db()
        save_models([])

    @classmethod
    def tearDownClass(cls):
        if os.path.exists("test_sovereign.db"):
            os.remove("test_sovereign.db")

    def test_health(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_setup_status_empty(self):
        save_models([]) # Ensure empty
        response = client.get("/api/models/setup-status")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["setup_required"])

    def test_setup_status_configured(self):
        save_models([{"name": "test-model", "type": "general"}])
        response = client.get("/api/models/setup-status")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["setup_required"])

    def test_post_config_valid(self):
        payload = {
            "models": [
                {"name": "test1", "type": "general"},
                {"name": "test2", "type": "reasoning"}
            ]
        }
        response = client.post("/api/models/config", json=payload)
        self.assertEqual(response.status_code, 200)
        
        # Verify it was saved
        config_resp = client.get("/api/models/config")
        models = config_resp.json()["models"]
        self.assertEqual(len(models), 2)

    def test_post_config_invalid(self):
        payload = {
            "models": [
                {"name": "test1", "type": "invalid_type"}
            ]
        }
        response = client.post("/api/models/config", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_tasks_execute_mock(self):
        # We don't want to actually run the full AI graph in an API test without mocks
        # But we can test the endpoint payload parsing
        payload = {
            "task": "Reply exactly hello",
            "capability": "general"
        }
        # It will likely fail at the LLM level without a real Ollama, 
        # but the request should be accepted by FastAPI.
        # So we just ensure it doesn't return 422 Unprocessable Entity
        response = client.post("/api/tasks/execute", json=payload)
        self.assertNotEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()
def test_files_upload_download(client):
    # Upload
    files = {"file": ("test.txt", b"hello world")}
    res = client.post("/api/files/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "file_id" in data

def test_tasks_list(client):
    res = client.get("/api/tasks/")
    assert res.status_code == 200
    assert "tasks" in res.json()
