from typing import TypedDict, Annotated
from operator import add


class LearnPathState(TypedDict):

    # Provided by the user
    topic: str
    goal: str
    weekly_hours: int
    language: str  # detected from topic input, e.g. "Turkish", "English"

    # Assessment
    assessment_questions: list[str]
    assessment_answers: list[str]

    # Written by Level Agent
    level: str

    # Written by Roadmap Agent
    roadmap: list[str]

    # Written by Resource Agent
    resources: dict[str, list[str]]

    # Written by Weekly Plan Agent
    weekly_plan: list[dict]

    # Written by Progress Agent
    # Annotated[..., add] → appends instead of overwriting
    progress_notes: Annotated[list[str], add]
    should_update: bool
