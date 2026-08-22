from __future__ import annotations


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register_user(client, *, email: str, full_name: str, password: str, role: str) -> dict[str, object]:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": full_name, "password": password, "role": role},
    )
    assert response.status_code == 201
    return response.json()


def login_user(client, *, email: str, password: str) -> dict[str, object]:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()


def test_auth_still_works(client):
    payload = register_user(
        client,
        email="auth-teacher@example.com",
        full_name="Auth Teacher",
        password="Password123!",
        role="teacher",
    )
    login_payload = login_user(client, email="auth-teacher@example.com", password="Password123!")

    me = client.get("/api/auth/me", headers=auth_headers(login_payload["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == payload["user"]["email"]


def test_teacher_can_crud_curriculum(client):
    teacher = register_user(
        client,
        email="curriculum-teacher@example.com",
        full_name="Curriculum Teacher",
        password="Password123!",
        role="teacher",
    )
    headers = auth_headers(teacher["access_token"])

    department = client.post(
        "/api/curriculum/departments",
        headers=headers,
        json={"name": "AIDS", "code": "AIDS", "description": "Artificial Intelligence and Data Science"},
    )
    assert department.status_code == 201
    department_id = department.json()["id"]

    semester = client.post(
        "/api/curriculum/semesters",
        headers=headers,
        json={"department_id": department_id, "number": 6, "name": "Semester 6"},
    )
    assert semester.status_code == 201
    semester_id = semester.json()["id"]

    subject = client.post(
        "/api/curriculum/subjects",
        headers=headers,
        json={"semester_id": semester_id, "name": "Web Technology", "code": "WT"},
    )
    assert subject.status_code == 201
    subject_id = subject.json()["id"]

    unit = client.post(
        "/api/curriculum/units",
        headers=headers,
        json={"subject_id": subject_id, "name": "React Fundamentals", "order_index": 1},
    )
    assert unit.status_code == 201
    unit_id = unit.json()["id"]

    topic = client.post(
        "/api/curriculum/topics",
        headers=headers,
        json={"unit_id": unit_id, "name": "React Components", "order_index": 1},
    )
    assert topic.status_code == 201
    topic_id = topic.json()["id"]

    objective = client.post(
        "/api/curriculum/learning-objectives",
        headers=headers,
        json={"topic_id": topic_id, "name": "Understand React component architecture", "order_index": 1},
    )
    assert objective.status_code == 201

    updated_topic = client.patch(
        f"/api/curriculum/topics/{topic_id}",
        headers=headers,
        json={"name": "React Components Updated"},
    )
    assert updated_topic.status_code == 200
    assert updated_topic.json()["name"] == "React Components Updated"

    tree = client.get("/api/curriculum/tree", headers=headers)
    assert tree.status_code == 200
    curriculum = tree.json()["departments"][0]
    assert curriculum["name"] == "AIDS"
    assert curriculum["semesters"][0]["subjects"][0]["units"][0]["topics"][0]["learning_objectives"][0]["name"] == "Understand React component architecture"

    deleted_topic = client.delete(f"/api/curriculum/topics/{topic_id}", headers=headers)
    assert deleted_topic.status_code == 204


def test_student_can_view_curriculum_but_not_modify(client):
    teacher = register_user(
        client,
        email="curriculum-teacher-2@example.com",
        full_name="Curriculum Teacher 2",
        password="Password123!",
        role="teacher",
    )
    teacher_headers = auth_headers(teacher["access_token"])
    department = client.post(
        "/api/curriculum/departments",
        headers=teacher_headers,
        json={"name": "CSE", "code": "CSE"},
    )
    assert department.status_code == 201

    student = register_user(
        client,
        email="curriculum-student@example.com",
        full_name="Curriculum Student",
        password="Password123!",
        role="student",
    )
    student_headers = auth_headers(student["access_token"])

    view_response = client.get("/api/curriculum/departments", headers=student_headers)
    assert view_response.status_code == 200
    assert view_response.json()[0]["name"] == "CSE"

    forbidden = client.post(
        "/api/curriculum/departments",
        headers=student_headers,
        json={"name": "Should Fail"},
    )
    assert forbidden.status_code == 403


def test_unauthenticated_access_is_denied(client):
    response = client.get("/api/curriculum/departments")
    assert response.status_code == 401


def test_invalid_foreign_keys_and_validation_errors(client):
    teacher = register_user(
        client,
        email="curriculum-teacher-3@example.com",
        full_name="Curriculum Teacher 3",
        password="Password123!",
        role="teacher",
    )
    headers = auth_headers(teacher["access_token"])

    invalid_semester = client.post(
        "/api/curriculum/semesters",
        headers=headers,
        json={"department_id": 9999, "number": 1, "name": "Invalid Semester"},
    )
    assert invalid_semester.status_code == 404

    invalid_department = client.post(
        "/api/curriculum/departments",
        headers=headers,
        json={"name": ""},
    )
    assert invalid_department.status_code == 422
