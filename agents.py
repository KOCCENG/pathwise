from state import LearnPathState
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import json
import os

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ──────────────────────────────────────────────────────────────
# Every function follows the same contract:
#   - Receives state: LearnPathState
#   - Returns only the fields it modifies as a dict
#   - Remaining fields are untouched; LangGraph merges them
# ──────────────────────────────────────────────────────────────


def level_agent(state: LearnPathState) -> dict:
    print(f"\n[Level Agent] Topic: '{state['topic']}' | Weekly hours: {state['weekly_hours']}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an educational advisor. Determine the user's level and return only JSON, nothing else."),
        ("human", """
Topic: {topic}
Weekly hours: {weekly_hours}

Return JSON in this format:
{{
  "level": "beginner or intermediate or advanced",
  "assessment_qa": [
    "Question 1 → Answer 1",
    "Question 2 → Answer 2",
    "Question 3 → Answer 3"
  ]
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({"topic": state["topic"], "weekly_hours": state["weekly_hours"]})
    result = json.loads(response.content)

    return {
        "level": result["level"],
        "assessment_qa": result["assessment_qa"],
    }


def roadmap_agent(state: LearnPathState) -> dict:
    print(f"\n[Roadmap Agent] Level: {state['level']}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an education expert. Create a learning roadmap and return only JSON, nothing else."),
        ("human", """
Topic: {topic}
Level: {level}
Weekly hours: {weekly_hours}

Return JSON in this format:
{{
  "roadmap": [
    "1. Step title",
    "2. Step title",
    "3. Step title"
  ]
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "topic": state["topic"],
        "level": state["level"],
        "weekly_hours": state["weekly_hours"],
    })
    result = json.loads(response.content)

    return {"roadmap": result["roadmap"]}


def resource_agent(state: LearnPathState) -> dict:
    print(f"\n[Resource Agent] Finding resources for {len(state['roadmap'])} steps...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a learning resources expert. Recommend resources for each topic and return only JSON, nothing else."),
        ("human", """
Topic: {topic}
Level: {level}
Roadmap steps:
{roadmap}

Suggest 2 resources per step (books, documentation, videos, or articles).
Return JSON in this format:
{{
  "resources": {{
    "step name": ["resource 1", "resource 2"],
    "step name": ["resource 1", "resource 2"]
  }}
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "topic": state["topic"],
        "level": state["level"],
        "roadmap": "\n".join(state["roadmap"]),
    })
    result = json.loads(response.content)

    return {"resources": result["resources"]}


def weekly_plan_agent(state: LearnPathState) -> dict:
    print(f"\n[Weekly Plan Agent] Building plan for {state['weekly_hours']} hours/week...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a study planning expert. Create a weekly study plan and return only JSON, nothing else."),
        ("human", """
Topic: {topic}
Level: {level}
Weekly hours: {weekly_hours}
Roadmap steps:
{roadmap}

Distribute the roadmap steps across weeks. Multiple steps can fit in one week depending on available hours.
Return JSON in this format:
{{
  "weekly_plan": [
    {{
      "week": 1,
      "topics": ["step 1", "step 2"],
      "hours": 5
    }}
  ]
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "topic": state["topic"],
        "level": state["level"],
        "weekly_hours": state["weekly_hours"],
        "roadmap": "\n".join(state["roadmap"]),
    })
    result = json.loads(response.content)

    return {"weekly_plan": result["weekly_plan"]}


def progress_agent(state: LearnPathState) -> dict:
    """
    Evaluates progress and decides whether the plan needs to be updated.
    In real usage this would collect user input — currently returns a fixed response.
    """
    print(f"\n[Progress Agent] Evaluating plan...")

    return {
        "progress_notes": ["Skeleton ran successfully. Next step: connect LLM feedback loop."],
        "should_update": False,
    }
