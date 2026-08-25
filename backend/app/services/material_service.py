from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select

from app.db.database import get_session_factory
from app.models.material import MaterialChunk, MaterialDocument
from app.schemas.material import MaterialDocumentRead, MaterialSearchRequest
from app.services.material_indexing import file_content_hash, index_chunks, parse_material_file, search_chunks

SUPPORTED_MATERIAL_SUFFIXES = {".txt", ".md", ".rst", ".pdf", ".docx"}


def _document_scope_filters(college: str | None = None, semester: str | None = None, regulation: str | None = None):
    query = select(MaterialDocument)
    if college is not None:
        query = query.where(MaterialDocument.college == college)
    if semester is not None:
        query = query.where(MaterialDocument.semester == semester)
    if regulation is not None:
        query = query.where(MaterialDocument.regulation == regulation)
    return query


async def list_material_documents(*, college: str | None = None, semester: str | None = None, regulation: str | None = None) -> list[MaterialDocumentRead]:
    session_factory = get_session_factory()
    if session_factory is None:
        return []

    with session_factory() as session:
        documents = session.execute(_document_scope_filters(college, semester, regulation)).scalars().all()
    return [MaterialDocumentRead.model_validate(document) for document in documents]


async def upload_material_document(*, file: UploadFile, college: str, semester: str, regulation: str) -> MaterialDocumentRead:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file is required")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_MATERIAL_SUFFIXES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file type: {suffix or 'unknown'}")

    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not configured")

    temp_path: Path | None = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = Path(temp_file.name)
            while True:
                chunk = await file.read(1024 * 64)
                if not chunk:
                    break
                temp_file.write(chunk)

        content_hash = file_content_hash(temp_path)
        chunks = parse_material_file(temp_path)
        if not chunks:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file did not contain readable text")

        with session_factory() as session:
            existing = session.execute(
                select(MaterialDocument).where(MaterialDocument.content_hash == content_hash)
            ).scalar_one_or_none()
            if existing is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This file has already been indexed")

            document = MaterialDocument(
                college=college,
                semester=semester,
                regulation=regulation,
                file_name=file.filename,
                file_path=str(temp_path),
                mime_type=file.content_type,
                content_hash=content_hash,
                embedding_model="all-MiniLM-L6-v2",
                chunk_count=len(chunks),
            )
            session.add(document)
            session.flush()

            ids = index_chunks(
                chunks,
                college=college,
                semester=semester,
                regulation=regulation,
                document_id=document.id,
                content_hash=content_hash,
            )

            for index, chunk in enumerate(chunks):
                session.add(
                    MaterialChunk(
                        document_id=document.id,
                        chunk_index=index,
                        content=chunk.content,
                        page_number=chunk.page_number,
                        chroma_id=ids[index],
                        college=college,
                        semester=semester,
                        regulation=regulation,
                    )
                )

            session.commit()
            session.refresh(document)

        return MaterialDocumentRead.model_validate(document)
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


async def search_material_documents(payload: MaterialSearchRequest) -> dict[str, list[list[object]]]:
    try:
        return search_chunks(
            payload.query,
            college=payload.college,
            semester=payload.semester,
            regulation=payload.regulation,
            limit=payload.limit,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
