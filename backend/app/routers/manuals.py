import re
from pathlib import Path
from typing import Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_current_user
from app.config import settings
from app.db.models.rag import Manual, ManualChunk
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.rag import ManualChunkRead, ManualRead
from app.services.indexing import index_manual_background

router = APIRouter()


def _manual_storage_path() -> Path:
    if settings.MANUAL_STORAGE_PATH:
        base_path = Path(settings.MANUAL_STORAGE_PATH)
    else:
        base_path = Path(settings.STORAGE_PATH) / "manuals"

    base_path.mkdir(parents=True, exist_ok=True)
    return base_path


def _sanitize_filename(filename: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", filename.strip())
    return safe_name or "manual.pdf"


@router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=dict)
async def upload_manual(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    brand: str = Form(...),
    model: str = Form(...),
    equipment_type: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Upload a service manual PDF and start async indexing."""
    del current_user

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    safe_name = _sanitize_filename(file.filename)
    manual = Manual(
        filename=safe_name,
        brand=brand.strip(),
        model=model.strip(),
        equipment_type=equipment_type.strip() if equipment_type else None,
        file_path="",
        indexing_status="pending",
    )
    db.add(manual)
    db.flush()

    storage_path = _manual_storage_path()
    stored_filename = f"{manual.id}_{safe_name}"
    file_path = storage_path / stored_filename

    try:
        async with aiofiles.open(file_path, "wb") as output_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                await output_file.write(chunk)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save manual: {exc}",
        ) from exc
    finally:
        await file.close()

    manual.file_path = str(file_path)
    db.commit()
    db.refresh(manual)

    background_tasks.add_task(index_manual_background, manual.id, manual.file_path)

    return {
        "success": True,
        "data": {
            "manual": ManualRead.model_validate(manual),
            "message": "Manual uploaded. Indexing started in background.",
        },
    }


@router.get("", response_model=dict)
def list_manuals(
    brand: Optional[str] = None,
    model: Optional[str] = None,
    equipment_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List indexed manuals with optional filters."""
    del current_user

    query = db.query(Manual)
    if brand:
        query = query.filter(Manual.brand.ilike(f"%{brand}%"))
    if model:
        query = query.filter(Manual.model.ilike(f"%{model}%"))
    if equipment_type:
        query = query.filter(Manual.equipment_type.ilike(f"%{equipment_type}%"))
    if status_filter:
        query = query.filter(Manual.indexing_status == status_filter)

    manuals = query.order_by(Manual.created_at.desc()).all()
    return {
        "success": True,
        "data": {
            "manuals": [ManualRead.model_validate(manual) for manual in manuals],
            "total": len(manuals),
        },
    }


@router.get("/{manual_id}", response_model=dict)
def get_manual(
    manual_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific manual."""
    del current_user

    manual = db.query(Manual).filter(Manual.id == manual_id).first()
    if manual is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual not found")

    return {"success": True, "data": ManualRead.model_validate(manual)}


@router.delete("/{manual_id}", response_model=dict)
def delete_manual(
    manual_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete a manual and cascade delete its chunks."""
    del current_user

    manual = db.query(Manual).filter(Manual.id == manual_id).first()
    if manual is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual not found")

    file_path = Path(manual.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    db.delete(manual)
    db.commit()
    return {"success": True, "message": "Manual deleted successfully"}


@router.get("/{manual_id}/pdf")
def download_manual_pdf(
    manual_id: UUID,
    db: Session = Depends(get_db),
):
    """Download stored manual PDF."""
    from fastapi.responses import FileResponse

    manual = db.query(Manual).filter(Manual.id == manual_id).first()
    if manual is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual not found")

    file_path = Path(manual.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not found on server")

    return FileResponse(path=str(file_path), media_type="application/pdf", filename=manual.filename)


@router.get("/{manual_id}/chunks", response_model=dict)
def list_manual_chunks(
    manual_id: UUID,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Debug endpoint: list chunks for a manual."""
    del current_user

    manual = db.query(Manual).filter(Manual.id == manual_id).first()
    if manual is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual not found")

    query = db.query(ManualChunk).filter(ManualChunk.manual_id == manual_id)
    total = query.count()
    chunks = (
        query.order_by(ManualChunk.page_number.asc(), ManualChunk.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "success": True,
        "data": {
            "chunks": [ManualChunkRead.model_validate(chunk) for chunk in chunks],
            "total": total,
            "limit": limit,
            "offset": offset,
        },
    }
