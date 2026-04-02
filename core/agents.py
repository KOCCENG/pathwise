from core.state import LearnPathState
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import json

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# ──────────────────────────────────────────────────────────────
# Every function follows the same contract:
#   - Receives state: LearnPathState
#   - Returns only the fields it modifies as a dict
#   - Remaining fields are untouched; LangGraph merges them
# ──────────────────────────────────────────────────────────────


def assessment_agent(topic: str) -> dict:
    """
    Detects the language of the topic and generates 4 diagnostic questions.
    Called directly from the /assess endpoint, not part of the plan graph.
    Returns { questions, language }.
    """
    print(f"\n[Assessment Agent] Generating questions for: '{topic}'")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an educational advisor. "
            "First detect the language of the topic the user provided. "
            "Then generate diagnostic questions in that same language. "
            "Return only JSON, nothing else."
        )),
        ("human", """
Topic: {topic}

1. Detect the language of the topic above (e.g. "Turkish", "English", "Spanish").
2. Generate 4 questions in that language to assess the learner's level (beginner / intermediate / advanced).
   Questions should range from basic to advanced.

Return JSON in this format:
{{
  "language": "detected language name in English",
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4"
  ]
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({"topic": topic})
    result = json.loads(response.content)
    return {"questions": result["questions"], "language": result["language"]}


def level_agent(state: LearnPathState) -> dict:
    """Determines the learner's level based on their assessment answers and goal."""
    print(f"\n[Level Agent] Evaluating answers for: '{state['topic']}' ({state['language']})")

    questions_and_answers = "\n".join(
        f"Q: {q}\nA: {a}"
        for q, a in zip(state["assessment_questions"], state["assessment_answers"])
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an educational advisor. "
            "Determine the learner's level based on their answers. "
            "Respond entirely in {language}. "
            "Return only JSON, nothing else."
        )),
        ("human", """
Topic: {topic}
Learner's goal: {goal}

Assessment Q&A:
{qa}

Return JSON in this format:
{{
  "level": "beginner or intermediate or advanced",
  "reasoning": "One sentence explaining why this level was chosen"
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "topic": state["topic"],
        "goal": state["goal"],
        "qa": questions_and_answers,
        "language": state["language"],
    })
    result = json.loads(response.content)

    return {"level": result["level"]}


def roadmap_agent(state: LearnPathState) -> dict:
    print(f"\n[Roadmap Agent] Level: {state['level']} | Goal: {state['goal']}")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an education expert. "
            "Create a focused learning roadmap. "
            "Respond entirely in {language}. "
            "Return only JSON, nothing else."
        )),
        ("human", """
Topic: {topic}
Level: {level}
Goal: {goal}
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
        "goal": state["goal"],
        "weekly_hours": state["weekly_hours"],
        "language": state["language"],
    })
    result = json.loads(response.content)

    return {"roadmap": result["roadmap"]}


def resource_agent(state: LearnPathState) -> dict:
    print(f"\n[Resource Agent] Finding resources for {len(state['roadmap'])} steps...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a learning resources expert. "
            "Recommend resources for each topic. "
            "Respond entirely in {language}. "
            "Return only JSON, nothing else."
        )),
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
        "language": state["language"],
    })
    result = json.loads(response.content)

    return {"resources": result["resources"]}


def weekly_plan_agent(state: LearnPathState) -> dict:
    print(f"\n[Weekly Plan Agent] Building plan for {state['weekly_hours']} hours/week...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a study planning expert. "
            "Create a weekly study plan. "
            "Respond entirely in {language}. "
            "Return only JSON, nothing else."
        )),
        ("human", """
Topic: {topic}
Level: {level}
Goal: {goal}
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
        "goal": state["goal"],
        "weekly_hours": state["weekly_hours"],
        "roadmap": "\n".join(state["roadmap"]),
        "language": state["language"],
    })
    result = json.loads(response.content)

    return {"weekly_plan": result["weekly_plan"]}


def milestone_agent(topic: str, weeks: int, language: str) -> list[dict]:
    """
    Generates a visual roadmap as a list of milestones.
    Called directly from /api/roadmap — not part of the plan graph.
    """
    print(f"\n[Milestone Agent] Topic: '{topic}' | Weeks: {weeks} | Lang: {language}")

    count = max(4, min(8, weeks // 2))

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an education expert. "
            "Create a structured learning roadmap with milestones. "
            "Respond entirely in {language}. "
            "Return only JSON, nothing else."
        )),
        ("human", """
Topic: {topic}
Total weeks: {weeks}
Number of milestones: {count}

Divide the learning journey into exactly {count} milestones.
Distribute weeks evenly across milestones.

Return JSON in this format:
{{
  "milestones": [
    {{
      "id": 0,
      "label": "short milestone title",
      "period": "Week 1-2",
      "items": ["sub-topic 1", "sub-topic 2", "sub-topic 3"]
    }}
  ]
}}
""")
    ])

    chain = prompt | llm
    response = chain.invoke({
        "topic": topic,
        "weeks": weeks,
        "count": count,
        "language": language,
    })
    result = json.loads(response.content)
    return result["milestones"]


def progress_agent(state: LearnPathState) -> dict:
    """
    Evaluates progress and decides whether the plan needs to be updated.
    In real usage this would collect user input — currently returns a fixed response.
    """
    print(f"\n[Progress Agent] Evaluating plan...")

    return {
        "progress_notes": ["Plan generated successfully."],
        "should_update": False,
    }
