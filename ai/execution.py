import os
import json
from typing import Dict, Any, List

from ai.execution_contract import AITaskInput, AITaskOutput, TaskStatus
from agents.state import AgentState
from agents.graph import AgentWorkflow
from ai.models.registry import ModelRegistry, ModelInfo
from ai.router import ModelRouter
from ai.inference.ollama_client import OllamaClient
from ai.config import get_ollama_base_url
from verification.verifier import StructuredVerifier
from rag.retriever import RAGRetriever
from rag.embeddings import LocalEmbeddings
from rag.vectorstore import LocalVectorStore
from tools.registry import ToolRegistry
from tools.calculator import CalculatorTool
from vision.vision_client import OllamaVisionClient
from outputs.basic import JSONOutputGenerator, TXTOutputGenerator
from outputs.docx import DOCXOutputGenerator
from outputs.pdf import PDFOutputGenerator
from outputs.xlsx import XLSXOutputGenerator

class AIExecutionService:
    def __init__(self, output_dir: str = "local_outputs"):
        self.registry = self._build_registry()
        self.router = ModelRouter(self.registry)

        self.ai_client = OllamaClient(base_url=get_ollama_base_url())
        self.verifier = StructuredVerifier()

        self.tool_registry = ToolRegistry()
        self.tool_registry.register(CalculatorTool())
        self.vision_client = OllamaVisionClient(ai_client=self.ai_client)

        # Defer heavy initialization (like embedding models) unless needed,
        # but for this orchestration we construct the retriever interface.
        # RAG is optional; if the components aren't fully configured, we skip.
        try:
            self.embeddings = LocalEmbeddings()
            self.vectorstore = LocalVectorStore()
            self.retriever = RAGRetriever(vectorstore=self.vectorstore, embeddings=self.embeddings)
        except Exception:
            self.retriever = None

        self.workflow = AgentWorkflow(
            router=self.router,
            ai_client=self.ai_client,
            verifier=self.verifier,
            retriever=self.retriever,
            tool_registry=self.tool_registry,
            vision_client=self.vision_client
        )

        self.output_dir = output_dir

    def _build_registry(self) -> ModelRegistry:
        """
        Builds the model registry using a local configuration mechanism.
        Uses SOVEREIGN_MODELS env var if present, else defaults.
        """
        registry = ModelRegistry()
        env_config = os.getenv("SOVEREIGN_MODELS")
        if env_config:
            try:
                models_data = json.loads(env_config)
                for m in models_data:
                    registry.register(ModelInfo(name=m["name"], type=m["type"], enabled=m.get("enabled", True)))
                return registry
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid SOVEREIGN_MODELS configuration: {str(e)}")

        # Default local models
        registry.register(ModelInfo(name="llama3", type="general", enabled=True))
        registry.register(ModelInfo(name="qwen2.5-coder", type="coding", enabled=True))
        registry.register(ModelInfo(name="llava", type="vision", enabled=True))
        registry.register(ModelInfo(name="nomic-embed-text", type="embedding", enabled=True))
        return registry

    def _get_output_generator(self, fmt: str):
        fmt = fmt.lower()
        if fmt == "pdf":
            return PDFOutputGenerator(self.output_dir)
        elif fmt == "docx":
            return DOCXOutputGenerator(self.output_dir)
        elif fmt == "xlsx":
            return XLSXOutputGenerator(self.output_dir)
        elif fmt == "json":
            return JSONOutputGenerator(self.output_dir)
        return TXTOutputGenerator(self.output_dir)

    def execute(self, task: AITaskInput) -> AITaskOutput:
        # 1. Map AITaskInput to AgentState
        capability = task.capability if task.capability else "general"

        # Inject inputs required by tool/RAG/vision nodes
        input_data = dict(task.input_data)
        if task.files:
            if capability == "vision" and "image_path" not in input_data:
                input_data["image_path"] = task.files[0]
            else:
                # Add to vectorstore for RAG
                try:
                    from rag.loaders import TextLoader, PDFLoader, DOCXLoader
                    from rag.chunking import TextSplitter

                    splitter = TextSplitter()

                    all_chunks = []
                    for f_path in task.files:
                        if not os.path.exists(f_path):
                            continue

                        docs = []
                        if f_path.endswith('.txt'):
                            docs = TextLoader().load(f_path)
                        elif f_path.endswith('.pdf'):
                            docs = PDFLoader().load(f_path)
                        elif f_path.endswith('.docx'):
                            docs = DOCXLoader().load(f_path)

                        if docs:
                            chunks = splitter.split_documents(docs)
                            all_chunks.extend(chunks)

                    if all_chunks and self.vectorstore and self.embeddings:
                        texts = [c["text"] for c in all_chunks]
                        metadatas = [c["metadata"] for c in all_chunks]
                        # Assume synchronous embedding generation for local
                        embeds = self.embeddings.embed_documents(texts)
                        self.vectorstore.add_texts(texts, metadatas, embeds)
                except Exception as e:
                    print(f"Failed to load RAG documents: {e}")


        initial_state: AgentState = {
            "task": task.task,
            "task_type": task.task_type,
            "capability": capability,
            "selected_model": None,
            "input_data": input_data,
            "response": None
        }

        # 2. Invoke REAL AgentWorkflow
        final_state = self.workflow.invoke(initial_state)

        # 3. Handle Status Mapping
        errors = final_state.get("errors", [])
        verification = final_state.get("verification", {})
        ver_status = verification.get("status", "failed")

        if errors or ver_status == "failed":
            status = TaskStatus.FAILED
        elif ver_status == "requires_review":
            status = TaskStatus.NEEDS_APPROVAL
        else:
            status = TaskStatus.COMPLETED

        response_text = final_state.get("response", "")

        # 4. Generate Output File if requested
        generated_files = []
        fmt = task.options.get("output_format")
        if fmt and status != TaskStatus.FAILED and response_text:
            try:
                generator = self._get_output_generator(fmt)
                gen_res = generator.generate(response_text, f"{task.task_id}.{fmt}")
                if gen_res.get("status") == "success":
                    generated_files.append({
                        "path": gen_res["path"],
                        "format": fmt,
                        "filename": gen_res["filename"]
                    })
                else:
                    errors.extend(gen_res.get("errors", []))
                    status = TaskStatus.FAILED
            except Exception as e:
                errors.append(f"Output generation failed: {str(e)}")
                status = TaskStatus.FAILED

        # Extract RAG sources if any
        sources = []
        for doc in final_state.get("retrieved_context", []):
            if "metadata" in doc and "source" in doc["metadata"]:
                src = doc["metadata"]["source"]
                if src not in sources:
                    sources.append(src)

        # 5. Convert back to AITaskOutput
        return AITaskOutput(
            task_id=task.task_id,
            status=status,
            answer=response_text,
            model_used=final_state.get("selected_model"),
            sources=sources,
            files=generated_files,
            verification=verification,
            errors=errors,
            metadata=final_state.get("metadata", {})
        )
