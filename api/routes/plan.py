from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.graph import graph
from api.routes.assess import sessions

router = APIRouter()


class PlanRequest(BaseModel):
    session_id: str
    answers: list[str]
    goal: str
    weekly_hours: int


class WeeklyPlanItem(BaseModel):
    week: int
    topics: list[str]
    hours: int


class PlanResponse(BaseModel):
    level: str
    roadmap: list[str]
    resources: dict[str, list[str]]
    weekly_plan: list[WeeklyPlanItem]


@router.post("/plan", response_model=PlanResponse)
async def plan(body: PlanRequest):
    session = sessions.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if len(body.answers) != len(session["questions"]):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(session['questions'])} answers, got {len(body.answers)}"
        )

    result = graph.invoke({
        "topic": session["topic"],
        "goal": body.goal,
        "weekly_hours": body.weekly_hours,
        "language": session["language"],
        "assessment_questions": session["questions"],
        "assessment_answers": body.answers,
    })

    return PlanResponse(
        level=result["level"],
        roadmap=result["roadmap"],
        resources=result["resources"],
        weekly_plan=result["weekly_plan"],
    )
