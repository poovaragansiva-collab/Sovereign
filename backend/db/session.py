import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

_current_url = None
_engine = None
_SessionFactory = None

def get_database_url() -> str:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        pg_user = os.getenv("POSTGRES_USER", "sovereign")
        pg_password = os.getenv("POSTGRES_PASSWORD", "sovereign_pass")
        pg_db = os.getenv("POSTGRES_DB", "sovereign_db")
        pg_host = os.getenv("POSTGRES_HOST", "postgres")
        db_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:5432/{pg_db}"
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
    """Initializes all database tables. Replaced by Alembic."""
    pass
