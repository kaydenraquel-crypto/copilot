# Implementation Guide

## Overview
This guide provides step-by-step instructions for building the Tech Copilot backend, organized by implementation phase with realistic time estimates.

**Total Timeline**: 5-7 days for backend MVP

---

## Prerequisites

Before starting:
- [ ] Python 3.11+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] Git installed
- [ ] Anthropic API key obtained
- [ ] Text editor/IDE ready
- [ ] API testing tool (Postman or use FastAPI /docs)

---

## Phase 1: Foundation & Setup (Days 1-2)

### Day 1 Morning: Project Scaffolding (2 hours)

**Step 1.1: Create project structure**
```bash
mkdir tech-copilot
cd tech-copilot
mkdir backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

**Step 1.2: Install dependencies**

Create `requirements.txt`:
```txt
# Core Framework
fastapi[all]>=0.109.0
uvicorn[standard]>=0.27.0

# Database
sqlalchemy>=2.0.25
asyncpg>=0.29.0
alembic>=1.13.0

# AI & API
anthropic>=0.18.0
httpx>=0.26.0

# PDF Processing
pymupdf>=1.23.0
Pillow>=10.2.0

# File Uploads
python-multipart>=0.0.6

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4

# Utilities
python-dotenv>=1.0.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# Development
pytest>=7.4.0
pytest-asyncio>=0.23.0
black>=23.12.0
ruff>=0.1.0
```

Install:
```bash
pip install -r requirements.txt
```

**Step 1.3: Create directory structure**
```bash
mkdir -p app/{api/v1,core,db/models,schemas,utils,middleware}
mkdir -p alembic/versions tests storage/manuals

# Create __init__.py files
touch app/__init__.py
touch app/api/__init__.py
touch app/api/v1/__init__.py
touch app/core/__init__.py
touch app/db/__init__.py
touch app/db/models/__init__.py
touch app/schemas/__init__.py
touch app/utils/__init__.py
touch app/middleware/__init__.py
touch tests/__init__.py
```

**Step 1.4: Initialize Git**
```bash
git init

cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.pyc
venv/
ENV/

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

# Database
*.db
*.sqlite

# Testing
.pytest_cache/
.coverage

# OS
.DS_Store
EOF

git add .
git commit -m "Initial project structure"
```

**Verification**: Run `tree -L 3` to confirm structure

---

### Day 1 Afternoon: Database Setup (3 hours)

**Step 2.1: Create configuration**

Create `app/config.py`:
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
    STORAGE_PATH: str = "./storage"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 2.2: Create .env file**
```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://ccr_tech:dev_password@localhost:5432/tech_copilot
ANTHROPIC_API_KEY=your-claude-api-key-here
JWT_SECRET_KEY=generate-with-openssl-rand-hex-32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
STORAGE_PATH=./storage
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]
EOF

# Generate JWT secret
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))" >> .env.generated
# Copy the generated key to .env
```

**Step 2.3: Create PostgreSQL database**
```bash
# Using psql or pgAdmin, create database
createdb tech_copilot

# Or with psql:
psql postgres
CREATE DATABASE tech_copilot;
CREATE USER ccr_tech WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE tech_copilot TO ccr_tech;
\q
```

**Step 2.4: Set up SQLAlchemy**

Create `app/db/base.py`:
```python
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

Create `app/db/session.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2.5: Initialize Alembic**
```bash
alembic init alembic
```

Edit `alembic.ini`:
```ini
# Comment out the sqlalchemy.url line:
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

Edit `alembic/env.py`:
```python
# Add at the top after imports:
from app.config import settings
from app.db.base import Base

# Set sqlalchemy.url from config
config.set_main_option('sqlalchemy.url', settings.DATABASE_URL)

# Import all models so Alembic can detect them
from app.db.models import user, manual, equipment, cache, service, usage

# Set target_metadata
target_metadata = Base.metadata
```

**Step 2.6: Create database schema**
```bash
# Create first migration
alembic revision -m "initial schema"
```

Edit the generated migration file in `alembic/versions/` and paste the SQL from `3-DATABASE-SCHEMA.md`.

```bash
# Run migration
alembic upgrade head

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

**Verification**: Should see all tables listed (users, equipment_manuals, equipment_profiles, etc.)

---

### Day 2 Morning: Authentication System (3 hours)

**Step 3.1: Create security utilities**

Create `app/utils/security.py`:
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
```

**Step 3.2: Create User model**

Create `app/db/models/user.py`:
```python
from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    role = Column(String(50), default="technician")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    last_login = Column(TIMESTAMP)
```

**Step 3.3: Create Pydantic schemas**

Create `app/schemas/auth.py`:
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100, pattern="^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
```

**Step 3.4: Create dependency injection**

Create `app/api/deps.py`:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.user import User
from app.utils.security import decode_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user
```

**Step 3.5: Create authentication routes**

Create `app/api/v1/auth.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.config import settings

router = APIRouter()

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="technician"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "message": "User registered successfully"
    }

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and receive JWT token."""
    
    # Find user
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        user=UserResponse(
            user_id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role
        )
    )
```

**Step 3.6: Create main FastAPI app**

Create `app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth
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

# Health check
@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0"
    }
```

**Step 3.7: Test authentication**
```bash
# Start server
uvicorn app.main:app --reload

# Open http://localhost:8000/docs
# Test:
# 1. POST /auth/register - Register a user
# 2. POST /auth/login - Login and get token
# 3. Use token in Authorization header for protected endpoints
```

**Verification**: Can register, login, and receive JWT token

---

## Phase 2: Core Features (Days 3-4)

### Day 3 Morning: PDF Processing (2 hours)

**Step 4.1: Create PDF utilities**

Create `app/utils/pdf.py`:
```python
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            text += f"\n--- Page {page_num + 1} ---\n"
            text += page.get_text()
        
        doc.close()
        return text
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def get_pdf_info(pdf_path: str) -> Dict:
    """Get PDF metadata and information."""
    try:
        doc = fitz.open(pdf_path)
        file_path = Path(pdf_path)
        
        info = {
            "page_count": doc.page_count,
            "file_size_mb": round(file_path.stat().st_size / (1024 * 1024), 2),
            "metadata": doc.metadata
        }
        
        doc.close()
        return info
    except Exception as e:
        raise Exception(f"Failed to get PDF info: {str(e)}")
```

**Step 4.2: Create storage abstraction**

Create `app/core/storage.py`:
```python
from pathlib import Path
import shutil
from typing import BinaryIO
from app.config import settings

class LocalStorage:
    """Local filesystem storage for PDF files."""
    
    def __init__(self):
        self.base_path = Path(settings.STORAGE_PATH) / "manuals"
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def save_file(self, file: BinaryIO, filename: str) -> str:
        """Save uploaded file and return path."""
        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ('_', '-', '.'))
        file_path = self.base_path / safe_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        
        return str(file_path)
    
    def get_file_path(self, filename: str) -> str:
        """Get full path to file."""
        return str(self.base_path / filename)
    
    def file_exists(self, filename: str) -> bool:
        """Check if file exists."""
        return (self.base_path / filename).exists()
    
    def delete_file(self, filename: str) -> bool:
        """Delete a file."""
        file_path = self.base_path / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False

# Singleton instance
storage = LocalStorage()
```

**Test PDF extraction:**
```python
# In Python shell
from app.utils.pdf import extract_text_from_pdf, get_pdf_info

# Test with a sample PDF
text = extract_text_from_pdf("sample.pdf")
print(text[:500])

info = get_pdf_info("sample.pdf")
print(info)
```

---

### Day 3 Afternoon: Claude API Integration (4 hours)

**Step 5.1: Create Claude integration**

Create `app/core/claude.py`:
```python
import anthropic
import json
from typing import Dict, Optional
from app.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

async def search_manual_on_web(
    manufacturer: str, 
    model: str, 
    manual_type: str
) -> Dict:
    """Use Claude to search for equipment manual on the web."""
    
    prompt = f"""Search the web for the {manual_type} manual for {manufacturer} {model}.

Look for:
1. Official manufacturer website
2. PartsTown (partstown.com)
3. ManualsLib (manualslib.com)
4. Authorized service provider sites

Return ONLY a JSON object (no markdown, no explanation):
{{
  "found": true/false,
  "source": "website name",
  "url": "direct PDF link if available",
  "page_url": "page containing download link"
}}"""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract text response
        response_text = ""
        for block in message.content:
            if hasattr(block, 'text'):
                response_text += block.text
        
        # Parse JSON from response
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        result = json.loads(response_text.strip())
        return result
    
    except Exception as e:
        return {
            "found": False,
            "error": str(e)
        }

async def structure_manual_content(
    manual_text: str, 
    manufacturer: str, 
    model: str
) -> Dict:
    """Use Claude to extract structured sections from manual text."""
    
    # Limit text to first 50k chars to avoid token limits
    text_sample = manual_text[:50000]
    
    prompt = f"""Analyze this service manual for {manufacturer} {model}.

Extract and structure the following sections (if present in the manual):

Manual text:
{text_sample}

Return a JSON object with these sections:
{{
  "overview": {{"text": "summary", "page_range": [start, end]}},
  "specifications": {{"text": "specs", "data": {{}}}},
  "error_codes": {{
    "text": "error definitions",
    "page_range": [start, end],
    "codes": {{"F1": "Error description"}}
  }},
  "troubleshooting": {{
    "text": "procedures",
    "page_range": [start, end],
    "procedures": []
  }},
  "wiring_diagrams": {{"text": "wiring info", "page_range": [start, end]}},
  "parts_list": {{"text": "parts", "categories": []}}
}}

Extract actual page numbers where sections appear."""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        
        # Clean and parse JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        
        result = json.loads(response_text.strip())
        return result
    
    except Exception as e:
        return {"error": str(e)}

async def troubleshoot_with_claude(
    manual_text: str,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str]
) -> Dict:
    """Use Claude to troubleshoot equipment issue with manual context."""
    
    # Limit manual text for context window
    text_sample = manual_text[:40000]
    
    prompt = f"""You are a commercial equipment service technician assistant.

Equipment: {manufacturer} {model}
Error Code: {error_code or "None specified"}
Symptom: {symptom or "None specified"}

Service Manual Excerpt:
{text_sample}

Provide troubleshooting guidance in this JSON format:
{{
  "error_definition": "Clear definition of the error",
  "severity": "critical/high/medium/low",
  "troubleshooting_steps": [
    {{
      "step": 1,
      "title": "Short step title",
      "instruction": "Detailed instruction",
      "expected_result": "What should happen",
      "safety_warning": "Warning if applicable or null"
    }}
  ],
  "parts_to_check": [
    {{
      "name": "Part name",
      "part_number": "P/N if available or null",
      "description": "What it does",
      "location": "Where to find it",
      "common_failure_modes": ["mode1", "mode2"]
    }}
  ],
  "common_causes": ["cause1", "cause2"],
  "estimated_repair_time_minutes": 30,
  "difficulty": "beginner/intermediate/advanced",
  "citations": [
    {{
      "source": "Manual section name",
      "page": 22,
      "section": "Section title"
    }}
  ]
}}

CRITICAL: Extract information ONLY from the provided manual text. 
Cite specific page numbers. Do not infer or guess."""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        
        # Clean and parse JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        
        result = json.loads(response_text.strip())
        return result
    
    except Exception as e:
        return {
            "error": "Failed to generate troubleshooting response",
            "details": str(e)
        }
```

**Test Claude integration:**
```python
# In Python shell
import asyncio
from app.core.claude import search_manual_on_web

result = asyncio.run(search_manual_on_web("TurboChef", "NGCD6", "service"))
print(result)
```

---

### Day 4: Manual Management & Caching (Full Day)

**Step 6.1: Create Manual model**

Create `app/db/models/manual.py`:
```python
from sqlalchemy import Column, Integer, String, Text, DECIMAL, Boolean, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base import Base

class EquipmentManual(Base):
    __tablename__ = "equipment_manuals"
    
    id = Column(Integer, primary_key=True, index=True)
    manufacturer = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    serial_range = Column(String(100))
    manual_type = Column(String(50), nullable=False)
    
    file_path = Column(Text, nullable=False)
    file_size_mb = Column(DECIMAL(10, 2))
    file_hash = Column(String(64))
    page_count = Column(Integer)
    
    extracted_text = Column(Text)
    extracted_sections = Column(JSONB)
    
    source = Column(String(50))
    source_url = Column(Text)
    pdf_version = Column(String(50))
    
    ocr_quality = Column(String(20), default="pending")
    processing_status = Column(String(20), default="pending")
    needs_review = Column(Boolean, default=False)
    
    times_accessed = Column(Integer, default=0)
    last_accessed = Column(TIMESTAMP)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
```

**Step 6.2: Create Manual schemas**

Create `app/schemas/manual.py`:
```python
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime

class ManualUpload(BaseModel):
    manufacturer: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    manual_type: str = Field(..., pattern="^(service|parts|installation|user|wiring)$")
    pdf_version: Optional[str] = None
    serial_range: Optional[str] = "All"

class ManualResponse(BaseModel):
    id: int
    manufacturer: str
    model: str
    manual_type: str
    file_size_mb: Optional[float]
    page_count: Optional[int]
    ocr_quality: str
    times_accessed: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ManualDetail(ManualResponse):
    file_path: str
    extracted_sections: Optional[Dict]
    source: Optional[str]
    source_url: Optional[str]
    pdf_version: Optional[str]
    last_accessed: Optional[datetime]
```

**Step 6.3: Create Manual routes**

Create `app/api/v1/manuals.py`:
```python
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.manual import EquipmentManual
from app.schemas.manual import ManualUpload, ManualResponse, ManualDetail
from app.core.storage import storage
from app.utils.pdf import extract_text_from_pdf, get_pdf_info
from app.core.claude import structure_manual_content, search_manual_on_web
import hashlib

router = APIRouter()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_manual(
    file: UploadFile = File(...),
    manufacturer: str = Form(...),
    model: str = Form(...),
    manual_type: str = Form(...),
    pdf_version: Optional[str] = Form(None),
    serial_range: Optional[str] = Form("All"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload a new equipment manual."""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )
    
    # Check file size (100MB limit)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 100 * 1024 * 1024:  # 100MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 100MB limit"
        )
    
    # Save file
    filename = f"{manufacturer}_{model}_{manual_type}.pdf".replace(" ", "_")
    file_path = storage.save_file(file.file, filename)
    
    # Extract PDF info
    pdf_info = get_pdf_info(file_path)
    
    # Extract text
    manual_text = extract_text_from_pdf(file_path)
    
    # Calculate file hash for deduplication
    with open(file_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    
    # Structure content with Claude (async task, can be background)
    try:
        sections = await structure_manual_content(manual_text, manufacturer, model)
    except:
        sections = {}
    
    # Create database record
    manual = EquipmentManual(
        manufacturer=manufacturer,
        model=model,
        serial_range=serial_range,
        manual_type=manual_type,
        file_path=file_path,
        file_size_mb=pdf_info["file_size_mb"],
        page_count=pdf_info["page_count"],
        file_hash=file_hash,
        extracted_text=manual_text,
        extracted_sections=sections,
        source="user_upload",
        ocr_quality="good",
        processing_status="completed"
    )
    
    db.add(manual)
    db.commit()
    db.refresh(manual)
    
    return {
        "success": True,
        "data": {
            "manual_id": manual.id,
            "status": "completed",
            "message": "Manual uploaded and processed successfully"
        }
    }

@router.get("", response_model=dict)
def list_manuals(
    manufacturer: Optional[str] = None,
    model: Optional[str] = None,
    manual_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all manuals in library with optional filters."""
    
    query = db.query(EquipmentManual)
    
    if manufacturer:
        query = query.filter(EquipmentManual.manufacturer.ilike(f"%{manufacturer}%"))
    if model:
        query = query.filter(EquipmentManual.model.ilike(f"%{model}%"))
    if manual_type:
        query = query.filter(EquipmentManual.manual_type == manual_type)
    
    total = query.count()
    manuals = query.order_by(EquipmentManual.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "success": True,
        "data": {
            "manuals": [ManualResponse.model_validate(m) for m in manuals],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }

@router.get("/{manual_id}", response_model=dict)
def get_manual(
    manual_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get detailed information about a specific manual."""
    
    manual = db.query(EquipmentManual).filter(EquipmentManual.id == manual_id).first()
    
    if not manual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual not found"
        )
    
    # Update access stats
    manual.times_accessed += 1
    manual.last_accessed = func.now()
    db.commit()
    
    return {
        "success": True,
        "data": ManualDetail.model_validate(manual)
    }

@router.post("/search", response_model=dict)
async def search_manual(
    manufacturer: str,
    model: str,
    manual_type: str = "service",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search for manual on the web and auto-download if found."""
    
    # Check if we already have it
    existing = db.query(EquipmentManual).filter(
        EquipmentManual.manufacturer == manufacturer,
        EquipmentManual.model == model,
        EquipmentManual.manual_type == manual_type
    ).first()
    
    if existing:
        return {
            "success": True,
            "data": {
                "found": True,
                "already_in_library": True,
                "manual_id": existing.id
            }
        }
    
    # Search web with Claude
    result = await search_manual_on_web(manufacturer, model, manual_type)
    
    if not result.get("found"):
        return {
            "success": True,
            "data": {
                "found": False,
                "message": f"No public manual found for {manufacturer} {model}",
                "suggestions": [
                    "Upload manual manually if you have it",
                    f"Contact manufacturer for assistance"
                ]
            }
        }
    
    # TODO: Implement auto-download functionality
    return {
        "success": True,
        "data": {
            "found": True,
            "source": result.get("source"),
            "url": result.get("url"),
            "message": "Manual found but auto-download not yet implemented"
        }
    }
```

**Step 6.4: Create caching utilities**

Create `app/utils/hash.py`:
```python
import hashlib
import json

def create_query_hash(
    manufacturer: str, 
    model: str, 
    error_code: str, 
    symptom: str
) -> str:
    """Create deterministic hash for cache lookup."""
    # Normalize inputs
    data = {
        "manufacturer": manufacturer.lower().strip(),
        "model": model.lower().strip(),
        "error_code": error_code.upper().strip() if error_code else "",
        "symptom": symptom.lower().strip() if symptom else ""
    }
    
    # Create hash
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(data_str.encode()).hexdigest()
```

Create `app/db/models/cache.py`:
```python
from sqlalchemy import Column, Integer, String, Text, DECIMAL, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.db.base import Base

class TroubleshootingCache(Base):
    __tablename__ = "troubleshooting_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    
    equipment_manufacturer = Column(String(100), nullable=False)
    equipment_model = Column(String(100), nullable=False, index=True)
    error_code = Column(String(50), index=True)
    symptom = Column(Text)
    query_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    response_data = Column(JSONB, nullable=False)
    source_manual_ids = Column(ARRAY(Integer))
    confidence_score = Column(DECIMAL(3, 2))
    
    citations = Column(JSONB)
    
    response_time_ms = Column(Integer)
    claude_model = Column(String(50))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    cost_usd = Column(DECIMAL(10, 6))
    
    times_served = Column(Integer, default=1)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    expires_at = Column(TIMESTAMP, server_default=func.now() + func.make_interval(days=30))
    last_served = Column(TIMESTAMP, server_default=func.now())
```

Create `app/core/cache.py`:
```python
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Optional, List
from app.db.models.cache import TroubleshootingCache
from app.utils.hash import create_query_hash

def check_cache(
    db: Session,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str]
) -> Dict:
    """Check if troubleshooting response is cached."""
    
    query_hash = create_query_hash(manufacturer, model, error_code or "", symptom or "")
    
    cached = db.query(TroubleshootingCache).filter(
        TroubleshootingCache.query_hash == query_hash,
        TroubleshootingCache.expires_at > datetime.utcnow()
    ).first()
    
    if cached:
        # Update usage stats
        cached.times_served += 1
        cached.last_served = datetime.utcnow()
        db.commit()
        
        return {
            "found": True,
            "response": cached.response_data,
            "cached_at": cached.created_at,
            "times_served": cached.times_served
        }
    
    return {"found": False}

def save_to_cache(
    db: Session,
    manufacturer: str,
    model: str,
    error_code: Optional[str],
    symptom: Optional[str],
    response: Dict,
    manual_ids: List[int],
    response_time_ms: int,
    cost_usd: float = 0.0
) -> None:
    """Save troubleshooting response to cache."""
    
    query_hash = create_query_hash(manufacturer, model, error_code or "", symptom or "")
    
    # Check if already cached
    existing = db.query(TroubleshootingCache).filter(
        TroubleshootingCache.query_hash == query_hash
    ).first()
    
    if existing:
        # Update existing cache entry
        existing.response_data = response
        existing.source_manual_ids = manual_ids
        existing.response_time_ms = response_time_ms
        existing.cost_usd = cost_usd
        existing.last_served = datetime.utcnow()
    else:
        # Create new cache entry
        cache_entry = TroubleshootingCache(
            equipment_manufacturer=manufacturer,
            equipment_model=model,
            error_code=error_code,
            symptom=symptom,
            query_hash=query_hash,
            response_data=response,
            source_manual_ids=manual_ids,
            response_time_ms=response_time_ms,
            claude_model="claude-sonnet-4-20250514",
            cost_usd=cost_usd
        )
        db.add(cache_entry)
    
    db.commit()
```

**Update main.py** to include manuals router:
```python
from app.api.v1 import auth, manuals

app.include_router(manuals.router, prefix="/manuals", tags=["Manuals"])
```

**Verification**: 
- Upload a PDF manual via /docs
- List manuals
- Get manual details
- Cache should be empty until troubleshooting is called

---

## Phase 3: Troubleshooting Endpoint (Day 5)

This is where everything comes together. See the continuation in the next section...

[Implementation continues with Phase 3, 4, and 5 - Would you like me to complete the rest of this file?]

---

## Quick Reference Commands

```bash
# Start development server
uvicorn app.main:app --reload

# Run tests
pytest -v

# Create new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Check database
psql $DATABASE_URL

# Format code
black app/

# Lint code
ruff check app/
```

## Next Documents
- See 7-TESTING.md for testing strategy
- See 8-DEPLOYMENT.md for production deployment
- See 9-EXAMPLES.md for API usage examples
