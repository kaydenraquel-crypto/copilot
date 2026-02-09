# Testing Guide

## Testing Strategy

**Test Pyramid:**
- **Unit Tests (70%)**: Individual functions, classes
- **Integration Tests (20%)**: API endpoints, database operations
- **E2E Tests (10%)**: Full workflows

---

## Test Environment Setup

### Install Test Dependencies
```bash
pip install pytest pytest-asyncio pytest-cov httpx
```

### Test Database Setup
```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db

# Test database URL
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="function")
def db_session():
    """Create test database session"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with test database"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()

@pytest.fixture
def sample_equipment_data():
    """Sample equipment data for tests"""
    return {
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "serial_number": "TEST123",
        "customer_name": "Test Customer",
        "location": "Test Kitchen"
    }

@pytest.fixture
def sample_manual_data():
    """Sample manual data for tests"""
    return {
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "manual_type": "service",
        "file_path": "manuals/test/test.pdf",
        "source": "test",
        "page_count": 10,
        "file_size_mb": 1.5
    }
```

---

## Unit Tests

### Test Models

```python
# tests/test_models/test_equipment.py
import pytest
from app.models.equipment import EquipmentProfile

def test_create_equipment_profile(db_session, sample_equipment_data):
    """Test creating equipment profile"""
    equipment = EquipmentProfile(**sample_equipment_data)
    db_session.add(equipment)
    db_session.commit()
    
    assert equipment.id is not None
    assert equipment.manufacturer == "TurboChef"
    assert equipment.model == "NGCD6"
    assert equipment.is_deleted == False

def test_equipment_soft_delete(db_session, sample_equipment_data):
    """Test soft delete functionality"""
    equipment = EquipmentProfile(**sample_equipment_data)
    db_session.add(equipment)
    db_session.commit()
    
    # Soft delete
    equipment.is_deleted = True
    db_session.commit()
    
    assert equipment.is_deleted == True
    assert equipment.deleted_at is not None
```

### Test CRUD Operations

```python
# tests/test_crud/test_equipment.py
import pytest
from app.crud.equipment import CRUDEquipment

def test_crud_create_equipment(db_session, sample_equipment_data):
    """Test CRUD create operation"""
    crud = CRUDEquipment()
    equipment = crud.create(db_session, sample_equipment_data)
    
    assert equipment.id is not None
    assert equipment.manufacturer == sample_equipment_data["manufacturer"]

def test_crud_get_equipment(db_session, sample_equipment_data):
    """Test CRUD get operation"""
    crud = CRUDEquipment()
    
    # Create
    created = crud.create(db_session, sample_equipment_data)
    
    # Get
    retrieved = crud.get(db_session, created.id)
    
    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.model == created.model

def test_crud_get_nonexistent(db_session):
    """Test getting non-existent equipment"""
    crud = CRUDEquipment()
    equipment = crud.get(db_session, 99999)
    
    assert equipment is None

def test_crud_update_equipment(db_session, sample_equipment_data):
    """Test CRUD update operation"""
    crud = CRUDEquipment()
    
    # Create
    equipment = crud.create(db_session, sample_equipment_data)
    
    # Update
    updated = crud.update(db_session, equipment.id, {"location": "Updated Location"})
    
    assert updated.location == "Updated Location"
    assert updated.manufacturer == sample_equipment_data["manufacturer"]

def test_crud_list_equipment(db_session, sample_equipment_data):
    """Test CRUD list operation"""
    crud = CRUDEquipment()
    
    # Create multiple
    crud.create(db_session, sample_equipment_data)
    crud.create(db_session, {**sample_equipment_data, "serial_number": "TEST456"})
    
    # List
    equipment_list = crud.get_multi(db_session, limit=10)
    
    assert len(equipment_list) == 2
```

### Test Services

```python
# tests/test_services/test_claude_service.py
import pytest
from unittest.mock import Mock, patch
from app.services.claude_service import ClaudeService

@pytest.mark.asyncio
async def test_claude_search_manual():
    """Test manual search with mocked Claude API"""
    with patch('app.services.claude_service.Anthropic') as mock_anthropic:
        # Mock response
        mock_response = Mock()
        mock_response.content = [
            Mock(type="text", text='{"found": true, "url": "https://example.com/manual.pdf"}')
        ]
        mock_anthropic.return_value.messages.create.return_value = mock_response
        
        # Test
        service = ClaudeService()
        result = await service.search_manual("TurboChef", "NGCD6")
        
        assert result['found'] == True
        assert 'url' in result

@pytest.mark.asyncio
async def test_claude_troubleshoot():
    """Test troubleshooting with mocked Claude API"""
    with patch('app.services.claude_service.Anthropic') as mock_anthropic:
        # Mock response
        mock_response = Mock()
        mock_response.content = [
            Mock(type="text", text='{"error_definition": {"code": "F1"}, "troubleshooting_steps": []}')
        ]
        mock_anthropic.return_value.messages.create.return_value = mock_response
        
        # Test
        service = ClaudeService()
        result = await service.troubleshoot("TurboChef NGCD6", "F1")
        
        assert result['error_definition']['code'] == "F1"

# tests/test_services/test_cache_service.py
from app.services.cache_service import CacheService

def test_cache_miss(db_session):
    """Test cache miss returns None"""
    service = CacheService(db_session)
    result = service.get_cached_response("TurboChef NGCD6", "F1")
    
    assert result is None

def test_cache_hit(db_session):
    """Test cache hit returns cached data"""
    service = CacheService(db_session)
    
    # Cache response
    test_response = {
        "error_definition": {"code": "F1"},
        "troubleshooting_steps": []
    }
    service.cache_response("TurboChef NGCD6", test_response, "F1")
    
    # Retrieve from cache
    cached = service.get_cached_response("TurboChef NGCD6", "F1")
    
    assert cached is not None
    assert cached['error_definition']['code'] == "F1"
```

### Test Utilities

```python
# tests/test_utils/test_pdf_utils.py
import pytest
from app.utils.pdf_utils import get_page_count, extract_text_from_pdf

def test_get_page_count():
    """Test PDF page counting"""
    # Requires a test PDF file
    page_count = get_page_count("tests/fixtures/test_manual.pdf")
    assert page_count > 0
    assert isinstance(page_count, int)

def test_extract_text_from_pdf():
    """Test text extraction"""
    text, quality = extract_text_from_pdf("tests/fixtures/test_manual.pdf")
    assert isinstance(text, str)
    assert quality in ['excellent', 'good', 'fair', 'poor', 'failed']

# tests/test_utils/test_file_utils.py
from app.utils.file_utils import save_uploaded_file, get_file_size_mb
import tempfile
import shutil

def test_save_uploaded_file():
    """Test file saving"""
    # Create mock uploaded file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(b"Test PDF content")
        temp_file.flush()
        
        # Mock file object
        class MockFile:
            def __init__(self, path):
                self.file = open(path, 'rb')
        
        mock_file = MockFile(temp_file.name)
        
        # Save
        saved_path = save_uploaded_file(mock_file, "Test", "Model", "test.pdf")
        
        assert "test" in saved_path.lower()
        assert saved_path.endswith(".pdf")
        
        # Cleanup
        mock_file.file.close()

def test_get_file_size_mb(tmp_path):
    """Test file size calculation"""
    # Create test file
    test_file = tmp_path / "test.txt"
    test_file.write_bytes(b"0" * (1024 * 1024 * 2))  # 2MB
    
    size = get_file_size_mb(str(test_file))
    assert size == pytest.approx(2.0, rel=0.1)
```

---

## Integration Tests

### Test API Endpoints

```python
# tests/test_api/test_health.py
def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# tests/test_api/test_equipment.py
def test_create_equipment(client, sample_equipment_data):
    """Test equipment creation endpoint"""
    response = client.post("/api/v1/equipment", json=sample_equipment_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["data"]["manufacturer"] == "TurboChef"

def test_get_equipment(client, sample_equipment_data):
    """Test get equipment endpoint"""
    # Create
    create_response = client.post("/api/v1/equipment", json=sample_equipment_data)
    equipment_id = create_response.json()["data"]["id"]
    
    # Get
    response = client.get(f"/api/v1/equipment/{equipment_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["id"] == equipment_id

def test_list_equipment(client, sample_equipment_data):
    """Test list equipment endpoint"""
    # Create some equipment
    client.post("/api/v1/equipment", json=sample_equipment_data)
    client.post("/api/v1/equipment", json={**sample_equipment_data, "serial_number": "TEST456"})
    
    # List
    response = client.get("/api/v1/equipment/search?q=turbochef")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["results"]) >= 2

# tests/test_api/test_troubleshooting.py
@pytest.mark.asyncio
async def test_troubleshoot_endpoint(client):
    """Test troubleshooting endpoint"""
    with patch('app.services.claude_service.ClaudeService.troubleshoot') as mock_troubleshoot:
        # Mock response
        mock_troubleshoot.return_value = {
            "equipment_model": "TurboChef NGCD6",
            "error_definition": {"code": "F1"},
            "troubleshooting_steps": [],
            "possible_parts": [],
            "sources": [],
            "metadata": {"cached": False}
        }
        
        # Test
        response = client.post("/api/v1/troubleshoot", json={
            "equipment": {
                "manufacturer": "TurboChef",
                "model": "NGCD6"
            },
            "error_code": "F1"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["error_definition"]["code"] == "F1"

# tests/test_api/test_manuals.py
def test_upload_manual(client):
    """Test manual upload endpoint"""
    # Create test PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(b"Test PDF content")
        temp_file.flush()
        
        # Upload
        with open(temp_file.name, 'rb') as f:
            response = client.post(
                "/api/v1/manuals/upload",
                files={"file": ("test.pdf", f, "application/pdf")},
                data={
                    "manufacturer": "TestCo",
                    "model": "TEST01",
                    "manual_type": "service"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "manual_id" in data["data"]
```

---

## E2E Tests

### Full Workflow Tests

```python
# tests/test_e2e/test_full_workflow.py
def test_complete_troubleshooting_workflow(client, db_session):
    """Test complete workflow from equipment creation to troubleshooting"""
    
    # Step 1: Create equipment profile
    equipment_data = {
        "manufacturer": "TurboChef",
        "model": "NGCD6",
        "serial_number": "TEST123"
    }
    response = client.post("/api/v1/equipment", json=equipment_data)
    assert response.status_code == 200
    equipment_id = response.json()["data"]["id"]
    
    # Step 2: Upload manual
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(b"Test service manual content")
        temp_file.flush()
        
        with open(temp_file.name, 'rb') as f:
            response = client.post(
                "/api/v1/manuals/upload",
                files={"file": ("ngcd6_service.pdf", f, "application/pdf")},
                data={
                    "manufacturer": "TurboChef",
                    "model": "NGCD6",
                    "manual_type": "service"
                }
            )
        assert response.status_code == 200
    
    # Step 3: Troubleshoot (will use uploaded manual)
    with patch('app.services.claude_service.ClaudeService.troubleshoot') as mock:
        mock.return_value = {
            "equipment_model": "TurboChef NGCD6",
            "troubleshooting_steps": [{"step": 1, "title": "Test"}],
            "metadata": {"cached": False}
        }
        
        response = client.post("/api/v1/troubleshoot", json={
            "equipment": {"manufacturer": "TurboChef", "model": "NGCD6"},
            "error_code": "F1"
        })
        assert response.status_code == 200
    
    # Step 4: Verify cache
    response = client.get("/api/v1/cache/stats")
    assert response.status_code == 200
    stats = response.json()["data"]
    assert stats["total_cached_queries"] >= 1
```

---

## Performance Tests

```python
# tests/test_performance/test_cache_performance.py
import time
from app.services.cache_service import CacheService

def test_cache_performance(db_session):
    """Test cache retrieval performance"""
    service = CacheService(db_session)
    
    # Cache 100 responses
    for i in range(100):
        service.cache_response(
            f"Equipment{i}",
            {"test": "data"},
            f"E{i}"
        )
    
    # Measure retrieval time
    start = time.time()
    for i in range(100):
        service.get_cached_response(f"Equipment{i}", f"E{i}")
    end = time.time()
    
    avg_time = (end - start) / 100
    assert avg_time < 0.01  # Less than 10ms per lookup

def test_concurrent_requests(client):
    """Test handling concurrent requests"""
    import concurrent.futures
    
    def make_request():
        return client.get("/health")
    
    # Make 50 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(make_request) for _ in range(50)]
        results = [f.result() for f in futures]
    
    # All should succeed
    assert all(r.status_code == 200 for r in results)
```

---

## Running Tests

### Run All Tests
```bash
pytest tests/ -v
```

### Run Specific Test File
```bash
pytest tests/test_api/test_equipment.py -v
```

### Run Tests with Coverage
```bash
pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html to view coverage report
```

### Run Tests in Parallel
```bash
pytest tests/ -n auto  # Requires pytest-xdist
```

### Run Only Fast Tests (Skip Integration)
```bash
pytest tests/ -m "not integration"
```

### Run Only Failed Tests
```bash
pytest --lf  # Last failed
pytest --ff  # Failed first, then others
```

---

## Test Markers

```python
# pytest.ini
[pytest]
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow tests (>1s)

# Use in tests:
@pytest.mark.unit
def test_something():
    pass

@pytest.mark.slow
@pytest.mark.integration
def test_something_slow():
    pass
```

Run specific markers:
```bash
pytest -m unit  # Only unit tests
pytest -m "not slow"  # Skip slow tests
```

---

## Continuous Integration

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.11
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      run: |
        pytest tests/ --cov=app --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

---

## Test Coverage Goals

- **Overall Coverage:** >80%
- **Critical Paths:** >95% (Claude service, troubleshooting endpoint, cache)
- **CRUD Operations:** >90%
- **Utilities:** >85%

Check current coverage:
```bash
pytest --cov=app --cov-report=term-missing
```
