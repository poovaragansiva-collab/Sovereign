# Sovereign Architecture

## Core Principle
**Local-first AI:** No external AI API should be required for core AI inference. The system must operate locally/on-premise to ensure maximum data privacy.

## System Flow & Components

### 1. User
The end user interacting with the local AI workbench.

### 2. Next.js Frontend
- **Owner**: friend
- **Responsibility**: React-based UI, providing an intuitive, modern, and responsive user experience to manage tasks, view outputs, and interact with the AI.

### 3. FastAPI Backend
- **Owner**: friend
- **Responsibility**: API application layer connecting the frontend with the Task Intelligence system. Handles user requests, authentication, and database interactions.

### 4. Task Intelligence
- **Owner**: friend
- **Responsibility**: Manages tasks (creation, status updates, queueing) and acts as the bridge orchestrator between the API layer and the AI execution layer.

### 5. AI Execution Layer
- **Owner**: poovaragan
- **Responsibility**: The boundary where the backend hands off processing to the AI systems. It abstracts the complexity of how the AI processes the task from the FastAPI application.

### 6. Model Router
- **Owner**: poovaragan
- **Responsibility**: Dynamically directs incoming AI execution requests to the appropriate local model or LangGraph agent based on task type and complexity.

### 7. LangGraph Agent
- **Owner**: poovaragan
- **Responsibility**: Orchestrates complex, multi-step AI reasoning and tool usage.

### 8. RAG / Tools / Vision / OCR
- **Owner**: poovaragan
- **Responsibility**:
  - **RAG**: Retrieves relevant context from local organizational documents.
  - **Tools**: Executes deterministic functions locally.
  - **Vision/OCR**: Processes and extracts information from local images/documents using local models.

### 9. Ollama Local Model Server
- **Owner**: poovaragan (Integration)
- **Responsibility**: Hosts the open-weight LLMs locally, ensuring privacy and serving inference requests without internet access.

### 10. Verification
- **Owner**: poovaragan
- **Responsibility**: Validates the output of the local models and agents to ensure factual consistency, adherence to instructions, and safety before returning it.

### 11. Output Generation
- **Owner**: poovaragan
- **Responsibility**: Formats the verified AI responses and synthesized data into the final expected shape for the frontend/user.

### 12. Local Storage
- **Owner**: Shared/Infrastructure
- **Responsibility**: Stores organizational documents, task data, model outputs, and generated artifacts locally (e.g., PostgreSQL, local disk).

## Development Boundary
- **FastAPI / Application Layer** manages state, database records, routing, and user sessions.
- **AI Execution Layer** acts as a black box to the backend. The backend submits a standard payload (defined in `ai_integration_contract.md`) to the AI layer, and the AI layer returns a standard response payload, hiding the complexities of RAG, Agents, and Ollama integration.
