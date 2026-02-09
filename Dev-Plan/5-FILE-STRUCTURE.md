# File Structure

## Complete Project Directory Layout

```
tech-copilot/
├── backend/                          # FastAPI backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI application entry point
│   │   ├── config.py                 # Configuration and environment variables
│   │   │
│   │   ├── api/                      # API routes
│   │   │   ├── __init__.py
│   │   │   ├── deps.py               # Dependency injection (auth, db)
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py           # Authentication endpoints
│   │   │       ├── manuals.py        # Manual management endpoints
│   │   │       ├── troubleshooting.py # Troubleshooting endpoints
│   │   │       ├── equipment.py      # Equipment profile endpoints
│   │   │       ├── service.py        # Service history endpoints
│   │   │       └── system.py         # Health, stats endpoints
│   │   │
│   │   ├── core/                     # Core business logic
│   │   │   ├── __init__.py
│   │   │   ├── cache.py              # Caching layer
│   │   │   ├── claude.py             # Claude API integration
│   │   │   ├── manual_processor.py   # PDF processing and structuring
│   │   │   ├── search.py             # Web search for manuals
│   │   │   └── storage.py            # File storage abstraction
│   │   │
│   │   ├── db/                       # Database
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # SQLAlchemy base and imports
│   │   │   ├── session.py            # Database session management
│   │   │   └── models/
│   │   │       ├── __init__.py
│   │   │       ├── user.py           # User model
│   │   │       ├── manual.py         # Equipment manual model
│   │   │       ├── equipment.py      # Equipment profile model
│   │   │       ├── cache.py          # Troubleshooting cache model
│   │   │       ├── service.py        # Service history model
│   │   │       └── usage.py          # API usage logs model
│   │   │
│   │   ├── schemas/                  # Pydantic models (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py               # Auth schemas
│   │   │   ├── manual.py             # Manual schemas
│   │   │   ├── troubleshooting.py    # Troubleshooting schemas
│   │   │   ├── equipment.py          # Equipment schemas
│   │   │   └── service.py            # Service schemas
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── security.py           # Password hashing, JWT
│   │   │   ├── pdf.py                # PDF text extraction
│   │   │   ├── hash.py               # Hashing for cache keys
│   │   │   └── logger.py             # Logging configuration
│   │   │
│   │   └── middleware/               # Custom middleware
│   │       ├── __init__.py
│   │       ├── rate_limit.py         # Rate limiting
│   │       └── logging.py            # Request/response logging
│   │
│   ├── alembic/                      # Database migrations
│   │   ├── versions/
│   │   │   └── [migration files]
│   │   ├── env.py
│   │   └── alembic.ini
│   │
│   ├── tests/                        # Test suite
│   │   ├── __init__.py
│   │   ├── conftest.py               # Pytest fixtures
│   │   ├── test_auth.py
│   │   ├── test_manuals.py
│   │   ├── test_troubleshooting.py
│   │   └── test_equipment.py
│   │
│   ├── storage/                      # File storage (gitignored)
│   │   └── manuals/
│   │       └── [PDF files]
│   │
│   ├── .env                          # Environment variables (gitignored)
│   ├── .env.example                  # Example environment variables
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker configuration
│   ├── docker-compose.yml            # Local development
│   ├── railway.json                  # Railway deployment config
│   └── README.md                     # Backend documentation
│
├── mobile/                           # Flutter mobile app (Phase 3)
│   ├── lib/
│   │   ├── main.dart
│   │   ├── models/
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── services/
│   │   └── utils/
│   ├── assets/
│   ├── test/
│   ├── pubspec.yaml
│   └── README.md
│
├── docs/                             # Documentation
│   ├── dev-plan/                     # These planning documents
│   ├── api-examples/                 # API usage examples
│   └── deployment/                   # Deployment guides
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## Key Files Explained

### Backend Application Entry Point

#### `app/main.py`
Main FastAPI application setup.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, manuals, troubleshooting, equipment, service, system
from app.config import settings

app = FastAPI(
    title="CCR Tech Copilot API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(manuals.router, prefix="/manuals", tags=["manuals"])
app.include_router(troubleshooting.router, prefix="/troubleshoot", tags=["troubleshooting"])
app.include_router(equipment.router, prefix="/equipment", tags=["equipment"])
app.include_router(service.router, prefix="/service-history", tags=["service"])
app.include_router(system.router, tags=["system"])
```

---

#### `app/config.py`
Configuration management using Pydantic settings.

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    
    # Claude API
    ANTHROPIC_API_KEY: str
    
    # Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Storage
    STORAGE_TYPE: str = "local"  # or "r2"
    STORAGE_PATH: str = "./storage"
    
    # R2 (if using)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

### Database Models Example

#### `app/db/models/manual.py`
```python
from sqlalchemy import Column, Integer, String, Text, DECIMAL, Boolean, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base import Base

class EquipmentManual(Base):
    __tablename__ = "equipment_manuals"
    
    id = Column(Integer, primary_key=True, index=True)
    manufacturer = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    manual_type = Column(String(50), nullable=False)
    file_path = Column(Text, nullable=False)
    extracted_text = Column(Text)
    extracted_sections = Column(JSONB)
    source = Column(String(50))
    ocr_quality = Column(String(20), default="pending")
    times_accessed = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
```

---

### API Route Example

#### `app/api/v1/troubleshooting.py`
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.troubleshooting import TroubleshootRequest, TroubleshootResponse
from app.core.cache import check_cache, save_to_cache
from app.core.claude import troubleshoot_with_claude

router = APIRouter()

@router.post("", response_model=TroubleshootResponse)
async def troubleshoot(
    request: TroubleshootRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Troubleshoot equipment issue using AI.
    """
    # Check cache first
    cached = check_cache(db, request)
    if cached:
        return cached
    
    # Call Claude API
    response = await troubleshoot_with_claude(db, request)
    
    # Save to cache
    save_to_cache(db, request, response)
    
    return response
```

---

### Core Business Logic Example

#### `app/core/claude.py`
```python
import anthropic
from app.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def troubleshoot_with_claude(db, request):
    """
    Use Claude API to troubleshoot equipment issue.
    """
    # Get manual from database
    manual = get_manual(db, request.manufacturer, request.model)
    
    if not manual:
        # Search for manual
        manual = await search_and_download_manual(request.manufacturer, request.model)
    
    # Build prompt with manual content
    prompt = build_troubleshooting_prompt(manual, request)
    
    # Call Claude with tools
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Parse and structure response
    return parse_claude_response(message)
```

---

### Pydantic Schemas Example

#### `app/schemas/troubleshooting.py`
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class TroubleshootRequest(BaseModel):
    manufacturer: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    error_code: Optional[str] = Field(None, max_length=50)
    symptom: Optional[str] = None
    additional_context: Optional[str] = None

class TroubleshootingStep(BaseModel):
    step: int
    title: str
    instruction: str
    expected_result: str
    safety_warning: Optional[str] = None

class PartToCheck(BaseModel):
    name: str
    part_number: Optional[str] = None
    description: str
    location: Optional[str] = None

class Citation(BaseModel):
    source: str
    manual_id: Optional[int] = None
    page: Optional[int] = None
    section: Optional[str] = None
    url: Optional[str] = None

class TroubleshootResponse(BaseModel):
    cache_hit: bool
    response_time_ms: int
    troubleshooting: dict
    manual_available: bool
    manual_id: Optional[int] = None
```

---

## Environment Variables

### `.env.example`
```bash
# Environment
ENVIRONMENT=development
DEBUG=True

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tech_copilot

# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Authentication (generate with: openssl rand -hex 32)
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage

# R2 Storage (optional)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

---

## Docker Configuration

### `Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY ./app /app/app
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/

# Create storage directory
RUN mkdir -p /app/storage/manuals

# Expose port
EXPOSE 8000

# Run migrations and start app
CMD alembic upgrade head && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ccr_tech
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: tech_copilot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://ccr_tech:dev_password@db:5432/tech_copilot
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    depends_on:
      - db
    volumes:
      - ./app:/app/app
      - ./storage:/app/storage
      - ./alembic:/app/alembic

volumes:
  postgres_data:
```

---

## Railway Deployment

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Git Configuration

### `.gitignore`
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Environment
.env
.env.local

# Storage
storage/
*.pdf

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/

# Alembic
alembic/versions/*.pyc
```

---

## Testing Structure

### `tests/conftest.py`
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.api.deps import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

---

## README Structure

### `backend/README.md`
```markdown
# CCR Tech Copilot - Backend

AI-powered commercial equipment troubleshooting assistant.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Start development server:
```bash
uvicorn app.main:app --reload
```

## API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing
```bash
pytest
```

## Docker
```bash
docker-compose up
```
```

---

## Next Steps

1. Create the directory structure:
```bash
mkdir -p backend/app/{api/v1,core,db/models,schemas,utils,middleware}
mkdir -p backend/{alembic/versions,tests,storage/manuals}
```

2. Initialize files:
```bash
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/config.py
# ... create other __init__.py files
```

3. Set up version control:
```bash
git init
git add .
git commit -m "Initial project structure"
```

4. Begin implementation (see 6-IMPLEMENTATION.md)
