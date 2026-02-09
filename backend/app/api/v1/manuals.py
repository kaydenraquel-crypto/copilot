from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models.manual import EquipmentManual
from app.db.models.user import User
from app.schemas.manual import ManualResponse, ManualDetail
from app.core.storage import storage
from app.utils.pdf import extract_text_from_pdf, get_pdf_info
from app.utils.hash import hash_file
from app.core.claude import structure_manual_content, search_manual_on_web

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
    current_user: User = Depends(get_current_user)
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
    file_hash = hash_file(file_path)
    
    # Structure content with Claude
    try:
        sections = await structure_manual_content(manual_text, manufacturer, model)
    except Exception:
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
        pdf_version=pdf_version,
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
            "page_count": manual.page_count,
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    manual.last_accessed = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "data": ManualDetail.model_validate(manual)
    }


@router.get("/{manual_id}/pdf")
def download_manual_pdf(
    manual_id: int,
    db: Session = Depends(get_db)
):
    """
    Download the stored PDF file for a manual.
    This endpoint is public (no auth) to allow direct browser access.
    """
    from fastapi.responses import FileResponse
    import os
    
    manual = db.query(EquipmentManual).filter(EquipmentManual.id == manual_id).first()
    
    if not manual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual not found"
        )
    
    if not manual.file_path or not os.path.exists(manual.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on server"
        )
    
    # Update access stats
    manual.times_accessed += 1
    manual.last_accessed = datetime.utcnow()
    db.commit()
    
    filename = f"{manual.manufacturer}_{manual.model}_{manual.manual_type}.pdf".replace(" ", "_")
    
    return FileResponse(
        path=manual.file_path,
        media_type="application/pdf",
        filename=filename
    )


@router.delete("/{manual_id}", response_model=dict)
def delete_manual(
    manual_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a manual from the library."""
    
    manual = db.query(EquipmentManual).filter(EquipmentManual.id == manual_id).first()
    
    if not manual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual not found"
        )
    
    # Delete file from storage
    try:
        import os
        if os.path.exists(manual.file_path):
            os.remove(manual.file_path)
    except Exception:
        pass  # File may already be deleted
    
    # Delete from database
    db.delete(manual)
    db.commit()
    
    return {
        "success": True,
        "message": "Manual deleted successfully"
    }


@router.post("/search", response_model=dict)
async def search_manual(
    manufacturer: str,
    model: str,
    manual_type: str = "service",
    auto_download: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for manual on the web.
    If found and auto_download=True, automatically downloads and saves to library.
    """
    from app.utils.download import download_pdf
    from app.utils.hash import hash_file
    
    # Check if we already have it
    existing = db.query(EquipmentManual).filter(
        EquipmentManual.manufacturer.ilike(f"%{manufacturer}%"),
        EquipmentManual.model.ilike(f"%{model}%"),
        EquipmentManual.manual_type == manual_type
    ).first()
    
    if existing:
        return {
            "success": True,
            "data": {
                "found": True,
                "already_in_library": True,
                "manual_id": existing.id,
                "message": "Manual already exists in library"
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
                    f"Contact {manufacturer} for assistance"
                ]
            }
        }
    
    # If we found a URL and auto_download is enabled, try to download
    pdf_url = result.get("url")
    
    if auto_download and pdf_url:
        # Generate filename
        filename = f"{manufacturer}_{model}_{manual_type}".replace(" ", "_")
        
        # Try to download the PDF
        success, file_path, error = await download_pdf(pdf_url, filename)
        
        if success and file_path:
            try:
                # Extract PDF info
                pdf_info = get_pdf_info(file_path)
                
                # Extract text
                manual_text = extract_text_from_pdf(file_path)
                
                # Calculate file hash
                file_hash = hash_file(file_path)
                
                # Structure content with Claude
                try:
                    sections = await structure_manual_content(manual_text, manufacturer, model)
                except Exception:
                    sections = {}
                
                # Create database record
                manual = EquipmentManual(
                    manufacturer=manufacturer,
                    model=model,
                    manual_type=manual_type,
                    file_path=file_path,
                    file_size_mb=pdf_info["file_size_mb"],
                    page_count=pdf_info["page_count"],
                    file_hash=file_hash,
                    extracted_text=manual_text,
                    extracted_sections=sections,
                    source="web_search",
                    source_url=pdf_url,
                    ocr_quality="good",
                    processing_status="completed"
                )
                
                db.add(manual)
                db.commit()
                db.refresh(manual)
                
                return {
                    "success": True,
                    "data": {
                        "found": True,
                        "auto_downloaded": True,
                        "manual_id": manual.id,
                        "source": result.get("source"),
                        "page_count": manual.page_count,
                        "file_size_mb": float(manual.file_size_mb) if manual.file_size_mb else None,
                        "message": f"Manual found and automatically saved to library!"
                    }
                }
            except Exception as e:
                # Download succeeded but processing failed
                return {
                    "success": True,
                    "data": {
                        "found": True,
                        "auto_downloaded": False,
                        "download_error": f"Processing failed: {str(e)}",
                        "source": result.get("source"),
                        "url": pdf_url,
                        "message": "Manual found but auto-processing failed. Try manual upload."
                    }
                }
        else:
            # Download failed, return the URL for manual download
            return {
                "success": True,
                "data": {
                    "found": True,
                    "auto_downloaded": False,
                    "download_error": error,
                    "source": result.get("source"),
                    "url": pdf_url,
                    "page_url": result.get("page_url"),
                    "message": "Manual found but auto-download failed. Use the URL to download manually."
                }
            }
    
    # No auto-download, just return the found info
    return {
        "success": True,
        "data": {
            "found": True,
            "auto_downloaded": False,
            "source": result.get("source"),
            "url": pdf_url,
            "page_url": result.get("page_url"),
            "message": "Manual found online. Set auto_download=true to save automatically."
        }
    }

