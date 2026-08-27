# Nihon AI — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind v4. Deployed independently to
Vercel with **Root Directory = `frontend`**.

```bash
npm install
npm run dev        # http://localhost:3000
npm run dev:lan    # also reachable from a phone on the same network
npm run build
npm run typecheck
```

## Routes

| Route       | Design artboard | State                                   |
| ----------- | --------------- | --------------------------------------- |
| `/reader`   | `1a Reader`     | Built — passage, word popup, tutor rail |
| `/discover` | `2a Discover`   | Built — shelves ranked by comprehension |
| `/tutor`    | —               | Built — full-page tutor conversation    |

`/` redirects to `/reader`. The nav also shows **SRS**, which is drawn in the
design but has no route or backend endpoint yet, so it renders as inert rather
than as a link that goes nowhere.

## The tutor

The chat is live: turns accumulate, the thread follows the newest answer, and a
word tapped in the reader can be handed to the tutor with its dictionary entry
as context. What is *not* live is the model behind it.

[`src/lib/tutor.ts`](src/lib/tutor.ts) is the single seam between the tutor UI
and the model. `streamTutor()` yields `start` / `delta` / `end` / `drop` events,
so English prose appears token by token behind a caret while a Japanese example
arrives whole — a sentence reads as a unit. The stand-in answers stream the same
way, so running without a backend is not a visibly worse demo.

Blocks are matched on the backend's index, never on array position: a dropped
block would otherwise shift every later block onto the wrong slot.

```bash
# frontend/.env.local
NEXT_PUBLIC_TUTOR_API=http://localhost:8000
```

With that set, questions go to the FastAPI backend. Without it the canned
answers stand in — **explicitly**: the
panel says so on screen, because a mock that silently impersonates the real
thing is how you ship a broken tutor without noticing.

State lives in [`src/hooks/use-tutor-chat.ts`](src/hooks/use-tutor-chat.ts),
which aborts an answer the learner has moved on from and distinguishes
`waiting` (nothing has arrived yet — show the dots) from `thinking` (the answer
is still growing).

## Layout

One codebase, two shapes, switching at the `lg` breakpoint:

|                | Desktop                        | Phone                              |
| -------------- | ------------------------------ | ---------------------------------- |
| Sections       | Header nav                     | Bottom tab bar                     |
| Tutor          | Rail beside the passage        | Sheet, opened by a floating button |
| Dictionary     | Popup anchored to the word     | Sheet                              |
| Furigana, pair | Inline controls                | `Display` sheet                    |

Sheets are built on native `<dialog>` + `showModal()`, so the page behind one is
genuinely inert rather than merely covered. Because `showModal()` still runs
inside a `display:none` subtree, the phone-only sheets are mounted behind
[`useMediaQuery`](src/hooks/use-media-query.ts) in JS — hiding them with a
`lg:hidden` class alone would lock the body scroll on desktop.

## Design source

Implemented from the Claude Design project *Japanese learning app design*,
file `Reader Pairings.dc.html`. Tokens are mirrored verbatim from that
project's `_ds/organic-*/styles.css` into the `@theme` block of
[`src/app/globals.css`](src/app/globals.css).

### Pairings

The design ships three colour & type pairings of the same Reader — `1a Kōhi`,
`1b Washi`, `1c Sumi` — and states that only the ground, the accent voice and
the Japanese face change between them. They are therefore implemented as a
token swap (`data-pairing` on the app shell), not as three component trees.
`kohi` is the default: the Discover artboard is built in it.

### Reader controls

- **Mode** — `learn` / `book` / `dense` changes passage typography and column
  count. `dense` is the two-column setting from artboard 1c.
- **Furigana** — `hover` / `always` / `off`, the `furigana` prop from the
  design document. `hover` is the default so the eye trains on kanji first.

Both persist to `localStorage` and are read after mount, so SSR stays stable.

## Data

Everything renders from typed fixtures in [`src/lib/fixtures.ts`](src/lib/fixtures.ts),
shaped like the responses the FastAPI backend will serve:

| Fixture                          | Future endpoint |
| -------------------------------- | --------------- |
| `learner`                        | `/progress`     |
| `passage` word states            | `/classify`     |
| `comfortable` / `stretch`        | `/mining`       |
| `tutorThread`, `tutorSuggestions` | `/tutor`       |

There is no `/discover` or SRS endpoint yet — the Discover shelves are the
`/mining` selection re-ranked by expected comprehension.

Passage text uses a compact notation parsed by
[`src/lib/tokenize.ts`](src/lib/tokenize.ts):

```
朝|あさ の 電車|でんしゃ#known@densha は 静|しず/か#known@shizuka だった。
```

`kanji|reading` becomes ruby, `/` separates segments inside one word, `#state`
tags it against the learner model, and `@id` links a dictionary entry.
