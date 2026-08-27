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

`POST /tutor` answers a reading question as a **server-sent stream of block
events**. A block announces itself, streams its prose as it is written, and
closes with the validated block:

```
event: start
data: {"type": "start", "index": 0, "kind": "prose"}

event: delta
data: {"type": "delta", "index": 0, "text": "It adds "}

event: end
data: {"type": "end", "index": 0, "block": {"kind": "prose", "text": "It adds direction."}}

event: done
data: {}
```

### Why start / delta / end

Streaming and validation pull against each other. `{"kind":"prose","text":"It ad`
is neither valid JSON nor a valid block — if you want to validate you must wait,
and if you want to stream you cannot have validated yet.

They are separated in time rather than traded off. A **delta** is unvalidated
text, safe to show and certain to be superseded. The **end** is the authority:
it carries the block only once the whole line parsed and passed the Pydantic
schema in `app/models/tutor.py`. A block that opened and then failed is
withdrawn with `event: drop`, so nothing half-formed is left on screen.

Pydantic is the schema, not a guarantee — it validates what arrived, it does not
oblige the model. The API's `output_config.format` *does* oblige, but it
guarantees one complete JSON object, and a complete object cannot be streamed.
JSON Lines plus per-line validation buys streaming at the cost of that
guarantee, and the `drop` event pays for the difference.

### Japanese is not streamed

`prose` streams token by token; `example` arrives whole. A Japanese sentence
reads as a unit, and watching 色が消えていった assemble itself one character at a
time helps nobody read it. `_STREAMED_FIELD` in `app/services/tutor.py` is the
one place that decides this.

### The sharp edge

A stream can stop at any byte, including halfway through `\u30`. Emitting that
as literal text would be wrong and unrecoverable, so
`app/services/partial_json.py` decodes only what is unambiguously complete and
reports how far it got; the remainder waits for the next chunk.

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
