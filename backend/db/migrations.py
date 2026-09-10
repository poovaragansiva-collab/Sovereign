import sqlite3
import os
import logging
from sqlalchemy import inspect
from backend.db.session import get_engine, Base
import backend.db.models  # Ensure all models are registered with Base

logger = logging.getLogger("sovereign.migrations")

def run_safe_migrations():
    """
    Safely initializes all database tables and performs idempotent column migrations.
    Never drops tables or erases existing user data.
    """
    engine = get_engine()
    # 1. Create any missing tables defined in SQLAlchemy models
    Base.metadata.create_all(bind=engine)
    logger.info("Base tables initialized or verified.")

    # 2. Inspect SQLite database for existing columns and safely add missing ones
    db_path = None
    url_str = str(engine.url)
    if "sqlite:///" in url_str:
        db_path = url_str.split("sqlite:///")[-1]
    
    if not db_path or not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Check Document table columns
        cur.execute("PRAGMA table_info(documents)")
        doc_cols = [c[1] for c in cur.fetchall()]
        if "chunks_count" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN chunks_count INTEGER DEFAULT 0 NOT NULL")
        if "ocr_applied" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN ocr_applied BOOLEAN DEFAULT 0 NOT NULL")
        if "page_count" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN page_count INTEGER DEFAULT 1 NOT NULL")
        if "status" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN status VARCHAR(50) DEFAULT 'ready' NOT NULL")

        # Check Output table columns
        cur.execute("PRAGMA table_info(outputs)")
        output_cols = [c[1] for c in cur.fetchall()]
        if "conversation_id" not in output_cols:
            cur.execute("ALTER TABLE outputs ADD COLUMN conversation_id VARCHAR(64)")
        if "file_size" not in output_cols:
            cur.execute("ALTER TABLE outputs ADD COLUMN file_size INTEGER DEFAULT 0 NOT NULL")

        conn.commit()
        logger.info("Safe column migrations executed successfully.")
    except Exception as e:
        logger.error(f"Migration warning: {e}")
    finally:
        conn.close()
