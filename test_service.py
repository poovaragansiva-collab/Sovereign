from ai.execution import AIExecutionService
from ai.execution_contract import AITaskInput

# Create a minimal input
task_input = AITaskInput(
    task_id="test-task-001",
    task="Hello world",
    task_type="general",
    capability="general",
    input_data={},
    files=[],
    options={"output_format": "txt"},
    metadata={}
)

service = AIExecutionService()
try:
    output = service.execute(task_input)
    print("Success:", output.status)
except Exception as e:
    print("Error:", e)