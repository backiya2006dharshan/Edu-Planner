from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.material import MaterialDocumentRead, MaterialSearchRequest
from app.services.material_service import list_material_documents, search_material_documents, upload_material_document

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialDocumentRead])
async def materials_list(
    college: str | None = None,
    semester: str | None = None,
    regulation: str | None = None,
    _: User = Depends(get_current_user),
) -> list[MaterialDocumentRead]:
    return await list_material_documents(college=college, semester=semester, regulation=regulation)


@router.post("", response_model=MaterialDocumentRead, status_code=status.HTTP_201_CREATED)
async def material_upload(
    college: str = Form(..., min_length=1, max_length=255),
    semester: str = Form(..., min_length=1, max_length=50),
    regulation: str = Form(..., min_length=1, max_length=100),
    file: UploadFile = File(...),
    _: User = Depends(require_role("teacher")),
) -> MaterialDocumentRead:
    return await upload_material_document(file=file, college=college, semester=semester, regulation=regulation)


@router.post("/search", response_model=dict[str, list[list[Any]]])
async def material_search(
    payload: MaterialSearchRequest,
    _: User = Depends(get_current_user),
) -> dict[str, list[list[Any]]]:
    return await search_material_documents(payload)
