# Architecture

Nihon AI is a monorepo with three independently deployable units.

```
nihon_ai/
├── backend/     FastAPI — vocab-difficulty serving, tutor, mining, progress
├── ml/          Data ETL + research (weak-label dataset; JLPT fine-tune on the roadmap)
├── frontend/    Next.js — Reader, AI Tutor, Mining Queue
└── docs/        Architecture & design notes
```

## Why three units

- **`ml/`** has a research lifecycle: build dataset (ETL + weak labeling) → EDA decisions →
  evaluate. v1 ships the weak-label vocab-difficulty pipeline; a fine-tuned BERT artifact
  published to the HuggingFace Hub is on the roadmap.
- **`backend/`** has a serving lifecycle: it *consumes* the vocab-difficulty estimator and holds
  the application logic (learner model, mining, RAG tutor). Different dependencies, different deploy.
- **`frontend/`** is the user-facing app, deployed independently (Vercel).

## Request flow

```
Next.js frontend
      │  HTTP / JSON
      ▼
FastAPI backend
   /classify   → vocab-difficulty estimator (weak-label labeling fn; OOV-gated, N5–N1)
   /tutor      → ChromaDB retrieval + Claude API, constrained by learner known-set
   /mining     → 1T-sentence selection ranked by corpus frequency
   /progress   → reading stats from SQLite
```

## Data stores

- **SQLite** — learner model (known-set), reading history, progress.
- **ChromaDB** — sentence embeddings (`multilingual-e5`) for the RAG tutor.

## Deployment targets

- Backend → Railway (vocab-difficulty runs in-process; no GPU)
- Frontend → Vercel
- Fine-tuned model → HuggingFace Spaces / Hub _(roadmap, once the BERT fine-tune lands)_
