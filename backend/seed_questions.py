import asyncio
import sys
from sqlalchemy import select
from app.db.database import get_session_factory, init_db
from app.models.assessment import DiagnosticQuestion
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_QUESTIONS = [
    # Numerical Calculation
    {
        "text": "What is the next number in the sequence: 3, 6, 12, 24, ?",
        "options": ["30", "36", "48", "60"],
        "correct_answer": "48",
        "explanation": "Each number is multiplied by 2 to get the next number.",
        "skill_category": "Numerical Calculation",
        "difficulty": "Medium",
    },
    {
        "text": "If a train travels 60 miles in 1.5 hours, what is its average speed in miles per hour?",
        "options": ["30", "40", "45", "50"],
        "correct_answer": "40",
        "explanation": "Speed = Distance / Time = 60 / 1.5 = 40 mph.",
        "skill_category": "Numerical Calculation",
        "difficulty": "Easy",
    },
    # Abstract Thinking
    {
        "text": "Which word does NOT belong with the others?",
        "options": ["Apple", "Banana", "Carrot", "Orange"],
        "correct_answer": "Carrot",
        "explanation": "A carrot is a vegetable, while the others are fruits.",
        "skill_category": "Abstract Thinking",
        "difficulty": "Easy",
    },
    {
        "text": "If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies.",
        "options": ["True", "False", "Cannot be determined"],
        "correct_answer": "True",
        "explanation": "This follows the transitive property of logic.",
        "skill_category": "Abstract Thinking",
        "difficulty": "Medium",
    },
    # Logical Reasoning
    {
        "text": "If it is raining, the grass is wet. The grass is wet. Therefore, it is raining.",
        "options": ["True", "False"],
        "correct_answer": "False",
        "explanation": "This is a logical fallacy (affirming the consequent); the grass could be wet for other reasons (e.g., sprinklers).",
        "skill_category": "Logical Reasoning",
        "difficulty": "Hard",
    },
    {
        "text": "If A > B and B > C, which of the following must be true?",
        "options": ["A < C", "A = C", "A > C", "B < C"],
        "correct_answer": "A > C",
        "explanation": "By the transitive property of inequality, if A is greater than B and B is greater than C, A must be greater than C.",
        "skill_category": "Logical Reasoning",
        "difficulty": "Easy",
    },
    # Association/Analogy
    {
        "text": "Odometer is to mileage as compass is to:",
        "options": ["Speed", "Hiking", "Needle", "Direction"],
        "correct_answer": "Direction",
        "explanation": "An odometer measures mileage; a compass determines direction.",
        "skill_category": "Association/Analogy",
        "difficulty": "Medium",
    },
    {
        "text": "Window is to pane as book is to:",
        "options": ["Novel", "Glass", "Cover", "Page"],
        "correct_answer": "Page",
        "explanation": "A window is made of panes; a book is made of pages.",
        "skill_category": "Association/Analogy",
        "difficulty": "Easy",
    },
    # Spatial Imagination
    {
        "text": "If you fold a standard piece of paper in half 3 times, how many rectangles are formed by the crease lines when you unfold it?",
        "options": ["4", "6", "8", "16"],
        "correct_answer": "8",
        "explanation": "Folding in half once creates 2 sections. Twice creates 4. Three times creates 8.",
        "skill_category": "Spatial Imagination",
        "difficulty": "Medium",
    },
    {
        "text": "Imagine a cube. If you paint the outside of the cube blue, and then cut it into 27 smaller equal cubes (3x3x3), how many of the smaller cubes have exactly one side painted blue?",
        "options": ["4", "6", "8", "12"],
        "correct_answer": "6",
        "explanation": "Only the center cube on each of the 6 faces of the original cube will have exactly one side painted blue.",
        "skill_category": "Spatial Imagination",
        "difficulty": "Hard",
    }
]

async def seed():
    await init_db()
    session_factory = get_session_factory()
    if not session_factory:
        logger.error("Database not configured.")
        sys.exit(1)

    with session_factory() as session:
        # Check if we already have questions
        existing_count = session.execute(select(DiagnosticQuestion)).scalars().all()
        if existing_count:
            logger.info(f"Database already contains {len(existing_count)} questions. Skipping seed.")
            return

        for q_data in SEED_QUESTIONS:
            question = DiagnosticQuestion(
                text=q_data["text"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                explanation=q_data["explanation"],
                skill_category=q_data["skill_category"],
                difficulty=q_data["difficulty"],
                is_active=True
            )
            session.add(question)
        
        session.commit()
        logger.info(f"Successfully seeded {len(SEED_QUESTIONS)} diagnostic questions.")

if __name__ == "__main__":
    asyncio.run(seed())
