# Tech Copilot - Project Overview

## Project Name
**CCR Tech Copilot** - AI-Powered Commercial Equipment Troubleshooting Assistant

## Business Context
Colorado Commercial Repairs LLC needs a mobile field service tool that helps technicians quickly find equipment manuals, troubleshoot errors, and identify parts. The primary user is a highly skilled commercial equipment technician who needs fast, accurate information while on-site at customer locations.

## Core Problem
When servicing equipment like TurboChef ovens, True refrigerators, Alto Shaam combi ovens, etc., technicians currently spend 10-15 minutes:
1. Googling for service manuals
2. Downloading large PDFs
3. Searching through 100+ page manuals for error codes
4. Cross-referencing parts diagrams
5. Verifying troubleshooting procedures

This wastes billable time and reduces efficiency.

## Solution
A mobile app that uses Claude AI to:
1. Instantly find and extract relevant sections from service manuals
2. Provide step-by-step troubleshooting for error codes
3. Identify required parts with specifications
4. Build a private manual library that grows over time
5. Cache responses to work offline

## Key Differentiators
- **Not a chatbot**: Structured queries with formatted responses
- **Cites sources**: Every piece of information includes page numbers and manual references
- **Private library**: Builds company-specific knowledge base
- **Offline-capable**: Caches common equipment/errors
- **No hallucinations**: AI extracts from verified manuals, doesn't guess

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUTTER MOBILE APP                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Equipment   │  │ Troubleshoot │  │    Manual    │     │
│  │  Profiles    │  │   Interface  │  │   Library    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Route Handler                        │  │
│  │  /troubleshoot  /upload-manual  /search-equipment    │  │
│  └────────┬─────────────────────────────────────────────┘  │
│           │                                                 │
│  ┌────────┴─────────┐     ┌──────────────┐                │
│  │  Cache Manager   │────→│  PostgreSQL  │                │
│  │  - Check cache   │     │  - Manuals   │                │
│  │  - Store results │     │  - Profiles  │                │
│  └────────┬─────────┘     │  - Cache     │                │
│           │               └──────────────┘                │
│           ↓                                                 │
│  ┌──────────────────┐                                      │
│  │  Claude API      │                                      │
│  │  Integration     │                                      │
│  │  - Web search    │                                      │
│  │  - PDF fetch     │                                      │
│  │  - Extraction    │                                      │
│  │  - Synthesis     │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### 1. Backend (FastAPI)
- RESTful API server
- Claude API integration
- Manual processing pipeline
- Caching layer
- PDF text extraction

### 2. Database (PostgreSQL)
- Equipment manual library
- Equipment profiles (customer equipment)
- Troubleshooting cache
- Service history tracking

### 3. Storage
- PDF file storage (local or cloud)
- Extracted manual text
- Images (wiring diagrams, etc.)

### 4. AI Integration (Claude API)
- Web search for manuals
- PDF content extraction
- Structured troubleshooting responses
- Citation generation

### 5. Mobile App (Flutter)
- Equipment profile management
- Troubleshooting interface
- Manual upload/viewing
- Offline caching

## User Workflows

### Workflow 1: Troubleshoot Error Code
```
1. Technician arrives at site
2. Opens app → selects equipment profile OR scans model plate
3. Enters error code (e.g., "F1") and symptom (e.g., "blower")
4. App checks cache → if miss, calls backend
5. Backend checks if manual exists in library
6. If manual exists: Extract relevant section with Claude
7. If manual missing: Search web, download, process, then extract
8. Return formatted response with:
   - Error definition
   - Troubleshooting steps (numbered)
   - Parts to check
   - Source citations (manual page numbers)
9. Cache response for offline use
10. Technician follows steps, logs resolution
```

### Workflow 2: Upload New Manual
```
1. Technician receives PDF from manufacturer
2. Opens app → Manual Library → Upload
3. Takes photo of model plate OR types model number
4. Selects PDF from device storage
5. Backend processes:
   - Extracts text (OCR if scanned)
   - Uses Claude to identify sections
   - Stores structured data in database
6. Manual now available for all future queries
```

### Workflow 3: Equipment Profile Creation
```
1. First time encountering new equipment
2. Scan barcode/model plate with camera
3. App searches library for manual
4. If not found: offers to search web or upload
5. Creates equipment profile linked to customer location
6. Future troubleshooting is one tap away
```

## Success Metrics

### Technical Metrics
- Response time: <3 seconds for cached queries
- Response time: <10 seconds for new queries with manual fetch
- Offline capability: 100% for cached equipment

### Business Metrics
- Time saved per service call: 10-15 minutes average
- Manual library growth: 50+ manuals in first 3 months
- App usage: Daily use on 80%+ of service calls
- Cost per lookup: <$0.05 average (with caching)

## Development Phases

### Phase 1: MVP Backend (Week 1)
- FastAPI server with core endpoints
- PostgreSQL database setup
- Claude API integration
- Manual upload and storage
- Basic troubleshooting endpoint

### Phase 2: Manual Processing (Week 2)
- PDF text extraction pipeline
- Web search for public manuals
- Manual structure extraction with Claude
- Caching layer implementation
- Response formatting

### Phase 3: Mobile App (Week 3)
- Flutter app scaffolding
- Equipment profile management
- Troubleshooting interface
- Manual upload from mobile
- Offline cache management

### Phase 4: Polish & Deploy (Week 4)
- Error handling and edge cases
- Performance optimization
- Deploy to Railway
- Mobile app testing
- Documentation

## Technical Constraints

### Must-Haves
- Works offline for cached equipment
- Cites all information with sources
- No AI hallucinations (extract only, don't infer)
- Fast responses (<10 seconds)
- Secure (authentication required)

### Nice-to-Haves (Future)
- OCR for handwritten service notes
- Voice input for hands-free operation
- Photo recognition of error displays
- Integration with CCR Manager
- Parts ordering integration

## Security & Privacy
- All manuals stored in private database
- No data sharing with third parties
- Authentication required (JWT tokens)
- HTTPS only
- Environment variables for all secrets

## Cost Projections

### Monthly Operating Costs
- Railway hosting: $10-15/month
- Claude API: $5-10/month (with caching)
- Domain/SSL: $2/month
- **Total: ~$20-30/month**

### Per-Query Costs
- First query (no cache): $0.03-0.05
- Cached query: $0.00
- Query with prompt caching: $0.003
- Average (60% cache hit): $0.01-0.02

## Success Criteria for MVP
- [ ] Can troubleshoot error code from known equipment in <5 seconds
- [ ] Can find and process new manual from web automatically
- [ ] Can upload manual from mobile device
- [ ] Responses include proper citations
- [ ] Works offline for previously queried errors
- [ ] Deployed and accessible on mobile device

## Next Steps
1. Review this overview
2. Proceed to tech stack specification
3. Review database schema
4. Begin implementation with Claude Code CLI
