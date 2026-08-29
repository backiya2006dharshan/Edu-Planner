from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MaterialScope(BaseModel):
    college: str = Field(min_length=1, max_length=255)
    semester: str = Field(min_length=1, max_length=50)
    regulation: str = Field(min_length=1, max_length=100)


class MaterialDocumentCreate(MaterialScope):
    file_name: str = Field(min_length=1, max_length=500)
    file_path: str = Field(min_length=1, max_length=1000)
    mime_type: str | None = Field(default=None, max_length=100)


class MaterialDocumentRead(MaterialDocumentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_hash: str
    embedding_model: str
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class MaterialChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    chunk_index: int
    content: str
    page_number: int | None
    chroma_id: str
    college: str
    semester: str
    regulation: str


class MaterialSearchRequest(MaterialScope):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=5, ge=1, le=50)

class MaterialDocumentDetail(MaterialDocumentRead):
    chunks: list[MaterialChunkRead] = []
