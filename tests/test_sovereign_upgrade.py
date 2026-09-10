import pytest
import os
import tempfile
import json
from backend.db.session import get_engine, Base, SessionLocal, init_db
from backend.db.models import Conversation, Message, Document, Output, PluginConfig
from ai.router import ModelRouter, ModelRoutingError
from plugins.manager import get_plugin_manager
from rag.loaders import TextLoader, PDFLoader, DOCXLoader, ImageOCRLoader, load_document
from rag.chunking import TextSplitter
from outputs.pptx import PPTXOutputGenerator
from outputs.pdf import PDFOutputGenerator
from outputs.docx import DOCXOutputGenerator
from outputs.xlsx import XLSXOutputGenerator

def test_database_migrations_and_schema():
    """Verify all tables and critical columns exist."""
    init_db()
    db = SessionLocal()
    try:
        # Create test conversation
        conv = Conversation(
            id="test_conv_123",
            title="Migration Test Conversation",
            selected_model="gemma3:4b",
            capability="general"
        )
        db.add(conv)
        db.commit()

        # Add message
        msg = Message(
            id="test_msg_123",
            conversation_id="test_conv_123",
            role="user",
            content="Hello Sovereign!"
        )
        db.add(msg)
        db.commit()

        # Query back
        retrieved = db.query(Conversation).filter(Conversation.id == "test_conv_123").first()
        assert retrieved is not None
        assert retrieved.title == "Migration Test Conversation"
        assert len(retrieved.messages) == 1
        assert retrieved.messages[0].content == "Hello Sovereign!"

        # Cleanup
        db.delete(retrieved)
        db.commit()
    finally:
        db.close()

def test_model_router_dynamic():
    """Test model routing logic with installed Ollama models and missing capabilities."""
    router = ModelRouter()
    # General route should find a model
    gen_route = router.route("general")
    assert "model" in gen_route
    assert gen_route["capability"] == "general"

    # Vision route should raise clear error when no vision model is installed
    with pytest.raises(ModelRoutingError) as exc_info:
        router.route("vision")
    assert "Vision model not installed" in str(exc_info.value)

def test_rag_text_and_chunking():
    """Test loading and chunking with page and chunk metadata."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write("Line 1: Sovereign Architecture.\nLine 2: Local AI Workbench.\nLine 3: Privacy First.")
        temp_path = f.name

    try:
        docs = load_document(temp_path)
        assert len(docs) == 1
        assert docs[0]["metadata"]["page"] == 1

        splitter = TextSplitter(chunk_size=30, chunk_overlap=5)
        chunks = splitter.split_documents(docs)
        assert len(chunks) >= 2
        for c in chunks:
            assert "chunk_index" in c["metadata"]
            assert "source" in c["metadata"]
            assert c["metadata"]["page"] == 1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_plugin_system_permissions_and_execution():
    """Test plugin registration, declared permissions, and execution."""
    pm = get_plugin_manager()
    plugins = pm.list_plugins()
    assert len(plugins) >= 4

    # System Info plugin
    sys_plugin = pm.get_plugin("System Info")
    assert sys_plugin is not None
    assert "read_system_info" in [p.value for p in sys_plugin.metadata.permissions]

    # Execute system info action
    res = pm.execute_plugin("System Info", "status", {})
    assert "os" in res
    assert "cpu_usage_percent" in res

    # Data converter plugin
    csv_data = "name,role\nAlice,Admin\nBob,Engineer"
    conv_res = pm.execute_plugin("Data Converter", "convert", {
        "data": csv_data,
        "from": "csv",
        "to": "json"
    })
    assert "converted_data" in conv_res
    parsed = json.loads(conv_res["converted_data"])
    assert len(parsed) == 2
    assert parsed[0]["name"] == "Alice"

def test_pptx_output_generation():
    """Test PowerPoint (.pptx) generator."""
    out_dir = tempfile.mkdtemp()
    gen = PPTXOutputGenerator(out_dir)
    res = gen.generate(
        content={"Executive Summary": "Sovereign upgraded successfully.", "Architecture": "100% Local AI."},
        filename="test_presentation",
        metadata={"title": "Test Presentation"}
    )
    assert res["status"] == "success"
    assert os.path.exists(res["path"])
    assert res["path"].endswith(".pptx")
