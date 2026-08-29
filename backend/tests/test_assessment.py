import pytest

from app.models.assessment import DiagnosticQuestion
from app.api.assessment import REQUIRED_CATEGORIES
from app.db.database import get_session_factory

@pytest.fixture
def student_token(client):
    # Register and login a student
    client.post("/api/auth/register", json={
        "email": "student@test.com",
        "full_name": "Test Student",
        "password": "password",
        "role": "student"
    })
    resp = client.post("/api/auth/login", json={
        "email": "student@test.com",
        "password": "password"
    })
    return resp.json()["access_token"]

@pytest.fixture
def teacher_token(client):
    client.post("/api/auth/register", json={
        "email": "teacher@test.com",
        "full_name": "Test Teacher",
        "password": "password",
        "role": "teacher"
    })
    resp = client.post("/api/auth/login", json={
        "email": "teacher@test.com",
        "password": "password"
    })
    return resp.json()["access_token"]


@pytest.fixture
def seed_questions(client):
    # The client fixture triggers init_db which creates tables
    factory = get_session_factory()
    with factory() as session:
        for category in REQUIRED_CATEGORIES:
            question = DiagnosticQuestion(
                text=f"Test Question {category}",
                options=["A", "B", "C"],
                correct_answer="A",
                explanation="Explanation",
                skill_category=category,
                difficulty="Easy",
                is_active=True,
            )
            session.add(question)
        session.commit()

def test_assessment_lifecycle(client, student_token, seed_questions):
    headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Start Assessment
    start_resp = client.post("/assessment/start", headers=headers)
    assert start_resp.status_code == 200, start_resp.text
    data = start_resp.json()
    assert "assessment_id" in data
    assessment_id = data["assessment_id"]

    # 2. Get Questions
    questions_resp = client.get(f"/assessment/{assessment_id}/questions", headers=headers)
    assert questions_resp.status_code == 200
    questions = questions_resp.json()
    assert len(questions) == 5
    assert "correct_answer" not in questions[0]
    
    # 3. Submit Answers
    answers = [{"question_id": q["id"], "selected_answer": "A"} for q in questions]

    submit_resp = client.post(
        f"/assessment/{assessment_id}/submit",
        json={"answers": answers},
        headers=headers,
    )
    assert submit_resp.status_code == 200

    # 4. Check Skills
    skills_resp = client.get("/assessment/skills", headers=headers)
    assert skills_resp.status_code == 200
    skills = skills_resp.json()
    assert len(skills) == 5
    for skill in skills:
        assert skill["score"] == 100.0


def test_assessment_start_auto_seeds_questions(client, student_token):
    # Missing categories are automatically seeded/generated
    headers = {"Authorization": f"Bearer {student_token}"}
    start_resp = client.post("/assessment/start", headers=headers)
    assert start_resp.status_code == 200


def test_teacher_cannot_take_assessment(client, teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    start_resp = client.post("/assessment/start", headers=headers)
    assert start_resp.status_code == 403

