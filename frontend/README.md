# Nihon AI — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind v4. Runs on its own; not deployed — there is no
deploy configuration in the repo.

```bash
npm install
npm run dev        # http://localhost:3000
npm run dev:lan    # also reachable from a phone on the same network
npm run build
npm run typecheck
npm test           # vitest, tests live beside the code
```

## Structure

Code is organised by feature, in three layers, so logic can be proved without
mounting React:

```
src/features/<feature>/
├── model/       pure functions — no React, no DOM, no network
├── hooks/       React state and orchestration
├── components/  presentation
├── fixtures.ts  stand-in data this feature owns
├── types.ts
└── index.ts     the only entry point; nothing reaches past it
```

`model/` is the layer that earns the layout: `apply-event.ts` decides what a
reader sees mid-answer, `sse.ts` splits a byte stream that can cut anywhere,
`popup-position.ts` keeps the dictionary inside the pane, `settings-storage.ts`
rejects a stored value someone edited by hand. Each is a plain function with
its own tests, because a bug in any of them is invisible from the outside.

Shared code — `lib/`, `components/ui/`, `hooks/` — knows nothing about
features. That direction is one-way on purpose: shared code that reaches into a
feature cannot then be imported by it without a cycle.

### Enforced, not documented

```bash
npm run lint:arch   # dependency-cruiser
npm run check       # typecheck + lint:arch + tests
```

[`.dependency-cruiser.cjs`](.dependency-cruiser.cjs) fails the build on: cycles,
shared code importing a feature, a feature reaching past another's barrel, a
route reaching past a barrel, `model/` importing React or a component, and a
hook importing a component.

Every rule was written after a real violation, and each was then verified by
committing that violation on purpose and watching the rule catch it — a rule
you have never seen fail is worth as much as a test you have never seen fail.
The cycle between the tutor panel and the shared fixtures was found this way,
not by review.

## The tutor

The chat is live: turns accumulate, the thread follows the newest answer, and a
word tapped in the reader can be handed to the tutor with its dictionary entry
as context. What is *not* live is the model behind it.

[`src/features/tutor/model/stream.ts`](src/features/tutor/model/stream.ts) is the single seam
between the tutor UI and the model. `streamTutor()` yields `start` / `delta` / `end` / `drop`
events, so English prose appears token by token behind a caret while a Japanese example
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

State lives in [`src/features/tutor/hooks/use-tutor-chat.ts`](src/features/tutor/hooks/use-tutor-chat.ts),
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

Everything renders from typed fixtures shaped like the responses the backend will serve. The
shared `learner` lives in [`src/lib/fixtures.ts`](src/lib/fixtures.ts); each feature owns its own
`fixtures.ts` for the data it renders.

| Fixture                          | Future endpoint |
| -------------------------------- | --------------- |
| `learner`                        | `/progress`     |
| `passage` word states            | `/classify`     |
| `comfortable` / `stretch`        | `/mining`       |
| `tutorThread`, `tutorSuggestions` | `/tutor`       |

There is no `/discover` or SRS endpoint yet — the Discover shelves are the
`/mining` selection re-ranked by expected comprehension.

Passage text uses a compact notation parsed by
[`src/features/reader/model/tokenize.ts`](src/features/reader/model/tokenize.ts):

```
朝|あさ の 電車|でんしゃ#known@densha は 静|しず/か#known@shizuka だった。
```

`kanji|reading` becomes ruby, `/` separates segments inside one word, `#state`
tags it against the learner model, and `@id` links a dictionary entry.
