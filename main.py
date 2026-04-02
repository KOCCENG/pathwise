from graph import graph


def main():
    print("=" * 55)
    print("  LearnPath AI")
    print("=" * 55)

    # Only the initial values are provided here.
    # All remaining fields will be filled in by the agents.
    result = graph.invoke({
        "topic": "LangGraph",
        "weekly_hours": 5,
    })

    print("\n" + "=" * 55)
    print("  RESULT")
    print("=" * 55)

    print(f"\nLevel: {result['level']}")

    print("\nAssessment Q&A:")
    for qa in result["assessment_qa"]:
        print(f"  - {qa}")

    print("\nRoadmap:")
    for item in result["roadmap"]:
        print(f"  {item}")

    print("\nWeekly Plan:")
    for week in result["weekly_plan"]:
        topics = ", ".join(week["topics"])
        print(f"  Week {week['week']}: {topics} — {week['hours']} hrs")

    print("\nProgress Notes:")
    for note in result["progress_notes"]:
        print(f"  - {note}")


if __name__ == "__main__":
    main()
