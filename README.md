# 🇯🇵 Nihon AI

**Comprehensible-input Japanese learning that models _you_, not just the text.**

> Every Japanese learning tool treats difficulty as a property of the text — "this article is N3."
> It isn't. Difficulty is a function of **the learner × the text**.
> Nihon AI models the learner first, then uses that model to decide what you read, what is worth
> mining, and how the AI tutor explains things to you.

![status](https://img.shields.io/badge/status-active%20development%20%C2%B7%20phase%200-orange)
![python](https://img.shields.io/badge/python-3.11%2B-blue)
![next.js](https://img.shields.io/badge/Next.js-15-black)
![license](https://img.shields.io/badge/license-AGPL--3.0-green)

---

## Status

This README describes **what the code does today**, not what the project intends to become.
That distinction is the whole point of the table below: the tutor and the difficulty estimator are
implemented and tested; the retrieval layer, the learner-model store, and three of the four API
routes are not.

| Area | State |
| --- | --- |
| Level-aware tutor — `POST /tutor`, streamed over SSE | **Working** (needs `ANTHROPIC_API_KEY`) |
| Vocabulary-difficulty estimator — weak supervision + abstention | **Working** (Phase 0, CPU-only) |
| Reader UI — tokenization, furigana modes, word states, popups | **Working** (fixture passage) |
| Discover UI — shelves, comprehension dial | **Working** (fixture data) |
| `POST /classify` | **Stub** — returns `{"detail": "not implemented"}` |
| `GET /mining/queue` | **Stub** |
| `GET /progress` | **Stub** |
| Retrieval / embeddings (ChromaDB) | **Not built** — dependency declared, no retrieval code |
| Learner-model persistence (SQLite) | **Not built** — `DATABASE_URL` is wired, nothing reads it |
| Fine-tuned JLPT BERT | Roadmap — see [Roadmap](#roadmap) |
| CI, Docker, deployment | **Not set up** |

144 tests pass across the three units (`53` backend, `25` ML, `66` frontend).

---

## What works today

### 1. Level-aware tutor

`POST /tutor` streams an answer as server-sent events. The model is asked for JSON Lines — one
object per line — so each block can announce itself and stream its prose while the rest of the
object is still being written:

```
BlockStart(kind="prose") → BlockDelta("It adds") → BlockDelta(" direction.") → BlockEnd(block)
```

The interesting part is what happens when the model misbehaves. Validation and streaming pull
against each other — half an object cannot be validated — so they are **separated in time instead
of traded off**. Deltas are unvalidated text, shown immediately and explicitly not trusted.
`BlockEnd` carries the block only after the full line parsed and passed the Pydantic schema. A
block that opened and then failed is withdrawn with `BlockDrop`, so nothing half-formed stays on
screen. Deltas are text to show; the `end` is the authority.

Japanese is deliberately **not** streamed: a sentence reads as a unit, and watching
`色が消えていった` assemble itself character by character helps nobody read it.

- `backend/app/services/tutor.py` — the event stream
- `backend/app/services/partial_json.py` — incremental string decoding
- `backend/app/models/tutor.py` — the contract the model's output is held to
- `backend/app/api/tutor.py` — SSE framing, plus `X-Accel-Buffering: no` so proxies don't buffer
  the stream into one blob

The learner's level and known-word count are injected into the prompt
(`backend/app/services/tutor.py:88`), which is what makes the answers level-pinned. This is
**prompt-level constraint, not retrieval** — see [Status](#status).

### 2. Vocabulary-difficulty estimator

Weak supervision over public JLPT vocab/kanji lists. Three numbers are computed and **never
fused**: an OOV rate that gates whether the sentence is inside the JLPT frame at all, a
content-word count that gates whether it is long enough to judge, and — only if both gates pass —
a level from cumulative coverage over the in-frame tokens.

When either gate fails the labeler returns `ABSTAIN` (`-1`) instead of the nearest level. A model
that guesses is worse than a model that says "this sentence is outside what I can judge", because
the guess is indistinguishable from a real answer downstream. `LabelResult` stores the
ingredients and `weak_label()` is a pure function of them, so a threshold can be re-decided
without re-tokenizing the corpus.

The gate itself was re-decided once: a flat corpus-wide abstention rate averaged two different
refusals (high-OOV text vs. sentences too short to judge), so the criterion became
"≤ 20% refusal on judgeable-length sentences (`n_content >= 3`)" — see
`docs/superpowers/specs/2026-08-03-short-sentence-gate-design.md`.

- `ml/nihon_ml/tokenize.py` — `fugashi` + UniDic tokenization, OOV frame classification
- `ml/nihon_ml/jlpt/labeling.py` — the gates and the abstention
- `ml/nihon_ml/jlpt/spotcheck.py` — scorer for the hand-labelled spot-check set
- `ml/scripts/` — fetch lists → build dataset → blind labelling → score

### 3. Reader and Discover

Both render from fixtures today; the UI logic underneath is real and tested.

The reader tokenizes a passage into segments (ruby where a reading exists), colors each token
against the learner model (`known` / `learning` / `selected`), and positions word popups against
the viewport instead of the page. Display settings persist per learner.

`frontend/src/features/{reader,tutor,discover}/` are self-contained features with an explicit
public surface (`index.ts`) — and **`dependency-cruiser` enforces the boundaries** in CI-less
form via `npm run check`. A feature cannot reach into another feature's internals and still pass.

The tutor UI talks to the real backend when `NEXT_PUBLIC_TUTOR_API` is set. Without it, it serves
canned answers — **and says so on screen** (`tutor-panel.tsx:44`) rather than failing silently,
because a demo that quietly lies about being live is the worst possible failure mode.

---

## Architecture

Three independently runnable units. Only the tutor crosses a process boundary today; the rest is
either stubbed or fixture-driven, and the diagram says which.

```
frontend (Next.js 15)
  Reader    ── fixture passage, real tokenization + popups
  Discover  ── fixture data, real shelf math
  Tutor     ── HTTP + SSE ──┐
                            │
backend (FastAPI)           ▼
  /tutor      live      ──► Anthropic Claude API  (level-pinned prompt)
  /classify   stub
  /mining     stub
  /progress   stub

ml (offline, CPU-only)
  fetch JLPT lists ──► tokenize ──► weak-label (OOV gate + length gate + ABSTAIN)
                                        │
                                        └──► spot-check: blind label ──► score
```

`backend/app/db/` and `CHROMA_PATH` exist as wiring for the learner model and retrieval; nothing
reads them yet. They are listed under [Status](#status) rather than drawn as if they ran.

---

## Run it

Prerequisites: Python 3.11+, Node 20+.

### Backend

```bash
cp .env.example backend/.env  # fill in ANTHROPIC_API_KEY (settings read backend/.env)
cd backend
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

`/tutor` returns **503** with an explicit message when `ANTHROPIC_API_KEY` is unset — it does not
pretend to work. `GET /health` is always available.

### ML pipeline

```bash
cd ml
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
```

The BERT fine-tune lives behind the optional `bert` extra and is not part of the default install,
so Phase 0 stays light and CPU-only.

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

To point the tutor at the backend, add `frontend/.env.local`:

```
NEXT_PUBLIC_TUTOR_API=http://localhost:8000
```

### Tests

```bash
cd backend  && .venv/bin/python -m pytest      # 53 tests
cd ml       && .venv/bin/python -m pytest      # 25 tests
cd frontend && npm run check                   # typecheck + arch lint + 66 tests
```

---

## Design decisions worth reading

- **Abstention over a guess.** The labeler refuses to label text outside the JLPT frame or too
  short to judge. `ml/nihon_ml/jlpt/labeling.py`
- **`end` is the authority.** Streamed deltas are for the eye; only a schema-validated block is
  rendered as fact. `backend/app/services/tutor.py`
- **Fail loudly, not silently.** Unset API key → 503 with a reason. Canned tutor answers → a
  visible label. `backend/app/api/tutor.py`, `frontend/src/features/tutor/components/tutor-panel.tsx`
- **Boundaries as executable rules.** Feature isolation is checked by `dependency-cruiser`, not by
  convention. `frontend/.dependency-cruiser.cjs`

---

## Roadmap

Not built. Listed so the gap between this repo and the product is explicit.

- **Retrieval for the tutor** — ChromaDB + `intfloat/multilingual-e5-base` embeddings over the
  passage, replacing today's direct prompt with grounded retrieval.
- **Learner model persistence** — known-set, reading history and progress in SQLite, behind the
  three stubbed routes.
- **Auto-mining engine** — surface 1T sentences (exactly one unknown word), ranked by corpus
  frequency, exportable to Anki.
- **Fine-tuned JLPT classifier** — `cl-tohoku/bert-base-japanese-v3` trained on the weak-labelled
  dataset, to generalize past the lookup teacher.
- **Grammar-point detector** — the second difficulty axis: which Genki/Bunpro points a sentence
  contains.
- **CI** — pytest + `npm run check` on every push.

---

## Why I built this

I've spent ~5 years learning Japanese through comprehensible input. The tools exist — Migaku,
Anki, Yomitan — but they all hand the hard decisions back to the learner: _what's at my level?
what's worth studying? what does this actually mean, in words I already know?_ Nihon AI is me
handing that problem to a model — the same problem I had myself.

---

## License

AGPL-3.0 — see [LICENSE](LICENSE). You're free to use, study and modify this code, but any
derivative — including a hosted/SaaS version — must be released under the same license.

**Built by Pedro Villanueva** · ML Engineer
