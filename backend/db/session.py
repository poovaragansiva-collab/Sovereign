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
    """Initializes all database tables using Alembic migrations programmatically."""
    import logging
    from alembic import command
    from alembic.config import Config
    import os
    
    get_engine()
    
    try:
        # Determine paths relative to this file
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        alembic_cfg_path = os.path.join(backend_dir, "alembic.ini")
        
        if os.path.exists(alembic_cfg_path):
            alembic_cfg = Config(alembic_cfg_path)
            # Ensure script_location is relative to backend_dir
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
            alembic_cfg.set_main_option("sqlalchemy.url", get_database_url())
            command.upgrade(alembic_cfg, "head")
            logging.getLogger("alembic").info("Database migrations applied successfully.")
        else:
            raise FileNotFoundError("alembic.ini not found")
    except Exception as e:
        logging.getLogger("alembic").error(f"Failed to apply migrations, falling back to create_all: {e}")
        from backend.db.models import Base
        Base.metadata.create_all(bind=engine)
