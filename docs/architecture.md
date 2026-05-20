# Architecture

Nihon AI is a monorepo with three independently deployable units.

```
nihon_ai/
├── backend/     FastAPI — classifier serving, tutor, mining, progress
├── ml/          Model training & research (JLPT classifier fine-tuning)
├── frontend/    Next.js — Reader, AI Tutor, Mining Queue, Dashboard
└── docs/        Architecture & design notes
```

## Why three units

- **`ml/`** has a research lifecycle: build dataset → fine-tune → evaluate. It produces a
  model artifact published to the HuggingFace Hub.
- **`backend/`** has a serving lifecycle: it *consumes* that model for inference and holds the
  application logic (learner model, mining, RAG tutor). Different dependencies, different deploy.
- **`frontend/`** is the user-facing app, deployed independently (Vercel).

## Request flow

```
Next.js frontend
      │  HTTP / JSON
      ▼
FastAPI backend
   /classify   → BERT JLPT classifier (HF model)
   /tutor      → ChromaDB retrieval + Claude API, constrained by learner known-set
   /mining     → 1T-sentence selection ranked by corpus frequency
   /progress   → reading stats from SQLite
```

## Data stores

- **SQLite** — learner model (known-set), reading history, progress.
- **ChromaDB** — sentence embeddings (`multilingual-e5`) for the RAG tutor.

## Deployment targets

- Model → HuggingFace Spaces / Hub
- Backend → Railway
- Frontend → Vercel
