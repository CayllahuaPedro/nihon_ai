# Architecture

Three units in one repo, with three different lifecycles. This document describes what runs
today; anything planned is marked as planned.

## Current state

Only one path is live end to end: **frontend → `POST /tutor` → Anthropic**. Everything else is
either a stub that returns `not implemented`, or a UI rendering typed fixtures.

| Unit | Runs today | Not there yet |
| --- | --- | --- |
| `frontend/` | Reader, Tutor, Discover UI. Tutor is live over SSE when `NEXT_PUBLIC_TUTOR_API` is set; otherwise canned answers with a visible label | Any other endpoint to talk to |
| `backend/` | `POST /tutor` (SSE), `GET /health` | `/classify`, `/mining`, `/progress` |
| `ml/` | Tokenizer, weak-label ETL, spot-check labelling + scorer | The BERT fine-tune, the dataset sweep that picks final thresholds |

## Why three units

- **`ml/`** has a research lifecycle: fetch → tokenize → weak-label → decide thresholds → evaluate.
  It is CPU-only and offline; nothing in the request path imports it.
- **`backend/`** has a serving lifecycle: it holds the request logic and, eventually, consumes the
  estimator produced by `ml/`. Today it consumes nothing from `ml/` — `/classify` is a stub.
- **`frontend/`** is the user-facing app. Its features are self-contained and its boundaries are
  enforced by `dependency-cruiser` (`npm run check`), not by convention.

## Request flow

```
Next.js frontend
      │  HTTP + SSE (only path wired today)
      ▼
FastAPI backend
   /tutor      live      → Anthropic Claude API, prompt-pinned to the learner's JLPT level
   /classify   stub      → planned: weak-label estimator (OOV-gated, N5–N1, may abstain)
   /mining     stub      → planned: 1T-sentence selection ranked by corpus frequency
   /progress   stub      → planned: reading stats from SQLite
```

`/tutor` is **not** retrieval-augmented. The learner's level and known-word count are injected
into the system prompt (`app/services/tutor.py:88`). That is a prompt constraint, not a vector
search, and the distinction is worth stating plainly because the difference is visible in the
answers: the model can still use vocabulary above the stated level, it is just asked not to.

## Data stores

Both are wired in configuration and read by nothing.

- **SQLite** — `DATABASE_URL` is a setting; `app/db/__init__.py` is empty. Planned home for the
  learner model (known-set), reading history and progress.
- **ChromaDB** — `CHROMA_PATH` is a setting and `chromadb` is a declared dependency; there is no
  retrieval code. Planned home for `multilingual-e5` sentence embeddings.

## Declared dependencies that nothing imports

`backend/pyproject.toml` lists `chromadb`, `transformers`, `torch`, `fugashi` and `sqlalchemy`.
No module under `backend/app/` imports any of them. They are there for the roadmap, and they are
the main reason a clean install of the backend is slow. Trimming them to what the code actually
imports — `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `anthropic` — is a pending
cleanup, not a design decision.

## Deployment

**Not set up.** There is no `Dockerfile`, no CI workflow and no deploy configuration in the repo.
Any deployment claim elsewhere in this repository would be aspirational.

Planned targets, once the pieces above exist:

- Backend → a container host (the estimator would run in-process; no GPU needed for Phase 0).
- Frontend → a static/Node host with the backend URL injected at build time.
- Fine-tuned model → HuggingFace Hub, pulled at runtime _(roadmap, after the BERT fine-tune)_.
