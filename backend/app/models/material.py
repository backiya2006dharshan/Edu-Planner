from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import mapped_column, relationship

from app.db.database import Base


class MaterialDocument(Base):
    __tablename__ = "material_documents"
    __table_args__ = (Index("ix_material_documents_scope", "college", "semester", "regulation"),)

    id = mapped_column(Integer, primary_key=True, index=True)
    college = mapped_column(String(255), nullable=False, index=True)
    semester = mapped_column(String(50), nullable=False, index=True)
    regulation = mapped_column(String(100), nullable=False, index=True)
    file_name = mapped_column(String(500), nullable=False)
    file_path = mapped_column(String(1000), nullable=False)
    mime_type = mapped_column(String(100), nullable=True)
    content_hash = mapped_column(String(64), nullable=False, unique=True, index=True)
    embedding_model = mapped_column(String(255), nullable=False)
    chunk_count = mapped_column(Integer, nullable=False, default=0)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    chunks = relationship("MaterialChunk", back_populates="document", cascade="all, delete-orphan")


class MaterialChunk(Base):
    __tablename__ = "material_chunks"
    __table_args__ = (
        Index("uq_material_chunks_document_index", "document_id", "chunk_index", unique=True),
        Index("ix_material_chunks_filter_scope", "college", "semester", "regulation"),
    )

    id = mapped_column(Integer, primary_key=True, index=True)
    document_id = mapped_column(ForeignKey("material_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = mapped_column(Integer, nullable=False)
    content = mapped_column(Text, nullable=False)
    page_number = mapped_column(Integer, nullable=True)
    chroma_id = mapped_column(String(255), nullable=False, unique=True, index=True)
    college = mapped_column(String(255), nullable=False, index=True)
    semester = mapped_column(String(50), nullable=False, index=True)
    regulation = mapped_column(String(100), nullable=False, index=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("MaterialDocument", back_populates="chunks")