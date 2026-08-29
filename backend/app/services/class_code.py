import secrets
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.classroom import Classroom

CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_class_code(db: Session, length: int = 6) -> str:
    """
    Generates a unique 6-character uppercase alphanumeric class code.
    Ensures collision avoidance by checking against existing codes in the database.
    """
    for _ in range(100):
        code = "".join(secrets.choice(CODE_CHARSET) for _ in range(length))
        existing = db.execute(select(Classroom).where(Classroom.code == code)).scalars().first()
        if not existing:
            return code
    raise RuntimeError("Failed to generate a unique class code after 100 attempts.")
