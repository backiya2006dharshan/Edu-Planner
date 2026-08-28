import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock
from app.models.user import User
from app.models.learning_plan import LearningPlan, LearningModule, LearningTask

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
async def async_client():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.mark.anyio
async def test_get_active_plan_not_found(async_client: AsyncClient, test_student):
    from app.dependencies.auth import get_current_user
    from app.main import app
    from app.api.learning_plan import get_db
    
    app.dependency_overrides[get_current_user] = lambda: test_student
    mock_db = MagicMock()
    mock_db.execute.return_value.scalars.return_value.unique.return_value.first.return_value = None
    app.dependency_overrides[get_db] = lambda: mock_db
    
    try:
        response = await async_client.get("/api/learning-plans/active")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user)
        app.dependency_overrides.pop(get_db)


@pytest.mark.anyio
async def test_complete_task_not_found(async_client: AsyncClient, test_student):
    from app.dependencies.auth import get_current_user
    from app.main import app
    from app.api.learning_plan import get_db
    
    app.dependency_overrides[get_current_user] = lambda: test_student
    mock_db = MagicMock()
    mock_db.execute.return_value.scalars.return_value.first.return_value = None
    app.dependency_overrides[get_db] = lambda: mock_db
    
    try:
        response = await async_client.patch("/api/learning-plans/tasks/999/complete")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user)
        app.dependency_overrides.pop(get_db)


@pytest.mark.anyio
async def test_complete_task_success(async_client: AsyncClient, test_student):
    from app.dependencies.auth import get_current_user
    from app.main import app
    from app.api.learning_plan import get_db
    from datetime import datetime
    
    app.dependency_overrides[get_current_user] = lambda: test_student
    mock_db = MagicMock()
    
    # Mock task
    mock_task = LearningTask(id=999, module_id=1, title="Test", task_type="lesson", is_completed=False, order_index=0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    mock_db.execute.return_value.scalars.return_value.first.return_value = mock_task
    
    app.dependency_overrides[get_db] = lambda: mock_db
    
    try:
        response = await async_client.patch("/api/learning-plans/tasks/999/complete")
        assert response.status_code == 200
        assert response.json()["is_completed"] == True
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_task)
    finally:
        app.dependency_overrides.pop(get_current_user)
        app.dependency_overrides.pop(get_db)
