# 🇯🇵 Nihon AI

**Comprehensible-input Japanese learning that models _you_, not just the text.**

> Every Japanese learning tool treats difficulty as a property of the text — "this article is N3."
> It isn't. Difficulty is a function of **the learner × the text**.
> Nihon AI models the learner first, then uses that model end-to-end: to decide what you
> read, what flashcards are worth making, and how an AI tutor explains things to you.

![status](https://img.shields.io/badge/status-in%20active%20development-orange)
![python](https://img.shields.io/badge/python-3.11-blue)
![next.js](https://img.shields.io/badge/Next.js-15-black)
![license](https://img.shields.io/badge/license-AGPL--3.0-green)

---

## Who this is for

**👩‍💻 If you're an engineer** — This is a full-stack ML _product_, not a notebook. A fine-tuned
Japanese BERT classifier, a retrieval-augmented LLM tutor, and a learner-personalization model,
wired into a FastAPI backend and a Next.js frontend, designed to be deployed and actually used.

**🧭 If you're hiring** — Skills demonstrated end-to-end:
`Python` · `FastAPI` · `Next.js / TypeScript` · `PyTorch` · `HuggingFace Transformers` ·
`model fine-tuning` · `NLP` · `text classification` · `RAG` · `embeddings` · `vector search (ChromaDB)` ·
`LLM integration (Anthropic Claude API)` · `prompt engineering` · `REST API design` · `Docker` ·
`full-stack development`. Built and shipped solo, from dataset to deployment.

**🎌 If you're learning Japanese** — The tool I wished existed after 5 years of immersion learning.
It doesn't make you decide what to study. It looks at what you already know, finds the content
and sentences that sit exactly at your level (i+1), and gives you a tutor that explains things
_without_ throwing N1 grammar at you when you're still on N4.

---

## What it demonstrates

| Skill | How it's shown |
| --- | --- |
| NLP / text classification | Fine-tuned JLPT difficulty classifier (N5–N1) |
| Model fine-tuning (HuggingFace) | `cl-tohoku/bert-base-japanese-v3` adapted to a custom dataset |
| Personalization / modeling | Per-user "known-set" model that overrides static difficulty labels |
| RAG + LLM integration | Level-aware tutor: Claude grounded on the user's text + known-set |
| Full-stack product design | Next.js frontend + FastAPI backend, deployed |
| Domain UX | Workflow built for real immersion learners, not a generic demo |

---

## v1 — Planned features

### 1. JLPT Difficulty Classifier
A fine-tuned Japanese BERT model that predicts whether a text is **N5, N4, N3, N2 or N1**.
It serves as the **cold-start prior** — the difficulty estimate the system uses before it has
learned anything about you personally. Reported metrics: per-level accuracy and confusion matrix.

### 2. Learner Model (your "known-set")
Nihon AI tracks the vocabulary and grammar you mark as known. Difficulty stops being a fixed
label and becomes **the percentage of tokens that are unknown _to you_**. JLPT is just the
starting guess; your own reading history takes over.

### 3. Auto-Mining Engine
Solves the single biggest reason people quit sentence mining: _"I don't know what to mine."_
Instead of making you curate, Nihon AI surfaces **1T sentences** (sentences with exactly one
unknown word), ranked by corpus frequency so you spend effort on high-ROI words first.
You just approve or reject — then export straight to Anki (`.apkg`).

### 4. Level-Aware AI Tutor
A RAG chatbot over the text you're reading, powered by the Claude API. The difference: your
known-set is injected as a **constraint**, so the tutor explains using only grammar and
vocabulary you already know — and flags passages that are above your current level.

### 5. Progress Dashboard
Reading volume, JLPT distribution of what you've consumed, growth of your known-word count,
and a recommended next difficulty ("your comfort zone is N4 — try more N3").

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js Frontend                      │
│   Reader  ·  AI Tutor  ·  Mining Queue  ·  Dashboard       │
└───────────────────────────┬────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│                      FastAPI Backend                       │
│      /classify   ·   /tutor   ·   /mining   ·   /progress   │
└───┬───────────────┬─────────────────┬──────────────────┬────┘
    │               │                 │                  │
    ▼               ▼                 ▼                  ▼
┌─────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  BERT   │  │ Learner model│  │  ChromaDB    │  │  Claude API  │
│  JLPT   │  │ (known-set)  │  │ multilingual │  │  level-aware │
│classifier│ │   SQLite     │  │     -e5      │  │    tutor     │
└─────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Tech stack

- **ML/NLP** — PyTorch, HuggingFace Transformers, `cl-tohoku/bert-base-japanese-v3`,
  `intfloat/multilingual-e5-base`, `fugashi` for Japanese tokenization
- **Backend** — Python 3.11, FastAPI, ChromaDB, SQLite, Anthropic SDK
- **Frontend** — Next.js 15, TypeScript, Tailwind CSS
- **Infra** — Docker, HuggingFace Spaces (model), Railway/Vercel (app)

---

## 🔜 Coming soon

Planned beyond v1 — see the project for v1.5 and v2 details.

### v1.5
- **Grammar Point Detector** — multi-label detection of which Genki/Bunpro grammar points
  appear in a sentence, for far sharper comprehension estimates than vocabulary alone.

### v2
- **ASR Pipeline** — generate Japanese subtitles for any YouTube video or audio file, so you're
  never blocked by a platform not offering Japanese subs in your region.
- **Subtitle Resync** — realign a drifted `.srt` against the actual audio, line by line —
  fixing the non-uniform drift that a global offset slider can't.
- **Burned-in Subtitle OCR** — extract subtitles baked into the video image itself.
- **Content Recommender** — rank a corpus by _your personal_ comprehension ratio (true i+1).
- **Output Correction** — write Japanese and get corrections constrained to your level.

---

## Why I built this

I've spent ~5 years learning Japanese through comprehensible input. The tools exist — Migaku,
Anki, Yomitan — but they all hand the hard decisions back to the learner: _what's at my level?
what's worth studying? what does this actually mean, in words I already know?_ Nihon AI is me
handing that problem to a model — the same problem I had myself.

---

## Getting started

> 🚧 Setup instructions will be added as v1 components land.

---

## License

AGPL-3.0 — see [LICENSE](LICENSE). You're free to use, study and modify this code, but any
derivative — including a hosted/SaaS version — must be released under the same license.

**Built by Pedro Villanueva** · ML Engineer
