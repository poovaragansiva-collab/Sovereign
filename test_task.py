import os
from backend.db.session import init_db, SessionLocal, get_engine
from backend.db.models import Task, TaskFile, Output

# Initialize database
init_db()

# Create a test task
db_session = SessionLocal()
test_task = Task(
    task_id="test-task-001",
    task="This is a simple test task for initialization verification.",
    task_type="general",
    capability="general",
    status="queued",
    model_used=None,
    answer=None,
    verification_status=None,
    verification_confidence=None,
    error=None
)
db_session.add(test_task)
db_session.commit()

# Optionally add a test file
test_file = TaskFile(
    task_id="test-task-001",
    filename="test.txt",
    file_path="test_files/test.txt",
    mime_type="text/plain",
    size=100
)
db_session.add(test_file)

# Optionally add an output
test_output = Output(
    task_id="test-task-001",
    filename="test_output.txt",
    file_path="test_files/test_output.txt",
    format="txt"
)
db_session.add(test_output)

db_session.commit()
print("Test task created successfully!")