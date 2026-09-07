import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(String(50), default="user", nullable=False)  # "admin" or "user"
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    task = Column(Text, nullable=False)
    task_type = Column(String(100), default="general", nullable=False)
    capability = Column(String(100), default="general", nullable=False)
    status = Column(String(50), default="queued", nullable=False)
    model_used = Column(String(100), nullable=True)
    answer = Column(Text, nullable=True)
    verification_status = Column(String(50), nullable=True)
    verification_confidence = Column(Float, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="tasks")
    files = relationship("TaskFile", back_populates="task", cascade="all, delete-orphan")
    outputs = relationship("Output", back_populates="task", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="task", cascade="all, delete-orphan")


class TaskFile(Base):
    __tablename__ = "task_files"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(64), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="files")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size = Column(Integer, default=0, nullable=False)
    indexed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="documents")


class ModelConfiguration(Base):
    __tablename__ = "model_configurations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(255), unique=True, index=True, nullable=False)
    capability = Column(String(100), nullable=False)  # "general", "reasoning", "coding", "vision", "embedding"
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)


class Output(Base):
    __tablename__ = "outputs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(64), ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    format = Column(String(50), nullable=False)  # "pdf", "docx", "xlsx", "json", "txt"
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="outputs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(String(64), ForeignKey("tasks.task_id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # TASK_CREATED, TASK_EXECUTED, MODEL_SELECTED, etc.
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="audit_logs")
    task = relationship("Task", back_populates="audit_logs")
