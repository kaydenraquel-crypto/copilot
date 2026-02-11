from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.rag import ManualUsed, RAGQueryRequest, RAGQueryResponse, RAGSource
from app.services.embeddings import embed_query
from app.services.rag import (
    build_fallback_response,
    build_rag_response,
    get_indexed_manual,
    similarity_search,
)

router = APIRouter()


@router.post("/rag", response_model=dict)
async def query_rag(
    request: RAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user

    manual = get_indexed_manual(
        db=db,
        equipment_model=request.equipment_model,
        brand=request.brand,
    )

    if manual is None:
        try:
            fallback_answer = await build_fallback_response(
                question=request.question,
                brand=request.brand,
                model=request.equipment_model,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Claude fallback response generation failed: {exc}",
            ) from exc

        response_payload = RAGQueryResponse(
            answer=f"{fallback_answer}\n\nNote: No indexed manual was found for this model.",
            sources=[],
            manual_used=None,
            manual_available=False,
        )
        return {"success": True, "data": response_payload}

    try:
        question_embedding = await embed_query(request.question)
    except Exception as exc:
        # Embedding failures still get a graceful fallback answer.
        try:
            fallback_answer = await build_fallback_response(
                question=request.question,
                brand=request.brand,
                model=request.equipment_model,
            )
        except Exception as fallback_exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate query embedding ({exc}) and fallback failed ({fallback_exc})",
            ) from fallback_exc

        response_payload = RAGQueryResponse(
            answer=(
                f"{fallback_answer}\n\n"
                "Note: Manual is indexed but semantic retrieval was unavailable for this request."
            ),
            sources=[],
            manual_used=ManualUsed(
                id=manual["id"],
                filename=manual["filename"],
                brand=manual["brand"],
                model=manual["model"],
            ),
            manual_available=True,
        )
        return {"success": True, "data": response_payload}

    matched_chunks = similarity_search(
        db=db,
        question_embedding=question_embedding,
        equipment_model=request.equipment_model,
        brand=request.brand,
        top_k=request.top_k,
    )

    if matched_chunks:
        try:
            answer = await build_rag_response(request.question, matched_chunks)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"RAG response generation failed: {exc}",
            ) from exc

        sources = [
            RAGSource(
                page=chunk.get("page_number"),
                section=chunk.get("section"),
                excerpt=(chunk.get("chunk_text") or "")[:320],
            )
            for chunk in matched_chunks
        ]

        manual_used = ManualUsed(
            id=manual["id"],
            filename=manual["filename"],
            brand=manual["brand"],
            model=manual["model"],
        )

        response_payload = RAGQueryResponse(
            answer=answer,
            sources=sources,
            manual_used=manual_used,
            manual_available=True,
        )
        return {"success": True, "data": response_payload}

    try:
        fallback_answer = await build_fallback_response(
            question=request.question,
            brand=request.brand,
            model=request.equipment_model,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Claude fallback response generation failed: {exc}",
        ) from exc

    response_payload = RAGQueryResponse(
        answer=(
            f"{fallback_answer}\n\n"
            "Note: Manual is indexed but no sufficiently relevant excerpts were found for this question."
        ),
        sources=[],
        manual_used=ManualUsed(
            id=manual["id"],
            filename=manual["filename"],
            brand=manual["brand"],
            model=manual["model"],
        ),
        manual_available=True,
    )
    return {"success": True, "data": response_payload}
