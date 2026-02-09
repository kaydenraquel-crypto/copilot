# Tech Copilot - Comprehensive Development Plan

## 🎯 Project Overview

**Tech Copilot** is an AI-powered field technician assistant designed for Colorado Commercial Repairs LLC. It helps technicians quickly find troubleshooting steps, error code definitions, and parts information from equipment service manuals.

**Core Problem:** Field techs waste 10-15 minutes per service call searching for manuals and browsing through 100+ page PDFs.

**Solution:** AI assistant (powered by Claude API) that instantly retrieves relevant troubleshooting information with citations.

---

## 📚 Documentation Structure

This development plan contains everything needed for **autonomous implementation** with Claude Code CLI:

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[1-OVERVIEW.md](./1-OVERVIEW.md)** | Project goals, architecture, success metrics | Start here |
| **[2-TECH-STACK.md](./2-TECH-STACK.md)** | Complete tech stack with versions & dependencies | Setup phase |
| **[3-DATABASE-SCHEMA.md](./3-DATABASE-SCHEMA.md)** | PostgreSQL schema, models, migrations | Database design |
| **[4-API-SPECIFICATION.md](./4-API-SPECIFICATION.md)** | All API endpoints with request/response formats | API development |
| **[5-FILE-STRUCTURE.md](./5-FILE-STRUCTURE.md)** | Complete project structure & organization | Project setup |
| **[6-IMPLEMENTATION.md](./6-IMPLEMENTATION.md)** | Step-by-step build order (Week 1-3) | **BUILD PHASE** |
| **[7-TESTING.md](./7-TESTING.md)** | Unit, integration, E2E tests | Testing phase |
| **[8-DEPLOYMENT.md](./8-DEPLOYMENT.md)** | Railway, Docker, VPS deployment | Deploy phase |
| **[9-EXAMPLES.md](./9-EXAMPLES.md)** | API usage examples, workflows | Reference |

---

## 🚀 Quick Start for Claude Code CLI

### Option 1: Full Autonomous Build

```bash
# 1. Give Claude Code access to this folder
cd tech-copilot-dev-plan

# 2. Start Claude Code CLI
claude

# 3. Provide this instruction:
"""
Build the Tech Copilot application following the implementation guide in 6-IMPLEMENTATION.md.

Context:
- Complete project specification in this folder
- Follow the exact build order (Week 1 → Week 2 → Week 3)
- Reference other docs as needed (database schema, API spec, etc.)
- Create all files according to 5-FILE-STRUCTURE.md
- Implement all features from 4-API-SPECIFICATION.md

Start with:
1. Project setup (directories, venv, dependencies)
2. Database models and migrations
3. Basic FastAPI app
4. CRUD operations
5. Claude API integration
6. Core troubleshooting endpoint

Verify each major milestone works before proceeding.
"""
```

### Option 2: Incremental Development

Build specific components:

```bash
claude

# Week 1 only
"Follow Day 1-7 of 6-IMPLEMENTATION.md to build the foundation:
- Project setup
- Database schema
- Basic FastAPI app
- CRUD operations
Stop after Week 1 for review."

# Then Week 2
"Continue with Day 8-14 from 6-IMPLEMENTATION.md:
- Manual upload & storage
- PDF processing
- Cache service
- Troubleshooting endpoint"

# Then Week 3
"Complete Day 15-21 from 6-IMPLEMENTATION.md:
- Testing
- Error handling
- Documentation
- Deployment preparation"
```

### Option 3: Feature-Specific Development

```bash
claude

# Just the troubleshooting endpoint
"Build the troubleshooting endpoint following these specs:
- API specification: 4-API-SPECIFICATION.md (endpoint #2)
- Implementation: 6-IMPLEMENTATION.md (Day 11-12)
- Use schemas from: app/schemas/troubleshooting.py structure
- Integrate Claude API as described"

# Just the database layer
"Implement the complete database layer:
- Schema from: 3-DATABASE-SCHEMA.md
- Models according to: 5-FILE-STRUCTURE.md (app/models/)
- Create Alembic migrations
- Include all indexes and triggers"
```

---

## 🏗️ Architecture Highlights

### System Components

```
┌─────────────────────────────────┐
│   FastAPI Backend               │
│                                 │
│   ┌─────────────────────────┐  │
│   │ Troubleshooting Service │  │
│   │ - Check cache first     │  │
│   │ - Route to Claude API   │  │
│   └─────────────────────────┘  │
│                                 │
│   ┌─────────────────────────┐  │
│   │ Manual Management       │  │
│   │ - Upload PDFs           │  │
│   │ - OCR processing        │  │
│   │ - Auto web search       │  │
│   └─────────────────────────┘  │
└────────┬──────────┬─────────────┘
         │          │
         ↓          ↓
  ┌───────────┐  ┌──────────────┐
  │PostgreSQL │  │ Claude API   │
  │ - Manuals │  │ (Sonnet 4)   │
  │ - Cache   │  │ - Web search │
  └───────────┘  │ - PDF fetch  │
                 └──────────────┘
```

### Key Technologies

- **Backend:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL 15+ with JSONB
- **AI:** Claude API (Sonnet 4) with prompt caching
- **PDF:** PyPDF2 + pytesseract for OCR
- **Hosting:** Railway (recommended) or self-hosted
- **Cost:** $15-25/month in production

---

## 📋 Development Checklist

### Week 1: Foundation
- [ ] Project directory structure created
- [ ] Virtual environment setup
- [ ] Dependencies installed (`requirements.txt`)
- [ ] PostgreSQL database running
- [ ] Database models defined (Equipment, Manual, Cache)
- [ ] Alembic migrations created and applied
- [ ] Basic FastAPI app running
- [ ] Health check endpoint working
- [ ] CRUD operations implemented and tested
- [ ] Claude API integration tested

### Week 2: Core Features
- [ ] Manual upload endpoint working
- [ ] File storage organized (manuals/, temp/)
- [ ] PDF text extraction working
- [ ] OCR for scanned PDFs working
- [ ] Cache service implemented
- [ ] Troubleshooting endpoint complete
- [ ] Manual web search working
- [ ] Equipment profile CRUD complete
- [ ] All endpoints respond correctly

### Week 3: Polish & Deploy
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passing
- [ ] Error handling comprehensive
- [ ] Logging configured
- [ ] API documentation complete
- [ ] Environment variables configured
- [ ] Deployed to Railway/hosting platform
- [ ] Database migrations applied in production
- [ ] Manual upload tested in production
- [ ] End-to-end troubleshooting workflow tested

---

## 🎓 Key Design Decisions

### Why Claude API over Gemini?
- Superior reasoning quality
- Built-in web search and PDF fetch tools
- Prompt caching (90% cost savings on repeated content)
- Better at technical troubleshooting

### Why PostgreSQL over MongoDB?
- Structured data (equipment, error codes)
- JSONB for flexible manual sections
- Better for complex queries and caching
- Mature ecosystem

### Why API-First Architecture?
- Backend can be tested independently
- Mobile app can be built separately
- Enables future integrations
- Faster to validate core functionality

### Why Aggressive Caching?
- Reduces API costs by 90%
- 10x faster responses for common queries
- Still provides fresh data (30-day expiration)
- Learns common equipment issues over time

---

## 💰 Cost Breakdown

### Development
- **Time:** 3 weeks (part-time evenings)
- **Tools:** Free (Python, PostgreSQL, VS Code, Claude Code CLI)

### Production (Monthly)
- **Hosting (Railway):** $10-15
- **Claude API:** $5-10 (with caching)
- **Total:** $15-25/month

### Cost Savings vs Manual Search
- **Before:** 15 min/call × 20 calls/month = 5 hours wasted
- **After:** 30 seconds/call × 20 calls/month = 10 minutes
- **Time Saved:** 4.9 hours/month = $250-500 in labor

**ROI:** Pays for itself in first month

---

## 🧪 Testing Strategy

### Test Coverage Goals
- **Overall:** >80%
- **Critical Paths:** >95% (Claude service, troubleshooting, cache)
- **CRUD:** >90%
- **Utils:** >85%

### Test Types
1. **Unit Tests (70%):** Individual functions, classes
2. **Integration Tests (20%):** API endpoints, database operations
3. **E2E Tests (10%):** Complete workflows

### Run Tests
```bash
# All tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html

# Specific test file
pytest tests/test_api/test_troubleshooting.py -v

# Fast tests only (skip integration)
pytest tests/ -m "not integration"
```

---

## 🚢 Deployment Options

### Railway (Recommended - $10-15/month)
- Easiest setup
- PostgreSQL included
- Auto-deploys from GitHub
- Built-in volumes for file storage

### Render ($14/month)
- Similar to Railway
- Good PostgreSQL support
- Free tier available for testing

### Self-Hosted VPS ($12/month)
- Full control
- More setup required
- Good for learning

### Docker Compose (Any platform)
- Portable deployment
- Easy local development
- Can run anywhere

See **[8-DEPLOYMENT.md](./8-DEPLOYMENT.md)** for detailed instructions.

---

## 📖 Usage Examples

### Troubleshoot Equipment
```bash
curl -X POST http://localhost:8000/api/v1/troubleshoot \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": {
      "manufacturer": "TurboChef",
      "model": "NGCD6"
    },
    "error_code": "F1"
  }'
```

### Upload Manual
```bash
curl -X POST http://localhost:8000/api/v1/manuals/upload \
  -F "file=@manual.pdf" \
  -F "manufacturer=TurboChef" \
  -F "model=NGCD6" \
  -F "manual_type=service"
```

### Search for Manual
```bash
curl -X POST http://localhost:8000/api/v1/manuals/search \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "True",
    "model": "T-49",
    "manual_type": "service"
  }'
```

See **[9-EXAMPLES.md](./9-EXAMPLES.md)** for complete API examples.

---

## ⚠️ Common Issues & Solutions

### Database Connection Refused
```bash
# Check PostgreSQL is running
docker-compose ps

# Or start it
docker-compose up -d db
```

### Claude API Timeout
```python
# Increase timeout in config.py
CLAUDE_TIMEOUT: int = 60  # Increase to 60 seconds
```

### OCR Fails
```bash
# Install Tesseract
brew install tesseract  # Mac
apt-get install tesseract-ocr  # Linux
```

### File Upload Fails
```bash
# Ensure storage directory exists
mkdir -p storage/manuals storage/temp

# Check permissions
chmod -R 755 storage/
```

---

## 🎯 Success Metrics

### Technical Goals
- API response time: <2s cached, <10s new queries
- Cache hit rate: >70% after 1 month
- Test coverage: >80%
- Uptime: >99.5%

### Business Goals
- Reduce manual search time: 15 min → 30 sec
- Build manual library: 50+ manuals in 3 months
- Cost: <$30/month to operate
- ROI: Positive within first month

---

## 🔮 Future Enhancements (Phase 2)

- [ ] Flutter mobile app
- [ ] User authentication & multi-user support
- [ ] Parts ordering integration
- [ ] Background job processing for OCR
- [ ] Advanced analytics dashboard
- [ ] Integration with CCR Manager
- [ ] Offline mode with cached manuals
- [ ] Voice input for hands-free operation

---

## 📞 Support & Contact

**Developer:** Claude Code CLI (autonomous)  
**Project Owner:** Colorado Commercial Repairs LLC  
**Documentation Version:** 1.0.0  
**Last Updated:** February 8, 2025

---

## 📄 License

Private project for Colorado Commercial Repairs LLC.  
Not for public distribution without permission.

---

## 🙏 Acknowledgments

- **Anthropic** for Claude API
- **FastAPI** community for excellent framework
- **Railway** for simple deployment
- **PartsTown** for public equipment manuals

---

## Next Steps

1. **Read [1-OVERVIEW.md](./1-OVERVIEW.md)** for full project context
2. **Follow [6-IMPLEMENTATION.md](./6-IMPLEMENTATION.md)** step-by-step
3. **Reference other docs as needed** during development
4. **Deploy following [8-DEPLOYMENT.md](./8-DEPLOYMENT.md)**
5. **Build mobile app** (Phase 2) after backend is stable

**Ready to build? Start with [6-IMPLEMENTATION.md](./6-IMPLEMENTATION.md) Day 1!**
