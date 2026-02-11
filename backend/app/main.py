from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, manuals, troubleshooting, equipment, query, system, usage
from app.config import settings

app = FastAPI(
    title="CCR Tech Copilot API",
    version="0.1.0",
    description="AI-powered commercial equipment troubleshooting assistant",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(manuals.router, prefix="/manuals", tags=["Manuals"])
app.include_router(query.router, prefix="/query", tags=["RAG Query"])
app.include_router(troubleshooting.router, prefix="/troubleshoot", tags=["Troubleshooting"])
app.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
app.include_router(usage.router, prefix="/usage", tags=["Usage & Costs"])
app.include_router(system.router, tags=["System"])

from app.api.v1 import debug
app.include_router(debug.router, prefix="/debug", tags=["Debug"])


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("🚀 Tech Copilot API starting up...")
    
    # Seed admin user
    try:
        from app.db.session import SessionLocal
        from app.db.models.user import User
        from app.utils.security import get_password_hash
        
        db = SessionLocal()
        if not db.query(User).filter(User.username == "admin").first():
            print("Creating admin user...")
            user = User(
                username="admin",
                email="admin@ccr.com",
                hashed_password=get_password_hash("password123"),
                full_name="System Admin",
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            print("✅ Admin user created successfully")
        else:
            print("Admin user already exists")
        db.close()
    except Exception as e:
        print(f"Error seeding admin user: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    print("👋 Tech Copilot API shutting down...")
