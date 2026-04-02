# Pathwise

Pathwise is an AI-powered learning path generator built with LangGraph. Given a topic and your available weekly hours, it creates a personalized study plan — from assessing your level to recommending resources and scheduling your weeks.

## How It Works

Pathwise runs a multi-agent pipeline where each agent handles one responsibility:

```
Level Agent → Roadmap Agent → Resource Agent → Weekly Plan Agent → Progress Agent
                  ↑                                                       |
                  └───────────────── (if plan needs update) ─────────────┘
```

| Agent | What it does |
|---|---|
| **Level Agent** | Assesses your current level (beginner / intermediate / advanced) |
| **Roadmap Agent** | Builds a step-by-step learning roadmap for your level |
| **Resource Agent** | Recommends 2 resources per roadmap step |
| **Weekly Plan Agent** | Distributes steps across weeks based on your available hours |
| **Progress Agent** | Evaluates progress and decides if the plan needs updating |

## Tech Stack

- [LangGraph](https://github.com/langchain-ai/langgraph) — agent orchestration
- [LangChain](https://github.com/langchain-ai/langchain) — LLM interface
- [OpenAI GPT-4o mini](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/) — language model

## Getting Started

**1. Clone the repo**
```bash
git clone https://github.com/KOCCENG/pathwise.git
cd pathwise
```

**2. Install dependencies**
```bash
pip install langchain langchain-openai langgraph python-dotenv
```

**3. Set up your API key**
```bash
cp .env.example .env
# Add your OpenAI API key to .env
```

**4. Run**
```bash
python main.py
```

## Demo

> Coming soon.

## Project Structure

```
pathwise/
├── state.py       # Shared state definition (LearnPathState)
├── agents.py      # All agent functions
├── graph.py       # LangGraph graph construction
└── main.py        # Entry point
```

## License

MIT
