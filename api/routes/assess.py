from fastapi import APIRouter
from pydantic import BaseModel
import uuid

from core.agents import assessment_agent

router = APIRouter()

# In-memory session store — replace with Redis/DB in production
sessions: dict[str, dict] = {}


class AssessRequest(BaseModel):
    topic: str


class AssessResponse(BaseModel):
    session_id: str
    questions: list[str]
    language: str


@router.post("/assess", response_model=AssessResponse)
async def assess(body: AssessRequest):
    result = assessment_agent(body.topic)

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "topic": body.topic,
        "questions": result["questions"],
        "language": result["language"],
    }

    return AssessResponse(
        session_id=session_id,
        questions=result["questions"],
        language=result["language"],
    )
