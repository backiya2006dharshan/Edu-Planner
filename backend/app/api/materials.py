from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.schemas.material import MaterialDocumentRead, MaterialDocumentDetail, MaterialSearchRequest
from app.services.material_service import list_material_documents, search_material_documents, upload_material_document, get_material_document_detail, delete_material_document

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialDocumentRead])
async def materials_list(
    college: str | None = None,
    semester: str | None = None,
    regulation: str | None = None,
    class_id: int | None = None,
    current_user: User = Depends(get_current_user),
) -> list[MaterialDocumentRead]:
    return await list_material_documents(college=college, semester=semester, regulation=regulation, class_id=class_id, uploader_id=current_user.id)


@router.post("", response_model=MaterialDocumentRead, status_code=status.HTTP_201_CREATED)
async def material_upload(
    college: str = Form(..., min_length=1, max_length=255),
    semester: str = Form(..., min_length=1, max_length=50),
    regulation: str = Form(..., min_length=1, max_length=100),
    class_id: int | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> MaterialDocumentRead:
    return await upload_material_document(file=file, college=college, semester=semester, regulation=regulation, class_id=class_id, uploader_id=current_user.id)


@router.post("/search", response_model=dict[str, list[list[Any]]])
async def material_search(
    payload: MaterialSearchRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, list[list[Any]]]:
    return await search_material_documents(payload, uploader_id=current_user.id)


@router.get("/{material_id}", response_model=MaterialDocumentDetail)
async def get_material_detail(
    material_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    # Optional: we can scope detail endpoint as well if requested, but list/search are the main ones
    return await get_material_document_detail(material_id)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
):
    from fastapi import Response
    await delete_material_document(material_id, uploader_id=current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
