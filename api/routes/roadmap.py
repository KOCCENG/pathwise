from fastapi import APIRouter
from pydantic import BaseModel

from core.agents import assessment_agent, milestone_agent

router = APIRouter()


class RoadmapRequest(BaseModel):
    topic: str
    weeks: int = 8


class MilestoneItem(BaseModel):
    id: int
    label: str
    period: str
    completed: bool
    items: list[str]


class RoadmapResponse(BaseModel):
    topic: str
    milestones: list[MilestoneItem]


@router.post("/roadmap", response_model=RoadmapResponse)
async def generate_roadmap(body: RoadmapRequest):
    # Detect language from topic
    assess = assessment_agent(body.topic)
    language = assess["language"]

    milestones = milestone_agent(body.topic, body.weeks, language)

    # Ensure completed=False on all milestones
    for m in milestones:
        m.setdefault("completed", False)

    return RoadmapResponse(topic=body.topic, milestones=milestones)
