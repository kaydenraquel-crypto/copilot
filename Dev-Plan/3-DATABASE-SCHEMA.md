# Database Schema

## Overview
PostgreSQL 15+ database schema for Tech Copilot. Uses JSONB for flexible structured data, full-text search for manual content, and proper indexing for performance.

## Schema Diagram

```
┌─────────────────────┐
│  equipment_manuals  │
│  ────────────────── │
│  • id (PK)          │
│  • manufacturer     │
│  • model            │
│  • manual_type      │
│  • file_path        │
│  • extracted_text   │
│  • sections (JSONB) │
└──────────┬──────────┘
           │
           │ 1:N
           ↓
┌─────────────────────┐       ┌──────────────────────┐
│ equipment_profiles  │──────→│  troubleshooting_    │
│  ────────────────── │  N:M  │      cache           │
│  • id (PK)          │       │  ──────────────────  │
│  • manufacturer     │       │  • id (PK)           │
│  • model            │       │  • equipment_model   │
│  • serial_number    │       │  • error_code        │
│  • manual_id (FK)   │       │  • symptom           │
│  • customer_loc     │       │  • response (JSONB)  │
└─────────────────────┘       └──────────────────────┘
           │
           │ 1:N
           ↓
┌─────────────────────┐
│  service_history    │
│  ────────────────── │
│  • id (PK)          │
│  • profile_id (FK)  │
│  • service_date     │
│  • issue_resolved   │
│  • notes            │
└─────────────────────┘
```

## Complete SQL Schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================================
-- TABLE: equipment_manuals
-- Stores all equipment service manuals, parts lists, and documentation
-- ============================================================================
CREATE TABLE equipment_manuals (
    id SERIAL PRIMARY KEY,
    
    -- Equipment identification
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_range VARCHAR(100),  -- e.g., "2020-2023" or "All"
    manual_type VARCHAR(50) NOT NULL,  -- 'service', 'parts', 'installation', 'user', 'wiring'
    
    -- File storage
    file_path TEXT NOT NULL,  -- Path to PDF file
    file_size_mb DECIMAL(10, 2),
    file_hash VARCHAR(64),  -- SHA-256 hash for deduplication
    page_count INTEGER,
    
    -- Extracted content
    extracted_text TEXT,  -- Full OCR text
    extracted_sections JSONB,  -- Structured sections (see below for format)
    
    -- Metadata
    source VARCHAR(50),  -- 'partstown', 'user_upload', 'manufacturer', 'web_search', 'manualslib'
    source_url TEXT,  -- Where we found it
    pdf_version VARCHAR(50),  -- e.g., "Rev C", "2023-08"
    
    -- Processing status
    ocr_quality VARCHAR(20) DEFAULT 'pending',  -- 'excellent', 'good', 'fair', 'poor', 'failed', 'pending'
    processing_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    
    -- Usage tracking
    times_accessed INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(manufacturer, model, manual_type, pdf_version),
    CHECK (manual_type IN ('service', 'parts', 'installation', 'user', 'wiring', 'technical_bulletin')),
    CHECK (ocr_quality IN ('excellent', 'good', 'fair', 'poor', 'failed', 'pending')),
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for equipment_manuals
CREATE INDEX idx_manuals_manufacturer ON equipment_manuals(manufacturer);
CREATE INDEX idx_manuals_model ON equipment_manuals(model);
CREATE INDEX idx_manuals_type ON equipment_manuals(manual_type);
CREATE INDEX idx_manuals_manufacturer_model ON equipment_manuals(manufacturer, model);
CREATE INDEX idx_manuals_text_search ON equipment_manuals USING gin(to_tsvector('english', extracted_text));
CREATE INDEX idx_manuals_sections ON equipment_manuals USING gin(extracted_sections);

-- ============================================================================
-- TABLE: equipment_profiles
-- Tracks specific equipment instances at customer locations
-- ============================================================================
CREATE TABLE equipment_profiles (
    id SERIAL PRIMARY KEY,
    
    -- Equipment identification
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    
    -- Location/customer info
    customer_name VARCHAR(200),
    customer_location TEXT,  -- Address or location description
    installation_date DATE,
    
    -- Manual link
    manual_id INTEGER REFERENCES equipment_manuals(id) ON DELETE SET NULL,
    
    -- Equipment details
    equipment_notes TEXT,  -- Technician notes about this specific unit
    common_issues JSONB,  -- Track recurring problems: {"issues": ["blower_frequent", "temp_sensor_drift"]}
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    last_service_date DATE,
    next_service_due DATE,
    warranty_expiration DATE,
    
    -- Metadata
    created_by VARCHAR(100),  -- Technician who created profile
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for equipment_profiles
CREATE INDEX idx_profiles_manufacturer ON equipment_profiles(manufacturer);
CREATE INDEX idx_profiles_model ON equipment_profiles(model);
CREATE INDEX idx_profiles_serial ON equipment_profiles(serial_number);
CREATE INDEX idx_profiles_customer ON equipment_profiles(customer_name);
CREATE INDEX idx_profiles_manual ON equipment_profiles(manual_id);
CREATE INDEX idx_profiles_active ON equipment_profiles(active) WHERE active = TRUE;

-- ============================================================================
-- TABLE: troubleshooting_cache
-- Caches AI-generated troubleshooting responses
-- ============================================================================
CREATE TABLE troubleshooting_cache (
    id SERIAL PRIMARY KEY,
    
    -- Query parameters
    equipment_manufacturer VARCHAR(100) NOT NULL,
    equipment_model VARCHAR(100) NOT NULL,
    error_code VARCHAR(50),
    symptom TEXT,
    query_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of normalized query
    
    -- Response data
    response_data JSONB NOT NULL,  -- Full structured response (see format below)
    source_manual_ids INTEGER[],  -- Array of manual IDs used
    confidence_score DECIMAL(3, 2),  -- 0.00 to 1.00
    
    -- Citations
    citations JSONB,  -- Array of {manual_id, page_number, section}
    
    -- Quality metrics
    response_time_ms INTEGER,  -- How long Claude took
    claude_model VARCHAR(50),  -- Which model was used
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cost_usd DECIMAL(10, 6),
    
    -- User feedback
    times_served INTEGER DEFAULT 1,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    feedback_notes TEXT,
    
    -- Cache management
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
    last_served TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CHECK (confidence_score BETWEEN 0 AND 1)
);

-- Indexes for troubleshooting_cache
CREATE INDEX idx_cache_model ON troubleshooting_cache(equipment_model);
CREATE INDEX idx_cache_error ON troubleshooting_cache(error_code);
CREATE INDEX idx_cache_hash ON troubleshooting_cache(query_hash);
CREATE INDEX idx_cache_expires ON troubleshooting_cache(expires_at);
CREATE INDEX idx_cache_quality ON troubleshooting_cache(upvotes - downvotes);

-- ============================================================================
-- TABLE: service_history
-- Tracks actual service work performed
-- ============================================================================
CREATE TABLE service_history (
    id SERIAL PRIMARY KEY,
    
    -- Links
    profile_id INTEGER REFERENCES equipment_profiles(id) ON DELETE CASCADE,
    troubleshooting_cache_id INTEGER REFERENCES troubleshooting_cache(id) ON DELETE SET NULL,
    
    -- Service details
    service_date DATE NOT NULL,
    service_type VARCHAR(50),  -- 'repair', 'maintenance', 'diagnostic', 'installation'
    
    -- Problem & resolution
    reported_issue TEXT NOT NULL,
    error_codes VARCHAR(200),  -- Comma-separated if multiple
    diagnosis TEXT,
    resolution TEXT,
    parts_replaced JSONB,  -- Array of {part_number, description, quantity, cost}
    
    -- Time tracking
    time_on_site_minutes INTEGER,
    troubleshooting_time_minutes INTEGER,
    repair_time_minutes INTEGER,
    
    -- Outcome
    issue_resolved BOOLEAN,
    followup_required BOOLEAN DEFAULT FALSE,
    followup_notes TEXT,
    
    -- Technician
    technician_name VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for service_history
CREATE INDEX idx_history_profile ON service_history(profile_id);
CREATE INDEX idx_history_date ON service_history(service_date DESC);
CREATE INDEX idx_history_type ON service_history(service_type);
CREATE INDEX idx_history_resolved ON service_history(issue_resolved);

-- ============================================================================
-- TABLE: users (for authentication)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    
    -- Authentication
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    
    -- Profile
    full_name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'technician',  -- 'admin', 'technician', 'readonly'
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    
    -- Constraints
    CHECK (role IN ('admin', 'technician', 'readonly'))
);

-- Indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- TABLE: api_usage_logs (for tracking costs)
-- ============================================================================
CREATE TABLE api_usage_logs (
    id SERIAL PRIMARY KEY,
    
    -- Request details
    endpoint VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- AI usage
    ai_provider VARCHAR(50),  -- 'claude', 'openai', etc.
    model_used VARCHAR(50),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Cost
    cost_usd DECIMAL(10, 6),
    
    -- Performance
    response_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    -- Status
    status_code INTEGER,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for api_usage_logs
CREATE INDEX idx_usage_date ON api_usage_logs(created_at DESC);
CREATE INDEX idx_usage_user ON api_usage_logs(user_id);
CREATE INDEX idx_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX idx_usage_cache ON api_usage_logs(cache_hit);

-- ============================================================================
-- JSONB DATA FORMATS
-- ============================================================================

-- equipment_manuals.extracted_sections format:
/*
{
  "overview": {
    "text": "This manual covers...",
    "page_range": [1, 5]
  },
  "specifications": {
    "text": "Model specifications...",
    "page_range": [6, 10],
    "data": {
      "voltage": "208-240V",
      "amperage": "30A",
      "dimensions": "26x25.7x19 inches"
    }
  },
  "error_codes": {
    "text": "Error code definitions...",
    "page_range": [45, 52],
    "codes": {
      "F1": "Blower Running Status Bad",
      "F2": "Cook Temperature Low",
      "F3": "Magnetron Current Low"
    }
  },
  "troubleshooting": {
    "text": "Troubleshooting procedures...",
    "page_range": [53, 75],
    "procedures": [
      {
        "issue": "F1 Blower Fault",
        "steps": ["Check voltage", "Inspect motor", "Test controller"],
        "page": 58
      }
    ]
  },
  "wiring_diagrams": {
    "text": "Wiring schematics...",
    "page_range": [76, 85],
    "diagrams": [
      {
        "title": "Main Control System",
        "page": 78
      }
    ]
  },
  "parts_list": {
    "text": "Parts breakdown...",
    "page_range": [86, 120],
    "categories": ["Control System", "Microwave System", "Convection System"]
  }
}
*/

-- troubleshooting_cache.response_data format:
/*
{
  "error_definition": "F1: Blower Running Status Bad - Motor controller indicates no running status",
  "troubleshooting_steps": [
    {
      "step": 1,
      "title": "Enter Test Mode",
      "instruction": "Press BACK + ENTER, code 9-4-2-8",
      "expected_result": "Display shows TEST mode"
    },
    {
      "step": 2,
      "title": "Check Status Indicator",
      "instruction": "Look for Status Indicator 'A' on display",
      "expected_result": "Indicator should be highlighted if fault present"
    },
    {
      "step": 3,
      "title": "Verify Voltage",
      "instruction": "Check 208/240 VAC to motor controller pins 2 and 3",
      "expected_result": "Should read 208-240 VAC",
      "page_reference": 22
    }
  ],
  "parts_to_check": [
    {
      "name": "BMSC (Blower Motor Speed Controller)",
      "description": "Proprietary brushless DC motor controller",
      "common_failure_modes": ["No power", "Control wire fault", "Controller failure"]
    },
    {
      "name": "Blower Motor",
      "location": "Convection Circuit section",
      "manual_reference": "Chapter 7, pages 47-50"
    }
  ],
  "common_causes": [
    "Power interruption - check circuit breaker",
    "Blower motor stalled - check for obstructions",
    "Control wiring fault - check wire OR-9"
  ],
  "citations": [
    {
      "source": "TurboChef NGC Service Manual",
      "page": 22,
      "section": "Control System Troubleshooting"
    },
    {
      "source": "TurboChef Fault Codes PDF",
      "section": "F1: Blower Running Status Bad"
    }
  ]
}
*/

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_equipment_manuals_updated_at BEFORE UPDATE ON equipment_manuals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_profiles_updated_at BEFORE UPDATE ON equipment_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_history_updated_at BEFORE UPDATE ON service_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment times_accessed on equipment_manuals when used
CREATE OR REPLACE FUNCTION increment_manual_access()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE equipment_manuals 
    SET times_accessed = times_accessed + 1,
        last_accessed = NOW()
    WHERE id = NEW.manual_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply when troubleshooting_cache references a manual
CREATE TRIGGER increment_manual_access_trigger AFTER INSERT ON troubleshooting_cache
    FOR EACH ROW EXECUTE FUNCTION increment_manual_access();

-- ============================================================================
-- INITIAL DATA / SEED DATA
-- ============================================================================

-- Create default admin user (password should be changed immediately)
-- Password: 'changeme123' (hashed with bcrypt)
INSERT INTO users (username, email, hashed_password, full_name, role)
VALUES (
    'admin',
    'admin@ccr.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5L8WvL3kYW1mG',
    'Administrator',
    'admin'
);

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- View: Recent troubleshooting queries with cache performance
CREATE VIEW cache_performance AS
SELECT 
    equipment_model,
    error_code,
    COUNT(*) as query_count,
    AVG(response_time_ms) as avg_response_time,
    SUM(CASE WHEN times_served > 1 THEN 1 ELSE 0 END) as cache_hits,
    AVG(confidence_score) as avg_confidence,
    AVG(upvotes - downvotes) as avg_rating
FROM troubleshooting_cache
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY equipment_model, error_code
ORDER BY query_count DESC;

-- View: Equipment with most frequent service
CREATE VIEW equipment_service_frequency AS
SELECT 
    ep.id,
    ep.manufacturer,
    ep.model,
    ep.serial_number,
    ep.customer_name,
    COUNT(sh.id) as service_count,
    MAX(sh.service_date) as last_service,
    AVG(sh.time_on_site_minutes) as avg_time_onsite
FROM equipment_profiles ep
LEFT JOIN service_history sh ON ep.id = sh.profile_id
WHERE ep.active = TRUE
GROUP BY ep.id, ep.manufacturer, ep.model, ep.serial_number, ep.customer_name
ORDER BY service_count DESC;

-- View: Manual library statistics
CREATE VIEW manual_library_stats AS
SELECT 
    manufacturer,
    COUNT(*) as manual_count,
    SUM(CASE WHEN manual_type = 'service' THEN 1 ELSE 0 END) as service_manuals,
    SUM(CASE WHEN manual_type = 'parts' THEN 1 ELSE 0 END) as parts_lists,
    SUM(times_accessed) as total_accesses,
    AVG(times_accessed) as avg_accesses,
    SUM(file_size_mb) as total_storage_mb
FROM equipment_manuals
GROUP BY manufacturer
ORDER BY manual_count DESC;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Clean up expired cache entries (run daily)
-- DELETE FROM troubleshooting_cache WHERE expires_at < NOW();

-- Find manuals needing review
-- SELECT * FROM equipment_manuals WHERE needs_review = TRUE;

-- Identify poorly performing cached responses
-- SELECT * FROM troubleshooting_cache 
-- WHERE (upvotes - downvotes) < -2 
-- ORDER BY times_served DESC;

-- Find equipment profiles without manuals
-- SELECT * FROM equipment_profiles WHERE manual_id IS NULL;

-- API usage cost summary
-- SELECT 
--     DATE(created_at) as date,
--     ai_provider,
--     COUNT(*) as request_count,
--     SUM(total_tokens) as total_tokens,
--     SUM(cost_usd) as total_cost
-- FROM api_usage_logs
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- GROUP BY DATE(created_at), ai_provider
-- ORDER BY date DESC;
