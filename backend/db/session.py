import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

_current_url = None
_engine = None
_SessionFactory = None

def get_database_url() -> str:
    db_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not db_url:
        db_path = os.getenv("SOVEREIGN_DB_PATH", "sovereign.db")
        db_url = f"sqlite:///{db_path}"
    return db_url

def get_engine():
    global _current_url, _engine, _SessionFactory, engine
    url = get_database_url()
    if _engine is None or _current_url != url:
        _current_url = url
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, connect_args=connect_args, echo=False)
        _SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        engine = _engine
    return _engine

engine = None

def SessionLocal():
    get_engine()
    return _SessionFactory()

def get_db():
    """Dependency for obtaining a database session in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes all database tables with safe migrations."""
    from backend.db.migrations import run_safe_migrations
    run_safe_migrations()
