from typing import TypedDict, Annotated
from operator import add


class LearnPathState(TypedDict):

    # Provided by the user — no agent modifies these
    topic: str
    weekly_hours: int

    # Written by Level Agent
    level: str
    assessment_qa: list[str]

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
