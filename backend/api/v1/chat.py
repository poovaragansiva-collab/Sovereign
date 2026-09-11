import os
import json
import uuid
import time
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import Conversation, Message, AuditLog, User
from backend.core.deps import get_current_user
from ai.execution import AIExecutionService
from ai.router import ModelRouter
from ai.inference.ollama_client import OllamaClient
from ai.config import get_ollama_base_url
from backend.api.v1.rag import get_rag_retriever

router = APIRouter()

# Schemas
class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    selected_model: Optional[str] = None
    capability: Optional[str] = "general"
    persona: Optional[str] = "assistant"

class SendMessageRequest(BaseModel):
    content: str
    rag_enabled: Optional[bool] = True
    tools_enabled: Optional[bool] = False
    model: Optional[str] = None
    persona: Optional[str] = None

class ExportConversationRequest(BaseModel):
    format: str = "markdown"  # "markdown", "json", "txt"

# Persona system prompts
PERSONAS = {
    "assistant": "You are Sovereign, an enterprise-grade local AI assistant. Provide helpful, accurate, and concise responses.",
    "senior_engineer": "You are a Principal Software Architect and Senior Systems Engineer. Provide rigorous, production-grade technical reasoning, idiomatic code, and architectural insights.",
    "document_analyst": "You are an Expert Document and Compliance Analyst. Analyze reference documentation thoroughly, providing exact citations and highlighting critical clauses.",
    "researcher": "You are a Senior Research Scientist. Synthesize information objectively, question assumptions, evaluate evidence, and present structured findings."
}

@router.post("/conversations")
def create_conversation(req: CreateConversationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new persistent multi-turn conversation."""
    cid = f"conv_{uuid.uuid4().hex[:12]}"
    
    # If no model provided, use router to pick configured model
    model = req.selected_model
    if not model:
        try:
            router_inst = ModelRouter()
            route = router_inst.route(req.capability or "general")
            model = route.get("model")
        except Exception:
            model = None

    conv = Conversation(
        id=cid,
        user_id=current_user.id,
        title=req.title or "New Conversation",
        selected_model=model,
        capability=req.capability or "general",
        metadata_json=json.dumps({"persona": req.persona or "assistant"})
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "title": conv.title,
        "selected_model": conv.selected_model,
        "capability": conv.capability,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "persona": req.persona or "assistant"
    }

@router.get("/conversations")
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all conversations ordered by recent activity."""
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(desc(Conversation.updated_at)).all()
    results = []
    for c in convs:
        last_msg = db.query(Message).filter(Message.conversation_id == c.id).order_by(desc(Message.created_at)).first()
        results.append({
            "id": c.id,
            "title": c.title,
            "selected_model": c.selected_model,
            "capability": c.capability,
            "message_count": len(c.messages),
            "last_message": last_msg.content[:80] if last_msg else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        })
    return {"conversations": results}

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Load conversation with its complete message history."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    formatted_messages = []
    for m in messages:
        sources = json.loads(m.sources_json) if m.sources_json else []
        verification = json.loads(m.verification_json) if m.verification_json else None
        metadata = json.loads(m.metadata_json) if m.metadata_json else {}
        formatted_messages.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "model_used": m.model_used,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "sources": sources,
            "verification": verification,
            "metadata": metadata
        })

    persona = "assistant"
    if conv.metadata_json:
        try:
            persona = json.loads(conv.metadata_json).get("persona", "assistant")
        except Exception:
            pass

    return {
        "id": conv.id,
        "title": conv.title,
        "selected_model": conv.selected_model,
        "capability": conv.capability,
        "persona": persona,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "messages": formatted_messages
    }

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a conversation and all associated turns."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    title = conv.title
    db.delete(conv)
    
    audit = AuditLog(
        actor_user_id=current_user.id,
        action="CHAT_DELETED",
        resource_type="conversation",
        resource_id=conversation_id,
        details=f"Deleted conversation '{title}'"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Conversation '{title}' deleted"}

@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: str, req: SendMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Send a message in a multi-turn conversation.
    Executes LangGraph agent workflow with persistent history, RAG context, and citations.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    start_time = time.time()

    # 1. Record User Message
    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conversation_id,
        role="user",
        content=content
    )
    db.add(user_msg)

    # Auto-generate title for first message
    existing_count = db.query(Message).filter(Message.conversation_id == conversation_id).count()
    if existing_count <= 1:
        snippet = content[:35].strip()
        if len(content) > 35:
            snippet += "..."
        conv.title = snippet

    db.commit()

    # 2. Build Multi-Turn History
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    chat_history = [{"role": m.role, "content": m.content} for m in past_messages]

    # Persona system prompt
    persona_key = req.persona
    if not persona_key and conv.metadata_json:
        try:
            persona_key = json.loads(conv.metadata_json).get("persona", "assistant")
        except Exception:
            persona_key = "assistant"
    system_prompt = PERSONAS.get(persona_key, PERSONAS["assistant"])
    chat_history.insert(0, {"role": "system", "content": system_prompt})

    # 3. Model Resolution
    active_model = req.model or conv.selected_model
    if not active_model:
        try:
            router_inst = ModelRouter()
            route = router_inst.route(conv.capability or "general")
            active_model = route.get("model")
            conv.selected_model = active_model
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Model routing error: {str(e)}")

    # 4. RAG Retrieval if enabled
    retrieved_docs = []
    citations = []
    if req.rag_enabled:
        try:
            retriever = get_rag_retriever()
            raw_docs = retriever.retrieve(query=content, user_id=current_user.id, k=4)
            for d in raw_docs:
                meta = d.get("metadata", {})
                src = os.path.basename(str(meta.get("source", "Document")))
                if len(src) > 37 and src[36] == '_' and src[:8].isalnum():
                    src = src[37:]
                citations.append({
                    "source": src,
                    "page": meta.get("page", 1),
                    "score": round(d.get("score"), 4) if d.get("score") is not None else None,
                    "text": d.get("text", "")[:280]
                })

            retrieved_docs = raw_docs
        except Exception as e:
            pass

    # 5. Execute Agent Workflow
    execution_service = AIExecutionService()
    initial_state = {
        "task": content,
        "task_type": "chat",
        "capability": conv.capability or "general",
        "selected_model": active_model,
        "messages": chat_history,
        "retrieved_context": retrieved_docs,
        "citations": citations,
        "input_data": {
            "rag_query": content if req.rag_enabled else None
        }
    }

    workflow_result = execution_service.workflow.invoke(initial_state)
    answer = workflow_result.get("response") or "I was unable to generate a response."
    errors = workflow_result.get("errors", [])
    if errors:
        answer += f"\n\n*Warnings/Errors encountered:* {'; '.join(errors)}"

    citations_result = workflow_result.get("citations", citations)
    verification = workflow_result.get("verification", {"status": "passed", "confidence": 1.0})
    latency_ms = round((time.time() - start_time) * 1000, 2)

    # 6. Save Assistant Turn
    asst_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    asst_msg = Message(
        id=asst_msg_id,
        conversation_id=conversation_id,
        role="assistant",
        content=answer,
        model_used=active_model,
        sources_json=json.dumps(citations_result) if citations_result else None,
        verification_json=json.dumps(verification),
        metadata_json=json.dumps({"latency_ms": latency_ms, "persona": persona_key})
    )
    db.add(asst_msg)
    conv.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {
        "message_id": asst_msg_id,
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": answer,
        "model_used": active_model,
        "sources": citations_result,
        "verification": verification,
        "latency_ms": latency_ms,
        "created_at": asst_msg.created_at.isoformat() if asst_msg.created_at else None
    }

@router.get("/conversations/{conversation_id}/stream")
def stream_conversation_turn(
    conversation_id: str,
    prompt: str = Query(...),
    model: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stream chat response tokens using Server-Sent Events (SSE).
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    active_model = model or conv.selected_model or "gemma3:4b"

    # Assemble past messages
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in past_messages]
    messages.append({"role": "user", "content": prompt})

    client = OllamaClient(base_url=get_ollama_base_url())

    def event_stream():
        yield f"data: {json.dumps({'event': 'start', 'model': active_model})}\n\n"
        full_text = []
        try:
            for token in client.stream_chat(messages=messages, model=active_model):
                full_text.append(token)
                yield f"data: {json.dumps({'event': 'token', 'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
        yield f"data: {json.dumps({'event': 'done', 'full_response': ''.join(full_text)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/conversations/{conversation_id}/export")
def export_conversation(conversation_id: str, req: ExportConversationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export conversation into Markdown, JSON, or TXT."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    if req.format == "json":
        export_data = {
            "conversation_id": conv.id,
            "title": conv.title,
            "model": conv.selected_model,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "model_used": m.model_used,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "sources": json.loads(m.sources_json) if m.sources_json else []
                }
                for m in messages
            ]
        }
        return {"format": "json", "filename": f"{conv.title}.json", "content": json.dumps(export_data, indent=2)}

    # Markdown format
    lines = [f"# {conv.title}", f"*Model: {conv.selected_model or 'Default'}* | *Exported: {datetime.datetime.utcnow().isoformat()}*", "\n---\n"]
    for m in messages:
        speaker = "**User**" if m.role == "user" else f"**Assistant ({m.model_used or 'AI'})**"
        lines.append(f"### {speaker}")
        lines.append(m.content)
        if m.sources_json:
            sources = json.loads(m.sources_json)
            if sources:
                lines.append("\n**Sources:**")
                for s in sources:
                    lines.append(f"- {s.get('source')} (Page {s.get('page')})")
        lines.append("\n---\n")

    md_content = "\n".join(lines)
    return {"format": "markdown", "filename": f"{conv.title}.md", "content": md_content}
