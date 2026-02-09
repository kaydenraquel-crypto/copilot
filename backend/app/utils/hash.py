import hashlib
import json


def create_query_hash(
    manufacturer: str, 
    model: str, 
    error_code: str, 
    symptom: str,
    model_id: str = "claude-sonnet-4-5"
) -> str:
    """Create deterministic hash for cache lookup. Includes model_id for per-model caching."""
    # Normalize inputs
    data = {
        "manufacturer": manufacturer.lower().strip(),
        "model": model.lower().strip(),
        "error_code": error_code.upper().strip() if error_code else "",
        "symptom": symptom.lower().strip() if symptom else "",
        "model_id": model_id.lower().strip()
    }
    
    # Create hash
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(data_str.encode()).hexdigest()


def hash_file(file_path: str) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
