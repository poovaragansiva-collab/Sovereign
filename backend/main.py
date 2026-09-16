import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db as init_database
from backend.api.v1 import router as api_v1_router
from backend.api.routes import health as legacy_health
from backend.services.config_db import init_db as init_legacy_db

app = FastAPI(
    title="SOVEREIGN – Local AI Workbench API",
    description="Enterprise Local-First AI Application and Data Engine",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
def on_startup():
    init_database()
    init_legacy_db()
    
    # Bootstrap admin
    from backend.db.session import SessionLocal
    from backend.db.models import User
    from backend.core.security import get_password_hash
    db = SessionLocal()
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        db.close()
        raise ValueError("ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set")
    
    try:
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin_user = User(
                username="admin",
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                display_name="System Administrator",
                role="admin",
                status="APPROVED",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to bootstrap admin user: {e}")
    finally:
        db.close()

# Mount API v1 endpoints
app.include_router(api_v1_router, prefix="/api/v1")

# Mount root health check
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
