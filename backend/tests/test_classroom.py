import pytest
from app.models.user import User
from app.services.auth_service import issue_token
from app.db.database import get_session_factory


@pytest.fixture
def teacher_token(client):
    factory = get_session_factory()
    with factory() as db:
        teacher = User(
            email="testteacher_cls@example.com",
            full_name="Test Teacher",
            role="teacher",
            hashed_password="hashed_pwd"
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        token = issue_token(teacher)
        t_id = teacher.id
    return token, t_id


@pytest.fixture
def student_token(client):
    factory = get_session_factory()
    with factory() as db:
        student = User(
            email="teststudent_cls@example.com",
            full_name="Test Student",
            role="student",
            hashed_password="hashed_pwd"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        token = issue_token(student)
        s_id = student.id
    return token, s_id


def test_create_class_teacher(client, teacher_token):
    token, _ = teacher_token
    payload = {
        "name": "Web Development 101",
        "college": "Kongu Engineering College",
        "year": "4",
        "semester": "7",
        "regulation": "2022",
        "section": "A"
    }
    response = client.post(
        "/api/classes",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Web Development 101"
    assert len(data["code"]) == 6
    assert data["code"].isupper()


def test_create_class_student_forbidden(client, student_token):
    token, _ = student_token
    payload = {"name": "Hacking Class"}
    response = client.post(
        "/api/classes",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_teacher_get_classes(client, teacher_token):
    token, _ = teacher_token
    client.post("/api/classes", json={"name": "Class 1"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/api/classes", json={"name": "Class 2"}, headers={"Authorization": f"Bearer {token}"})

    response = client.get("/api/classes/teacher", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_student_join_and_leave_class(client, teacher_token, student_token):
    t_token, _ = teacher_token
    s_token, _ = student_token

    # 1. Teacher creates class
    res = client.post("/api/classes", json={"name": "Data Structures"}, headers={"Authorization": f"Bearer {t_token}"})
    class_data = res.json()
    code = class_data["code"]
    class_id = class_data["id"]

    # 2. Student joins class with invalid code
    res_err = client.post("/api/classes/join", json={"code": "INVALID"}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_err.status_code == 404

    # 3. Student joins class with valid code
    res_join = client.post("/api/classes/join", json={"code": code}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_join.status_code == 200
    assert res_join.json()["id"] == class_id

    # 4. Student tries joining again (duplicate join)
    res_dup = client.post("/api/classes/join", json={"code": code}, headers={"Authorization": f"Bearer {s_token}"})
    assert res_dup.status_code == 400

    # 5. Student views joined classes
    res_st_cls = client.get("/api/classes/student", headers={"Authorization": f"Bearer {s_token}"})
    assert res_st_cls.status_code == 200
    assert len(res_st_cls.json()) == 1

    # 6. Teacher views class members
    res_mem = client.get(f"/api/classes/{class_id}/members", headers={"Authorization": f"Bearer {t_token}"})
    assert res_mem.status_code == 200
    members = res_mem.json()
    assert len(members) == 1
    assert members[0]["student_email"] == "teststudent_cls@example.com"

    # 7. Student leaves class
    res_leave = client.delete(f"/api/classes/{class_id}/leave", headers={"Authorization": f"Bearer {s_token}"})
    assert res_leave.status_code == 200

    # Verify student joined classes is now empty
    res_after = client.get("/api/classes/student", headers={"Authorization": f"Bearer {s_token}"})
    assert len(res_after.json()) == 0
