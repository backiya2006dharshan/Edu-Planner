from __future__ import annotations

import hashlib
import mimetypes
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


@dataclass(frozen=True)
class ParsedChunk:
    content: str
    page_number: int | None = None


def _clean_text(text: str) -> str:
    return " ".join(text.split()).strip()


def _split_text(text: str, *, chunk_size: int = 900, overlap: int = 120) -> list[str]:
    words = _clean_text(text).split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap
    return chunks


def parse_material_file(file_path: str | Path, *, chunk_size: int = 900, overlap: int = 120) -> list[ParsedChunk]:
    """Extract text from supported files and split it into searchable chunks."""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md", ".rst"}:
        pages = [(path.read_text(encoding="utf-8"), None)]
    elif suffix == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("Install pypdf to parse PDF materials") from exc
        pages = [(page.extract_text() or "", index + 1) for index, page in enumerate(PdfReader(str(path)).pages)]
    elif suffix == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("Install python-docx to parse DOCX materials") from exc
        pages = [("\n".join(paragraph.text for paragraph in Document(str(path)).paragraphs), None)]
    else:
        raise ValueError(f"Unsupported material file type: {suffix or 'unknown'}")

    parsed: list[ParsedChunk] = []
    for text, page_number in pages:
        parsed.extend(ParsedChunk(content=chunk, page_number=page_number) for chunk in _split_text(text, chunk_size=chunk_size, overlap=overlap))
    return parsed


@lru_cache(maxsize=1)
def get_embedding_model() -> Any:
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError("Install sentence-transformers to index materials") from exc
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


@lru_cache(maxsize=1)
def get_chroma_collection() -> Any:
    try:
        import chromadb
    except ImportError as exc:
        raise RuntimeError("Install chromadb to index materials") from exc
    settings = get_settings()
    client = chromadb.PersistentClient(path=settings.chroma_path)
    return client.get_or_create_collection("college_materials")


def material_metadata(*, college: str, semester: str, regulation: str, document_id: int | None = None, page_number: int | None = None) -> dict[str, str | int]:
    metadata: dict[str, str | int] = {"college": college, "semester": semester, "regulation": regulation}
    if document_id is not None:
        metadata["document_id"] = document_id
    if page_number is not None:
        metadata["page_number"] = page_number
    return metadata


def index_chunks(chunks: list[ParsedChunk], *, college: str, semester: str, regulation: str, document_id: int, content_hash: str) -> list[str]:
    if not chunks:
        return []
    ids = [f"{content_hash}:{index}" for index in range(len(chunks))]
    embeddings = get_embedding_model().encode([chunk.content for chunk in chunks], normalize_embeddings=True).tolist()
    get_chroma_collection().upsert(
        ids=ids,
        documents=[chunk.content for chunk in chunks],
        embeddings=embeddings,
        metadatas=[material_metadata(college=college, semester=semester, regulation=regulation, document_id=document_id, page_number=chunk.page_number) for chunk in chunks],
    )
    return ids


def search_chunks(query: str, *, college: str, semester: str, regulation: str, limit: int = 5) -> dict[str, list[list[Any]]]:
    embedding = get_embedding_model().encode([query], normalize_embeddings=True).tolist()
    return get_chroma_collection().query(
        query_embeddings=embedding,
        n_results=limit,
        where={"$and": [{"college": college}, {"semester": semester}, {"regulation": regulation}]},
        include=["documents", "metadatas", "distances"],
    )


def file_content_hash(file_path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(file_path).open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def file_mime_type(file_path: str | Path) -> str | None:
    return mimetypes.guess_type(str(file_path))[0]