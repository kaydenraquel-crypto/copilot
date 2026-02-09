# Examples & Usage Guide

## Quick Start Examples

### 1. Health Check

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
    "status": "healthy",
    "database": "connected",
    "claude_api": "available",
    "storage": "writable",
    "version": "1.0.0"
}
```

---

### 2. Troubleshoot Equipment (Main Use Case)

**Scenario:** TurboChef oven showing error F1

```bash
curl -X POST http://localhost:8000/api/v1/troubleshoot \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": {
      "manufacturer": "TurboChef",
      "model": "NGCD6"
    },
    "error_code": "F1",
    "symptom": "blower not working"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "equipment_model": "TurboChef NGCD6",
        "query_type": "error_code",
        "error_definition": {
            "code": "F1",
            "name": "Blower Running Status Bad",
            "description": "Motor controller indicates no running status. Cook cycle will terminate.",
            "severity": "critical"
        },
        "troubleshooting_steps": [
            {
                "step": 1,
                "title": "Enter Test Mode",
                "instructions": "Simultaneously press BACK and ENTER keys, enter code 9-4-2-8",
                "expected_result": "Test Mode screen displays with system status"
            },
            {
                "step": 2,
                "title": "Check Status Indicator",
                "instructions": "Look for Status Indicator 'A' on display. If highlighted/backlit, motor controller is disabled.",
                "expected_result": "Indicator shows motor status"
            },
            {
                "step": 3,
                "title": "Verify Voltage to Motor Controller",
                "instructions": "Check 208/240 VAC going to motor controller pins 2 and 3",
                "expected_result": "Voltage present within 10% of rated voltage"
            }
        ],
        "possible_parts": [
            {
                "name": "BMSC (Blower Motor Speed Controller)",
                "description": "Proprietary brushless DC motor controller",
                "check_before_replacing": "Verify control wiring from motor controller to I/O board, specifically low-voltage wire OR-9"
            },
            {
                "name": "Blower Motor",
                "description": "Main convection blower motor",
                "check_before_replacing": "Check motor windings with multimeter (resistance table on page 50)"
            }
        ],
        "sources": [
            {
                "title": "TurboChef NGC Service Manual",
                "type": "service_manual",
                "page": "22",
                "url": "https://www.partstown.com/modelManual/TBC-NGC_spm.pdf",
                "manual_id": 1
            }
        ],
        "metadata": {
            "confidence_score": 0.95,
            "cached": false,
            "processing_time_ms": 3500,
            "tokens_used": 2340,
            "manual_used": true
        }
    }
}
```

---

### 3. Upload Manual

```bash
curl -X POST http://localhost:8000/api/v1/manuals/upload \
  -F "file=@turbochef_ngcd6_service.pdf" \
  -F "manufacturer=TurboChef" \
  -F "model=NGCD6" \
  -F "manual_type=service" \
  -F "source=partstown"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "manual_id": 1,
        "file_path": "manuals/turbochef/NGCD6_service.pdf",
        "file_size_mb": 12.5,
        "page_count": 94,
        "processing_status": "queued",
        "message": "Manual uploaded successfully. OCR processing will complete in background."
    }
}
```

---

### 4. Search for Manual Online

**Scenario:** You don't have the manual, let AI find it

```bash
curl -X POST http://localhost:8000/api/v1/manuals/search \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "True",
    "model": "T-49",
    "manual_type": "service"
  }'
```

**Response (if found):**
```json
{
    "success": true,
    "data": {
        "found": true,
        "source": "partstown",
        "url": "https://www.partstown.com/modelManual/TRUE-T49_spm.pdf",
        "auto_download": true,
        "manual_id": 2,
        "message": "Manual found and downloaded from PartsTown"
    }
}
```

**Response (if not found):**
```json
{
    "success": true,
    "data": {
        "found": false,
        "searched_sources": ["partstown", "manualslib", "manufacturer_site"],
        "suggestions": [
            "Contact True Manufacturing at 1-800-325-6152",
            "Check manufacturer partner portal at true-mfg.com",
            "Upload manually if you have a copy"
        ]
    }
}
```

---

### 5. Create Equipment Profile

```bash
curl -X POST http://localhost:8000/api/v1/equipment \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "TurboChef",
    "model": "NGCD6",
    "serial_number": "NGC12345",
    "customer_name": "Main Street Pizzeria",
    "location": "Kitchen - Pizza Station",
    "installation_date": "2023-06-15"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "serial_number": "NGC12345",
        "has_manual": true,
        "manual_search_initiated": false,
        "message": "Equipment profile created. Service manual already in library."
    }
}
```

---

### 6. Get Equipment Details

```bash
curl http://localhost:8000/api/v1/equipment/1
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "serial_number": "NGC12345",
        "customer_name": "Main Street Pizzeria",
        "location": "Kitchen - Pizza Station",
        "installation_date": "2023-06-15",
        "manual": {
            "id": 1,
            "manual_type": "service",
            "page_count": 94,
            "source": "partstown",
            "last_accessed": "2025-02-08T10:30:00Z"
        },
        "service_history": {
            "total_services": 5,
            "last_service": "2025-01-15",
            "common_issues": {
                "F1": 2,
                "F2": 1
            }
        },
        "notes": "Customer reports issue happens after extended idle periods"
    }
}
```

---

### 7. List All Manuals

```bash
curl "http://localhost:8000/api/v1/manuals?manufacturer=TurboChef&limit=10"
```

**Response:**
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
                "page_count": 94,
                "file_size_mb": 12.5,
                "source": "partstown",
                "ocr_quality": "excellent",
                "access_count": 15,
                "created_at": "2025-01-20T10:00:00Z",
                "last_accessed": "2025-02-08T09:30:00Z"
            }
        ],
        "total": 1,
        "page": 1,
        "pages": 1
    }
}
```

---

### 8. Download Manual

```bash
curl -O http://localhost:8000/api/v1/manuals/1/download
# Downloads: NGCD6_service.pdf
```

---

### 9. Search Equipment

```bash
curl "http://localhost:8000/api/v1/equipment/search?q=turbochef&limit=5"
```

**Response:**
```json
{
    "success": true,
    "data": {
        "results": [
            {
                "id": 1,
                "manufacturer": "TurboChef",
                "model": "NGCD6",
                "serial_number": "NGC12345",
                "customer_name": "Main Street Pizzeria",
                "has_manual": true,
                "manual_types": ["service", "parts"],
                "service_count": 5,
                "last_service": "2025-01-15"
            }
        ],
        "total": 1
    }
}
```

---

### 10. Get Cache Statistics

```bash
curl http://localhost:8000/api/v1/cache/stats
```

**Response:**
```json
{
    "success": true,
    "data": {
        "total_cached_queries": 45,
        "active_entries": 42,
        "expired_entries": 3,
        "total_serves": 230,
        "cache_hit_rate": 0.78,
        "avg_confidence_score": 0.89,
        "top_equipment": [
            {
                "model": "TurboChef NGCD6",
                "cached_queries": 12,
                "total_serves": 67
            },
            {
                "model": "True T-49",
                "cached_queries": 8,
                "total_serves": 43
            }
        ],
        "cost_savings": {
            "estimated_api_calls_avoided": 188,
            "estimated_cost_saved_usd": 5.64
        }
    }
}
```

---

### 11. Provide Feedback on Response

```bash
curl -X POST http://localhost:8000/api/v1/cache/1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "vote": "up",
    "notes": "Response was accurate and helped me fix the issue quickly"
  }'
```

**Response:**
```json
{
    "success": true,
    "data": {
        "cache_id": 1,
        "upvotes": 5,
        "downvotes": 0,
        "message": "Feedback recorded. Thank you!"
    }
}
```

---

## Python Client Example

```python
import requests

class TechCopilotClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def troubleshoot(self, manufacturer, model, error_code=None, symptom=None):
        """Get troubleshooting steps"""
        response = requests.post(
            f"{self.base_url}/api/v1/troubleshoot",
            json={
                "equipment": {
                    "manufacturer": manufacturer,
                    "model": model
                },
                "error_code": error_code,
                "symptom": symptom
            }
        )
        return response.json()
    
    def upload_manual(self, file_path, manufacturer, model, manual_type="service"):
        """Upload a manual PDF"""
        with open(file_path, 'rb') as f:
            response = requests.post(
                f"{self.base_url}/api/v1/manuals/upload",
                files={"file": f},
                data={
                    "manufacturer": manufacturer,
                    "model": model,
                    "manual_type": manual_type
                }
            )
        return response.json()
    
    def create_equipment(self, manufacturer, model, serial_number=None, **kwargs):
        """Create equipment profile"""
        data = {
            "manufacturer": manufacturer,
            "model": model,
            "serial_number": serial_number,
            **kwargs
        }
        response = requests.post(
            f"{self.base_url}/api/v1/equipment",
            json=data
        )
        return response.json()

# Usage
client = TechCopilotClient()

# Troubleshoot
result = client.troubleshoot("TurboChef", "NGCD6", error_code="F1")
print(f"Found {len(result['data']['troubleshooting_steps'])} steps")

# Upload manual
result = client.upload_manual("manual.pdf", "TurboChef", "NGCD6")
print(f"Manual uploaded: ID {result['data']['manual_id']}")

# Create equipment
result = client.create_equipment(
    "TurboChef", 
    "NGCD6",
    serial_number="NGC12345",
    customer_name="Test Customer"
)
print(f"Equipment created: ID {result['data']['id']}")
```

---

## Real-World Workflow Examples

### Workflow 1: New Service Call

```bash
# 1. Create equipment profile
curl -X POST http://localhost:8000/api/v1/equipment \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "TurboChef",
    "model": "NGCD6",
    "serial_number": "NGC54321",
    "customer_name": "Downtown Deli",
    "location": "Main Kitchen"
  }'

# 2. Troubleshoot the issue
curl -X POST http://localhost:8000/api/v1/troubleshoot \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": {
      "manufacturer": "TurboChef",
      "model": "NGCD6"
    },
    "error_code": "F1"
  }'

# 3. Follow troubleshooting steps from response
# 4. Fix the issue
# 5. Update equipment notes
curl -X PATCH http://localhost:8000/api/v1/equipment/1 \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Fixed F1 error - replaced blower motor controller"
  }'
```

### Workflow 2: Building Your Manual Library

```bash
# 1. Search for manual online
curl -X POST http://localhost:8000/api/v1/manuals/search \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "Manitowoc",
    "model": "IDT0500A",
    "manual_type": "service"
  }'

# If found, it auto-downloads and adds to library
# If not found, upload manually:

# 2. Upload manual you have
curl -X POST http://localhost:8000/api/v1/manuals/upload \
  -F "file=@manitowoc_idt0500a.pdf" \
  -F "manufacturer=Manitowoc" \
  -F "model=IDT0500A" \
  -F "manual_type=service"

# 3. Verify it's in your library
curl http://localhost:8000/api/v1/manuals?manufacturer=Manitowoc
```

### Workflow 3: Recurring Customer Equipment

```bash
# 1. Get existing equipment
curl http://localhost:8000/api/v1/equipment/search?q=downtown+deli

# 2. Review service history
curl http://localhost:8000/api/v1/equipment/5

# 3. Troubleshoot new issue
curl -X POST http://localhost:8000/api/v1/troubleshoot \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": {
      "manufacturer": "True",
      "model": "T-49"
    },
    "symptom": "not cooling properly"
  }'

# 4. Update service count and notes
curl -X PATCH http://localhost:8000/api/v1/equipment/5 \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Cleaned condenser coils, replaced door gasket",
    "service_count": 6
  }'
```

---

## Error Handling Examples

### 400 Bad Request
```json
{
    "success": false,
    "error": {
        "code": "INVALID_REQUEST",
        "message": "Missing required field: equipment.manufacturer",
        "details": {
            "field": "equipment.manufacturer",
            "type": "required"
        }
    }
}
```

### 404 Not Found
```json
{
    "success": false,
    "error": {
        "code": "EQUIPMENT_NOT_FOUND",
        "message": "Equipment with ID 999 not found",
        "details": {
            "equipment_id": 999
        }
    }
}
```

### 500 Internal Server Error
```json
{
    "success": false,
    "error": {
        "code": "CLAUDE_API_ERROR",
        "message": "Claude API request failed",
        "details": {
            "error_type": "APIConnectionError",
            "retry_after": 60
        }
    }
}
```

---

## Postman Collection

Import this JSON into Postman:

```json
{
    "info": {
        "name": "Tech Copilot API",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "variable": [
        {
            "key": "base_url",
            "value": "http://localhost:8000"
        }
    ],
    "item": [
        {
            "name": "Health Check",
            "request": {
                "method": "GET",
                "url": "{{base_url}}/health"
            }
        },
        {
            "name": "Troubleshoot Equipment",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/troubleshoot",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"equipment\": {\n    \"manufacturer\": \"TurboChef\",\n    \"model\": \"NGCD6\"\n  },\n  \"error_code\": \"F1\"\n}"
                }
            }
        },
        {
            "name": "Upload Manual",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/manuals/upload",
                "body": {
                    "mode": "formdata",
                    "formdata": [
                        {
                            "key": "file",
                            "type": "file",
                            "src": "path/to/manual.pdf"
                        },
                        {
                            "key": "manufacturer",
                            "value": "TurboChef"
                        },
                        {
                            "key": "model",
                            "value": "NGCD6"
                        },
                        {
                            "key": "manual_type",
                            "value": "service"
                        }
                    ]
                }
            }
        },
        {
            "name": "Create Equipment",
            "request": {
                "method": "POST",
                "url": "{{base_url}}/api/v1/equipment",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n  \"manufacturer\": \"TurboChef\",\n  \"model\": \"NGCD6\",\n  \"serial_number\": \"NGC12345\",\n  \"customer_name\": \"Test Customer\"\n}"
                }
            }
        }
    ]
}
```

---

## Performance Benchmarks

**Typical Response Times:**
- Health check: <50ms
- Cached troubleshooting query: <200ms
- New troubleshooting query: 2-10s (depends on Claude API)
- Manual upload: 1-5s (depends on file size)
- Equipment CRUD operations: <100ms
- Cache stats: <50ms

**Cache Hit Rates (after 1 month):**
- Common equipment (TurboChef, True): 80-90%
- Rare equipment: 20-30%
- Overall: 60-70%

**Cost Estimates:**
- 100 troubleshooting queries/month: $2-5
- 500 queries/month: $10-15
- With 70% cache hit rate: $3-5/month for 500 queries
