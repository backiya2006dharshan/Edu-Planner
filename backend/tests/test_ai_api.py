import json
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from app.models.user import User
from app.models.assessment import StudentSkill

@pytest.fixture
def test_student() -> User:
    user = User(
        id=42,
        email="student@example.com",
        full_name="student1",
        role="student",
        is_active=True
    )
    return user

@pytest.fixture
def test_teacher() -> User:
    user = User(
        id=43,
        email="teacher@example.com",
        full_name="teacher1",
        role="teacher",
        is_active=True
    )
    return user


from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def async_client():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_ai_api_unauthenticated(async_client: AsyncClient):
    """Unauthenticated users should be rejected."""
    payload = {
        "subject": "Math",
        "topic": "Algebra",
        "learning_goal": "Learn",
        "semester": "1",
        "regulation": "R2021",
        "year": "2023",
        "college": "Engineering College"
    }
    response = await async_client.post("/api/ai/learning-plan", json=payload)
    assert response.status_code == 401


@pytest.mark.anyio
async def test_ai_api_unauthorized_role(async_client: AsyncClient, test_teacher):
    """Non-student users (e.g. teachers) should be rejected from the student endpoint."""
    from app.dependencies.auth import get_current_user
    from app.main import app
    
    app.dependency_overrides[get_current_user] = lambda: test_teacher
    try:
        payload = {
            "subject": "Math",
            "topic": "Algebra",
            "learning_goal": "Learn",
            "semester": "1",
            "regulation": "R2021",
            "year": "2023",
            "college": "Engineering College"
        }
        response = await async_client.post("/api/ai/learning-plan", json=payload)
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user)


@pytest.mark.anyio
async def test_ai_api_success(async_client: AsyncClient, test_student):
    """Test successful generation."""
    from app.dependencies.auth import get_current_user
    from app.main import app
    from app.api.ai import get_db
    
    app.dependency_overrides[get_current_user] = lambda: test_student
    
    # Mock the DB to return some skill scores and then curriculum models
    mock_db = MagicMock()
    
    # We will just return MagicMocks that behave like Subject/Topic/StudentSkill
    mock_subject = MagicMock()
    mock_subject.name = "Math"
    mock_subject.description = "Mathematics"
    
    mock_topic = MagicMock()
    mock_topic.name = "Algebra"
    mock_topic.description = "Algebra description"
    mock_topic.id = 1
    
    mock_skill1 = StudentSkill(skill_category="Numerical Calculation", score=0.8)
    mock_skill2 = StudentSkill(skill_category="Abstract Thinking", score=0.4)
    
    def db_execute_side_effect(statement):
        # Very simple router based on the table name in the statement
        stmt_str = str(statement).lower()
        mock_result = MagicMock()
        if "student_skills" in stmt_str:
            mock_result.scalars().all.return_value = [mock_skill1, mock_skill2]
        elif "subjects" in stmt_str:
            mock_result.scalars().first.return_value = mock_subject
        elif "topics" in stmt_str:
            mock_result.scalars().first.return_value = mock_topic
        elif "learning_objectives" in stmt_str:
            mock_obj = MagicMock()
            mock_obj.name = "Solve equations"
            mock_result.scalars().all.return_value = [mock_obj]
        return mock_result
        
    mock_db.execute.side_effect = db_execute_side_effect
    mock_db.add = MagicMock()
    mock_db.flush = MagicMock()
    mock_db.commit = MagicMock()
    mock_db.rollback = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # Mock the graph
    mock_graph = AsyncMock()
    mock_graph.ainvoke.return_value = {
        "iteration_count": 1,
        "final_output": json.dumps({
            "status": "APPROVED",
            "score": 95,
            "plan": {"learning_objectives": ["Goal 1"]},
            "evaluator_feedback": "Looks great",
            "issues": []
        })
    }
    
    with patch("app.api.ai.build_learning_graph", return_value=mock_graph), \
         patch("app.api.ai.search_chunks") as mock_search_chunks:
        
        mock_search_chunks.return_value = {
            "documents": [["Retrieved RAG Chunk content"]],
            "metadatas": [[{"page_number": 1}]]
        }
        try:
            payload = {
                "subject": "Math",
                "topic": "Algebra",
                "learning_goal": "Learn",
                "semester": "1",
                "regulation": "R2021",
                "year": "2023",
                "college": "Engineering College"
            }
            response = await async_client.post("/api/ai/learning-plan", json=payload)
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "APPROVED"
            assert data["score"] == 95
            assert data["plan"]["learning_objectives"] == ["Goal 1"]
            assert data["iteration_count"] == 1
            
            # Verify graph was called correctly with auth ID and skills
            mock_graph.ainvoke.assert_called_once()
            state_args = mock_graph.ainvoke.call_args[0][0]
            assert state_args["student_id"] == 42
            assert state_args["subject"] == "Math"
            # rag_context should be populated server-side
            assert "Chunk" in state_args["rag_context"]
            assert "Subject: Math" in state_args["curriculum_context"]
            
            # Verify DB values were mapped to attributes
            assert state_args["skill_scores"].numerical_calculation == 0.8
            assert state_args["skill_scores"].abstract_thinking == 0.4
            
        finally:
            app.dependency_overrides.pop(get_current_user)
            app.dependency_overrides.pop(get_db)


@pytest.mark.anyio
async def test_ai_api_provider_failure(async_client: AsyncClient, test_student):
    """Test safe propagation of provider failures without leaking secrets."""
    from app.dependencies.auth import get_current_user
    from app.main import app
    from app.api.ai import get_db
    
    app.dependency_overrides[get_current_user] = lambda: test_student
    
    mock_db = MagicMock()
    mock_db.execute.return_value.scalars.return_value.all.return_value = []
    mock_db.add = MagicMock()
    mock_db.flush = MagicMock()
    mock_db.commit = MagicMock()
    mock_db.rollback = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    
    from app.ai.exceptions import LLMAPIError
    
    mock_graph = AsyncMock()
    mock_graph.ainvoke.side_effect = LLMAPIError("API Secret Key is Invalid")
    
    with patch("app.api.ai.build_learning_graph", return_value=mock_graph), \
         patch("app.api.ai.search_chunks") as mock_search_chunks:
        
        mock_search_chunks.return_value = {
            "documents": [[]],
            "metadatas": [[]]
        }
        try:
            payload = {
                "subject": "Math",
                "topic": "Algebra",
                "learning_goal": "Learn",
                "semester": "1",
                "regulation": "R2021",
                "year": "2023",
                "college": "Engineering College"
            }
            response = await async_client.post("/api/ai/learning-plan", json=payload)
            assert response.status_code == 502
            data = response.json()
            
            # Must NOT expose raw error string with potential secrets
            assert "API Secret Key" not in data["detail"]
            assert "error" in data["detail"].lower() or "failed" in data["detail"].lower() or "authentication" in data["detail"].lower()
        finally:
            app.dependency_overrides.pop(get_current_user)
            app.dependency_overrides.pop(get_db)
