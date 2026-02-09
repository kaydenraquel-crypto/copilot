# API Specification

## Base URL
- Development: `http://localhost:8000`
- Production: `https://api.ccr-tech-copilot.com`

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require JWT authentication.

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Token Format
JWT tokens expire after 7 days (configurable). Token payload:
```json
{
  "sub": "username",
  "user_id": 123,
  "role": "technician",
  "exp": 1234567890
}
```

## Response Format
All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Endpoints

### 1. Authentication

#### POST /auth/register
Register a new user account.

**Request**:
```json
{
  "username": "kris_ccr",
  "email": "kris@coloradocommercialrepairs.com",
  "password": "SecurePassword123!",
  "full_name": "Kris Colorado"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "kris_ccr",
    "email": "kris@coloradocommercialrepairs.com",
    "full_name": "Kris Colorado",
    "role": "technician"
  },
  "message": "User registered successfully"
}
```

**Validation**:
- Username: 3-100 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Min 8 characters, must contain uppercase, lowercase, number
- Full name: Optional, max 200 characters

---

#### POST /auth/login
Authenticate and receive JWT token.

**Request**:
```json
{
  "username": "kris_ccr",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": {
      "user_id": 1,
      "username": "kris_ccr",
      "role": "technician"
    }
  }
}
```

---

### 2. Equipment Manuals

#### GET /manuals
List all manuals in library.

**Query Parameters**:
- `manufacturer` (optional): Filter by manufacturer
- `model` (optional): Filter by model
- `manual_type` (optional): Filter by type (service, parts, etc.)
- `limit` (optional): Results per page (default 50, max 100)
- `offset` (optional): Pagination offset (default 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "manuals": [
      {
        "id": 1,
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "manual_type": "service",
        "pdf_version": "Rev E",
        "page_count": 94,
        "file_size_mb": 12.5,
        "ocr_quality": "excellent",
        "source": "partstown",
        "times_accessed": 15,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### GET /manuals/{manual_id}
Get details of a specific manual.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "manufacturer": "TurboChef",
    "model": "NGCD6",
    "serial_range": "All",
    "manual_type": "service",
    "file_path": "/storage/manuals/turbochef_ngcd6_service.pdf",
    "file_size_mb": 12.5,
    "page_count": 94,
    "extracted_sections": {
      "error_codes": {
        "text": "Error code definitions...",
        "page_range": [11, 12],
        "codes": {
          "F1": "Blower Running Status Bad",
          "F2": "Cook Temperature Low"
        }
      },
      "troubleshooting": {
        "page_range": [21, 35]
      }
    },
    "source": "partstown",
    "source_url": "https://www.partstown.com/modelManual/TBC-NGC_spm.pdf",
    "pdf_version": "Rev E",
    "ocr_quality": "excellent",
    "times_accessed": 15,
    "last_accessed": "2024-02-08T14:30:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

#### POST /manuals/upload
Upload a new manual PDF.

**Request** (multipart/form-data):
```
manufacturer: TurboChef
model: NGCD6
manual_type: service
pdf_version: Rev E (optional)
serial_range: All (optional)
file: [PDF file]
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "manual_id": 1,
    "status": "processing",
    "message": "Manual uploaded successfully. Processing in background."
  }
}
```

**Validation**:
- File type: Must be PDF
- File size: Max 100MB
- Manufacturer: Required, max 100 chars
- Model: Required, max 100 chars
- Manual type: Must be one of: service, parts, installation, user, wiring

---

#### POST /manuals/search
Search for manual on the web and auto-download.

**Request**:
```json
{
  "manufacturer": "TurboChef",
  "model": "NGCD6",
  "manual_type": "service"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "found": true,
    "source": "partstown",
    "source_url": "https://www.partstown.com/modelManual/TBC-NGC_spm.pdf",
    "manual_id": 1,
    "message": "Manual found and processed successfully"
  }
}
```

**Response** (200 OK - Not Found):
```json
{
  "success": true,
  "data": {
    "found": false,
    "message": "No public manual found for TurboChef NGCD6",
    "suggestions": [
      "Upload manual manually if you have it",
      "Contact manufacturer: 800-90-TURBO"
    ]
  }
}
```

---

### 3. Troubleshooting

#### POST /troubleshoot
Get troubleshooting assistance for equipment issue.

**Request**:
```json
{
  "manufacturer": "TurboChef",
  "model": "NGCD6",
  "error_code": "F1",
  "symptom": "blower not working",
  "additional_context": "Unit was working yesterday, now shows error on startup"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "cache_hit": false,
    "response_time_ms": 3450,
    "troubleshooting": {
      "error_definition": "F1: Blower Running Status Bad - Motor controller indicates no running status",
      "severity": "critical",
      "troubleshooting_steps": [
        {
          "step": 1,
          "title": "Enter Test Mode",
          "instruction": "Simultaneously press BACK and ENTER keys, enter code 9-4-2-8, press ENTER",
          "expected_result": "Display shows TEST mode",
          "safety_warning": null
        },
        {
          "step": 2,
          "title": "Check Status Indicator",
          "instruction": "Look for Status Indicator 'A' on display. If highlighted/backlit, motor controller indicates fault.",
          "expected_result": "Indicator 'A' should be lit",
          "safety_warning": null
        },
        {
          "step": 3,
          "title": "Verify Voltage to Motor Controller",
          "instruction": "Use multimeter to check 208/240 VAC to motor controller pins 2 and 3",
          "expected_result": "Should read 208-240 VAC",
          "safety_warning": "DANGER: High voltage present. Ensure proper safety procedures."
        },
        {
          "step": 4,
          "title": "Check Control Wiring",
          "instruction": "Inspect control wiring from motor controller to I/O board, specifically low-voltage wire OR-9",
          "expected_result": "Wire should be intact and properly connected",
          "safety_warning": "Unplug oven before inspecting wiring"
        }
      ],
      "parts_to_check": [
        {
          "name": "BMSC (Blower Motor Speed Controller)",
          "part_number": null,
          "description": "Proprietary brushless DC motor controller",
          "location": "See service manual page 14",
          "common_failure_modes": ["No power", "Control wire fault", "Controller failure"],
          "test_procedure": "See manual page 50"
        },
        {
          "name": "Blower Motor",
          "part_number": null,
          "description": "Main convection blower motor",
          "location": "Convection Circuit, Chapter 7",
          "common_failure_modes": ["Stalled due to obstruction", "Bearing failure", "Winding failure"]
        }
      ],
      "common_causes": [
        "Power interruption - Check wall circuit breaker",
        "Blower motor stalled - Check for obstructions",
        "Control wiring fault - Inspect wire OR-9",
        "Motor controller failure"
      ],
      "estimated_repair_time_minutes": 45,
      "difficulty": "intermediate",
      "citations": [
        {
          "source": "TurboChef NGC Service Manual",
          "manual_id": 1,
          "page": 22,
          "section": "Control System Troubleshooting",
          "url": "https://www.partstown.com/modelManual/TBC-NGC_spm.pdf"
        },
        {
          "source": "TurboChef Fault Codes PDF",
          "manual_id": null,
          "section": "F1: Blower Running Status Bad",
          "url": "https://www.glennscommercial.com/employees/turbochef/turbochef-fault-codes.pdf"
        }
      ]
    },
    "manual_available": true,
    "manual_id": 1
  }
}
```

**Response** (200 OK - Cached):
```json
{
  "success": true,
  "data": {
    "cache_hit": true,
    "response_time_ms": 145,
    "cached_at": "2024-02-05T10:30:00Z",
    "troubleshooting": { ... }
  }
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "MANUAL_NOT_FOUND",
    "message": "No service manual found for TurboChef NGCD6",
    "details": {
      "manufacturer": "TurboChef",
      "model": "NGCD6",
      "suggestions": [
        "Upload manual if you have it",
        "Search for manual automatically",
        "Contact manufacturer for assistance"
      ]
    }
  }
}
```

---

### 4. Equipment Profiles

#### GET /equipment
List all equipment profiles.

**Query Parameters**:
- `manufacturer` (optional): Filter by manufacturer
- `model` (optional): Filter by model
- `customer_name` (optional): Filter by customer
- `active` (optional): Filter by active status (true/false)
- `limit` (optional): Results per page (default 50)
- `offset` (optional): Pagination offset (default 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "equipment": [
      {
        "id": 1,
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "serial_number": "NGC-123456",
        "customer_name": "Pizza Place Downtown",
        "customer_location": "123 Main St, Grand Junction, CO",
        "manual_id": 1,
        "manual_available": true,
        "last_service_date": "2024-01-20",
        "next_service_due": "2024-04-20",
        "active": true,
        "common_issues": ["F1 error recurring", "Temperature sensor drift"],
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### POST /equipment
Create new equipment profile.

**Request**:
```json
{
  "manufacturer": "TurboChef",
  "model": "NGCD6",
  "serial_number": "NGC-123456",
  "customer_name": "Pizza Place Downtown",
  "customer_location": "123 Main St, Grand Junction, CO",
  "installation_date": "2024-01-15",
  "warranty_expiration": "2027-01-15",
  "equipment_notes": "High volume location, used 12+ hours daily"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "equipment_id": 1,
    "manual_id": 1,
    "manual_available": true,
    "message": "Equipment profile created successfully"
  }
}
```

---

#### GET /equipment/{equipment_id}
Get equipment profile details including service history.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "manufacturer": "TurboChef",
    "model": "NGCD6",
    "serial_number": "NGC-123456",
    "customer_name": "Pizza Place Downtown",
    "customer_location": "123 Main St, Grand Junction, CO",
    "installation_date": "2024-01-15",
    "warranty_expiration": "2027-01-15",
    "manual_id": 1,
    "manual_available": true,
    "equipment_notes": "High volume location, used 12+ hours daily",
    "common_issues": ["F1 error recurring", "Temperature sensor drift"],
    "active": true,
    "last_service_date": "2024-01-20",
    "next_service_due": "2024-04-20",
    "service_history": [
      {
        "id": 1,
        "service_date": "2024-01-20",
        "service_type": "repair",
        "reported_issue": "F1 blower error",
        "error_codes": "F1",
        "resolution": "Replaced blower motor controller, cleared obstruction from blower",
        "issue_resolved": true,
        "time_on_site_minutes": 90,
        "technician_name": "Kris Colorado"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. Service History

#### POST /service-history
Log a service call.

**Request**:
```json
{
  "equipment_id": 1,
  "service_date": "2024-02-08",
  "service_type": "repair",
  "reported_issue": "F1 blower error on startup",
  "error_codes": "F1",
  "diagnosis": "Blower motor controller failure, confirmed with voltage test",
  "resolution": "Replaced BMSC (part #NGC-3030-1), tested functionality",
  "parts_replaced": [
    {
      "part_number": "NGC-3030-1",
      "description": "Mag Fan Relay",
      "quantity": 1,
      "cost": 125.50
    }
  ],
  "time_on_site_minutes": 90,
  "troubleshooting_time_minutes": 30,
  "repair_time_minutes": 45,
  "issue_resolved": true,
  "followup_required": false,
  "technician_name": "Kris Colorado"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "service_id": 1,
    "message": "Service logged successfully"
  }
}
```

---

### 6. Cache Management

#### GET /cache/stats
Get cache performance statistics.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_cached_responses": 150,
    "cache_hit_rate": 0.65,
    "avg_response_time_cached_ms": 145,
    "avg_response_time_uncached_ms": 3200,
    "total_cost_saved_usd": 4.50,
    "top_cached_equipment": [
      {
        "model": "TurboChef NGCD6",
        "query_count": 25,
        "cache_hits": 20
      }
    ],
    "recent_cache_additions": [
      {
        "equipment_model": "True T-49",
        "error_code": "E7",
        "cached_at": "2024-02-08T10:30:00Z"
      }
    ]
  }
}
```

---

#### DELETE /cache/clear
Clear expired cache entries (admin only).

**Query Parameters**:
- `all` (optional): Clear all cache if true (default false)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "entries_deleted": 25,
    "message": "Cache cleared successfully"
  }
}
```

---

### 7. System Health

#### GET /health
Health check endpoint (no auth required).

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2024-02-08T14:30:00Z",
  "version": "0.1.0",
  "database": "connected",
  "claude_api": "available"
}
```

---

#### GET /stats
System usage statistics (admin only).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_manuals": 75,
    "total_equipment_profiles": 120,
    "total_service_logs": 450,
    "api_usage_30_days": {
      "total_requests": 1500,
      "total_cost_usd": 45.75,
      "avg_response_time_ms": 2100
    },
    "most_accessed_manuals": [
      {
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "access_count": 150
      }
    ]
  }
}
```

---

## Rate Limiting

### Limits
- Anonymous requests: 10/minute
- Authenticated requests: 60/minute
- Troubleshooting endpoint: 30/minute per user

### Rate Limit Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

### Rate Limit Error (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 30 seconds.",
    "details": {
      "limit": 60,
      "reset_at": "2024-02-08T14:31:00Z"
    }
  }
}
```

---

## Webhooks (Future)

### POST /webhooks/manual-processed
Triggered when manual processing completes.

**Payload**:
```json
{
  "event": "manual.processed",
  "timestamp": "2024-02-08T14:30:00Z",
  "data": {
    "manual_id": 1,
    "status": "completed",
    "ocr_quality": "excellent"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Missing authentication token |
| `INVALID_TOKEN` | Token is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `MANUAL_NOT_FOUND` | Equipment manual not in library |
| `EQUIPMENT_NOT_FOUND` | Equipment profile not found |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `FILE_TOO_LARGE` | Uploaded file exceeds size limit |
| `INVALID_FILE_TYPE` | File type not supported |
| `PROCESSING_ERROR` | Error processing request |
| `CLAUDE_API_ERROR` | Claude API request failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `SERVER_ERROR` | Internal server error |

---

## API Versioning
Current version: `v1`

Future versions will be prefixed: `/v2/troubleshoot`

---

## CORS Configuration
Allowed origins (configurable):
- Development: `http://localhost:*`
- Production: `https://ccr-tech-copilot.com`
- Mobile app: All origins (authentication required)

---

## OpenAPI Documentation
Interactive API documentation available at:
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`
