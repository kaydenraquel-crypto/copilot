from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, manuals, troubleshooting, equipment, system, usage
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
app.include_router(troubleshooting.router, prefix="/troubleshoot", tags=["Troubleshooting"])
app.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
app.include_router(usage.router, prefix="/usage", tags=["Usage & Costs"])
app.include_router(system.router, tags=["System"])


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print("🚀 Tech Copilot API starting up...")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    print("👋 Tech Copilot API shutting down...")
