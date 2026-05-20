# Nihon AI — Backend

FastAPI service: JLPT classifier inference, level-aware tutor (RAG + Claude), auto-mining, progress.

## Layout

```
app/
├── main.py        # FastAPI app + router wiring
├── api/           # HTTP routers: classify, tutor, mining, progress
├── core/          # config / settings
├── services/      # business logic (classifier, learner model, mining, tutor)
├── models/        # pydantic schemas + SQLAlchemy models
└── db/            # database session & setup
```

## Dev

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/docs`.
