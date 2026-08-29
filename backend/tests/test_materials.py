from __future__ import annotations

from app.services import material_indexing, material_service
from tests.test_curriculum import auth_headers, register_user


class FakeEmbeddingResult:
    def __init__(self, rows):
        self.rows = rows

    def tolist(self):
        return self.rows


class FakeEmbeddingModel:
    def encode(self, texts, normalize_embeddings=True):
        return FakeEmbeddingResult([[0.1, 0.2] for _ in texts])


class FakeCollection:
    def __init__(self):
        self.upserts = []

    def upsert(self, **kwargs):
        self.upserts.append(kwargs)

    def query(self, query_embeddings, n_results, where, include):
        return {
            "documents": [["University learning outcomes"]],
            "metadatas": [[{"college": "CSE", "semester": "2024", "regulation": "R2021", "document_id": 1, "page_number": 1}]],
            "distances": [[0.12]],
        }


def test_teacher_can_upload_and_search_materials(client, monkeypatch):
    teacher = register_user(
        client,
        email="materials-teacher@example.com",
        full_name="Materials Teacher",
        password="secret123",
        role="teacher",
    )
    headers = auth_headers(teacher["access_token"])

    monkeypatch.setattr(
        material_service,
        "parse_material_file",
        lambda file_path, **kwargs: [
            material_indexing.ParsedChunk(content="University learning outcomes and academic support", page_number=1),
            material_indexing.ParsedChunk(content="Course guidance and scheduling details", page_number=2),
        ],
    )
    monkeypatch.setattr(material_service, "index_chunks", lambda chunks, **kwargs: [f"doc-{index}" for index in range(len(chunks))])
    monkeypatch.setattr(material_service, "file_content_hash", lambda file_path: "hash-123")
    monkeypatch.setattr(material_indexing, "get_embedding_model", lambda: FakeEmbeddingModel())
    monkeypatch.setattr(material_indexing, "get_chroma_collection", lambda: FakeCollection())
    monkeypatch.setattr(material_service, "search_chunks", lambda *args, **kwargs: {"documents": [["University learning outcomes"]], "metadatas": [[{"college": "CSE", "semester": "2024", "regulation": "R2021", "document_id": 1, "page_number": 1}]], "distances": [[0.12]]})

    upload_response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("sample.txt", "University learning outcomes and academic support\nCourse guidance and scheduling details", "text/plain")},
        data={"college": "CSE", "semester": "2024", "regulation": "R2021"},
    )
    assert upload_response.status_code == 201
    payload = upload_response.json()
    assert payload["college"] == "CSE"
    assert payload["semester"] == "2024"
    assert payload["regulation"] == "R2021"
    assert payload["chunk_count"] == 2

    search_response = client.post(
        "/api/materials/search",
        headers=headers,
        json={"college": "CSE", "semester": "2024", "regulation": "R2021", "query": "learning outcomes", "limit": 5},
    )
    assert search_response.status_code == 200
    assert search_response.json()["documents"][0][0] == "University learning outcomes"


def test_student_can_upload_materials(client, monkeypatch):
    student = register_user(
        client,
        email="materials-student@example.com",
        full_name="Materials Student",
        password="secret123",
        role="student",
    )
    headers = auth_headers(student["access_token"])

    response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("sample.txt", "hello world", "text/plain")},
        data={"college": "CSE", "semester": "2024", "regulation": "R2021"},
    )
    assert response.status_code == 201
