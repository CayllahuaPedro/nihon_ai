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
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
pytest
```

API docs at `http://localhost:8000/docs`.

## The tutor

`POST /tutor` answers a reading question as a **server-sent stream of answer
blocks**, not as one JSON body:

```
event: block
data: {"kind": "prose", "text": "〜ていく adds direction…"}

event: block
data: {"kind": "example", "japanese": "色が消えていった", "gloss": "kept fading"}

event: done
data: {}
```

A *block* is the unit the reader renders, so streaming at that granularity
means each piece of the answer lands whole — an explanation, then the grammar
shown working in a quoted sentence, then the next explanation. Claude is asked
for JSON Lines and `app/services/tutor.py` reassembles them across chunk
boundaries, since a stream cuts wherever it likes, including mid-line.

Malformed lines are dropped rather than rendered broken. If *nothing* parses,
the raw text is returned as a single prose block — a formatted answer is
preferable, but an unformatted one still beats showing the learner nothing.

**Level awareness is the point.** The request carries the learner's JLPT level
and known-word count, and the system prompt pins the answer to grammar at or
below that level. That is what separates this from forwarding the question to a
general chat model.

### Model

`TUTOR_MODEL` picks the model, defaulting to `claude-sonnet-5` — short answers
pinned to one JLPT level don't need the Opus tier, and Sonnet is roughly 2.5x
cheaper per token. It is read per request rather than captured at import, so
changing it is a setting, not an edit.

### Failure modes

| Situation | Response |
| --------- | -------- |
| `ANTHROPIC_API_KEY` unset | `503` with an actionable message |
| Empty or oversized question | `422` from schema validation |
| Upstream fails mid-stream | `event: error` inside the stream — the status line is already sent |

An upstream error message can carry credentials, so it is logged server-side
and never forwarded to the client.
