# Tech Stack Specification

## Overview
This document specifies the exact technologies, versions, and rationale for each component of the Tech Copilot system.

## Backend Stack

### Python 3.11+
**Why**: Latest stable Python with excellent async support, type hints, and performance improvements.

### FastAPI 0.109.0+
**Why**: 
- Modern async Python framework
- Automatic OpenAPI documentation
- Built-in validation with Pydantic
- Excellent performance
- Easy to deploy

**Installation**:
```bash
pip install "fastapi[all]>=0.109.0"
```

### Uvicorn 0.27.0+ (ASGI Server)
**Why**: High-performance ASGI server for FastAPI

**Installation**:
```bash
pip install "uvicorn[standard]>=0.27.0"
```

### Anthropic Python SDK 0.18.0+
**Why**: Official Claude API client with streaming support

**Installation**:
```bash
pip install "anthropic>=0.18.0"
```

### PyPDF2 3.0.0+ or PyMuPDF (fitz) 1.23.0+
**Why**: PDF text extraction

**Recommendation**: Use PyMuPDF (fitz) for better performance and OCR support

**Installation**:
```bash
pip install "pymupdf>=1.23.0"
```

### Pillow 10.2.0+
**Why**: Image processing for manual covers, model plate photos

**Installation**:
```bash
pip install "Pillow>=10.2.0"
```

### Python-Multipart 0.0.6+
**Why**: File upload handling in FastAPI

**Installation**:
```bash
pip install "python-multipart>=0.0.6"
```

## Database Stack

### PostgreSQL 15+
**Why**:
- Robust JSONB support for flexible data structures
- Excellent full-text search capabilities
- Proven reliability
- Railway/Render native support

**Key Features Used**:
- JSONB columns for structured manual sections
- Full-text search for manual content
- Foreign key constraints for data integrity
- Indexes for performance

### SQLAlchemy 2.0.25+ (ORM)
**Why**: 
- Industry-standard Python ORM
- Type-safe queries
- Excellent async support
- Migration management

**Installation**:
```bash
pip install "sqlalchemy>=2.0.25"
```

### Asyncpg 0.29.0+ (PostgreSQL Driver)
**Why**: Fastest PostgreSQL driver for Python, async-native

**Installation**:
```bash
pip install "asyncpg>=0.29.0"
```

### Alembic 1.13.0+ (Migrations)
**Why**: Database migration management, integrated with SQLAlchemy

**Installation**:
```bash
pip install "alembic>=1.13.0"
```

## Storage Options

### Option 1: Local Filesystem (Default for MVP)
**Why**: Simplest for development and small-scale deployment
**Location**: `/app/storage/manuals/`
**Pros**: No additional service, fast access
**Cons**: Not scalable beyond single server

### Option 2: Cloudflare R2 (Recommended for Production)
**Why**: 
- S3-compatible API
- Zero egress fees
- 10GB free tier
- Cost-effective at scale

**SDK**: boto3 (S3-compatible)
```bash
pip install "boto3>=1.34.0"
```

### Option 3: Railway/Render Persistent Volumes
**Why**: Native to hosting platform
**Pros**: Easy setup, included in hosting
**Cons**: More expensive per GB than R2

## API & Web Tools

### HTTPX 0.26.0+
**Why**: Modern async HTTP client for calling Claude API and downloading manuals

**Installation**:
```bash
pip install "httpx>=0.26.0"
```

### Pydantic 2.5.0+
**Why**: Data validation and serialization (included with FastAPI)
- Type safety
- Automatic validation
- JSON schema generation

### Python-Jose 3.3.0+ (JWT)
**Why**: JWT token generation and validation for authentication

**Installation**:
```bash
pip install "python-jose[cryptography]>=3.3.0"
```

### Passlib 1.7.4+ (Password Hashing)
**Why**: Secure password hashing with bcrypt

**Installation**:
```bash
pip install "passlib[bcrypt]>=1.7.4"
```

## Development Tools

### Pytest 7.4.0+
**Why**: Testing framework

**Installation**:
```bash
pip install "pytest>=7.4.0" "pytest-asyncio>=0.23.0"
```

### Black 23.12.0+
**Why**: Code formatting

**Installation**:
```bash
pip install "black>=23.12.0"
```

### Ruff 0.1.0+
**Why**: Fast Python linter (replaces flake8, pylint, isort)

**Installation**:
```bash
pip install "ruff>=0.1.0"
```

## Mobile Stack (Future - Phase 3)

### Flutter 3.16.0+
**Why**: Cross-platform mobile development (iOS + Android)

### Dart 3.2.0+
**Why**: Flutter's programming language

### Key Flutter Packages:
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0              # API calls
  provider: ^6.1.0          # State management
  shared_preferences: ^2.2.0 # Local storage
  path_provider: ^2.1.0     # File paths
  image_picker: ^1.0.0      # Camera/gallery
  mobile_scanner: ^3.5.0    # Barcode scanning
  cached_network_image: ^3.3.0 # Image caching
```

## Hosting & Deployment

### Railway (Recommended)
**Why**:
- Automatic deployments from Git
- PostgreSQL included
- Environment variable management
- $5 starter, ~$10-15/month for production
- Simple CLI deployment

**Alternative**: Render
- Similar features
- Slightly different pricing model
- Also excellent for FastAPI + PostgreSQL

### Deployment Method
- Git-based continuous deployment
- Dockerfile for consistent environments
- Automatic SSL certificates
- Custom domain support

## Environment Variables Required

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://...

# Storage (if using R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=ccr-manuals

# Authentication
JWT_SECRET_KEY=... # Generate with: openssl rand -hex 32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# App Config
ENVIRONMENT=development  # or production
DEBUG=True  # or False for production
CORS_ORIGINS=["http://localhost:3000", "https://your-domain.com"]

# Optional: Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

## Complete requirements.txt

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

# Storage (optional - if using S3/R2)
boto3>=1.34.0

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

## Docker Configuration

### Dockerfile
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
COPY . .

# Create storage directory
RUN mkdir -p /app/storage/manuals

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml (for local development)
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
    depends_on:
      - db
    volumes:
      - ./app:/app/app
      - ./storage:/app/storage

volumes:
  postgres_data:
```

## Performance Targets

### Response Times
- Cached query: <500ms
- New query with existing manual: <3 seconds
- New query with manual download: <10 seconds
- Manual upload processing: <30 seconds for 100-page PDF

### Scalability
- Support 100 concurrent users
- Handle 1000+ manuals in library
- 10,000+ cached troubleshooting responses
- Storage: up to 50GB manuals (500 PDFs @ 100MB avg)

## Security Considerations

### API Security
- JWT-based authentication
- HTTPS only in production
- CORS properly configured
- Rate limiting per user/IP
- Input validation on all endpoints

### Data Security
- Passwords hashed with bcrypt
- Database credentials in environment variables
- API keys never in code
- Regular backups of database

### File Security
- Validate file types before upload
- Scan PDFs for malicious content
- Size limits on uploads (100MB max)
- Sanitize filenames

## Monitoring & Logging (Future)

### Logging
- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Request/response logging
- Claude API usage logging

### Monitoring Tools (Optional)
- Sentry for error tracking
- Railway metrics for resource usage
- Custom metrics: API usage, cache hit rate, response times

## Backup Strategy

### Database Backups
- Railway automatic daily backups
- Weekly manual exports
- Store in separate location (R2 or local)

### Manual Storage Backups
- Weekly backup of all PDFs
- Store in redundant location
- Verify backup integrity monthly

## Version Control

### Git Strategy
- Main branch: production-ready code
- Develop branch: active development
- Feature branches: individual features
- Semantic versioning: v0.1.0, v0.2.0, etc.

### Repository Structure
```
tech-copilot/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── mobile/  (Phase 3)
│   ├── lib/
│   └── pubspec.yaml
└── docs/
    └── [these planning documents]
```

## Technology Decision Summary

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend Language | Python 3.11 | Excellent AI/ML libraries, async support |
| Web Framework | FastAPI | Modern, fast, auto-docs |
| Database | PostgreSQL 15 | JSONB support, reliability |
| ORM | SQLAlchemy 2.0 | Industry standard, type-safe |
| AI API | Claude (Anthropic) | Best reasoning, reliable |
| PDF Processing | PyMuPDF | Fast, good OCR support |
| Hosting | Railway | Easy deployment, PostgreSQL included |
| Mobile Framework | Flutter | Cross-platform, one codebase |
| Authentication | JWT | Stateless, scalable |
| Storage | Local/R2 | Start simple, scale as needed |

## Next Steps
1. Set up Python virtual environment
2. Install dependencies from requirements.txt
3. Configure environment variables
4. Proceed to database schema implementation
