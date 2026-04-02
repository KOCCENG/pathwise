from langgraph.graph import StateGraph, END

from core.state import LearnPathState
from core.agents import (
    level_agent,
    roadmap_agent,
    resource_agent,
    weekly_plan_agent,
    progress_agent,
)


# ──────────────────────────────────────────────────────────────
# Conditional edge decision function
#
# Belongs in graph.py, not agents.py.
# Agents don't decide where to go next — the graph does.
# ──────────────────────────────────────────────────────────────

def should_update_plan(state: LearnPathState) -> str:
    """
    Decides where to route after the Progress Agent.
    The returned string is matched against the conditional edge map below.
    """
    if state.get("should_update", False):
        return "update"   # → loop back to roadmap_agent
    return "finish"       # → END


# ──────────────────────────────────────────────────────────────
# Graph construction
# ──────────────────────────────────────────────────────────────

builder = StateGraph(LearnPathState)

# 1. Register nodes
builder.add_node("level_agent",       level_agent)
builder.add_node("roadmap_agent",     roadmap_agent)
builder.add_node("resource_agent",    resource_agent)
builder.add_node("weekly_plan_agent", weekly_plan_agent)
builder.add_node("progress_agent",    progress_agent)

# 2. Entry point
builder.set_entry_point("level_agent")

# 3. Normal edges — always proceed in this direction
builder.add_edge("level_agent",       "roadmap_agent")
builder.add_edge("roadmap_agent",     "resource_agent")
builder.add_edge("resource_agent",    "weekly_plan_agent")
builder.add_edge("weekly_plan_agent", "progress_agent")

# 4. Conditional edge — decide after progress_agent
builder.add_conditional_edges(
    "progress_agent",
    should_update_plan,
    {
        "update": "roadmap_agent",
        "finish": END,
    },
)

# 5. Compile — graph is immutable after this point
graph = builder.compile()
