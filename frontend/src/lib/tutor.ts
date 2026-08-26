import type { TutorAsk, TutorBlock } from "./types";

/* The one seam between the tutor UI and a real model.
 *
 * With NEXT_PUBLIC_TUTOR_API set, questions go to the FastAPI backend and the
 * answer arrives as server-sent block events. Without it, the canned answers
 * below stand in — explicitly, not as a silent fallback: `tutorSource` says
 * which one is live so the UI can tell the learner. */

const API = process.env.NEXT_PUBLIC_TUTOR_API;

export const tutorSource: "backend" | "mock" = API ? "backend" : "mock";

const MOCK_FIRST_BLOCK_MS = 650;
const MOCK_BLOCK_GAP_MS = 380;

/** Keyed on what a learner actually types while reading this passage. */
const canned: { match: RegExp; blocks: TutorBlock[] }[] = [
  {
    match: /ていく|ていった|teiku|direction/i,
    blocks: [
      {
        kind: "prose",
        text: "〜ていく adds direction: the change moves away from you, over time. The colour didn't just vanish — it kept fading as the train moved.",
      },
      { kind: "example", japanese: "色が消えていった", gloss: "kept fading" },
      {
        kind: "prose",
        text: "〜ていた would just report a state you observed. Swap it in and the snow stops moving.",
      },
    ],
  },
  {
    match: /ている|ていた|teiru|progressive|continuous/i,
    blocks: [
      {
        kind: "prose",
        text: "〜ている covers two jobs English splits apart: an action in progress, and a state left behind by a finished action.",
      },
      { kind: "example", japanese: "雪が降っている", gloss: "it is snowing — in progress" },
      { kind: "example", japanese: "本を閉じている", gloss: "the book is closed — resulting state" },
      {
        kind: "prose",
        text: "Which one you get depends on the verb, not on the ending. Verbs of change land on the state reading.",
      },
    ],
  },
  {
    match: /は|が|wa|ga|particle|topic|subject/i,
    blocks: [
      {
        kind: "prose",
        text: "は marks what the sentence is about; が marks what is new or being picked out. In this passage both show up in one breath.",
      },
      { kind: "example", japanese: "電車は静かだった", gloss: "as for the train — it was quiet" },
      { kind: "example", japanese: "雪が降りはじめて", gloss: "snow — that's the new thing — started falling" },
      {
        kind: "prose",
        text: "Swapping them isn't ungrammatical, it changes what you're pointing at.",
      },
    ],
  },
  {
    match: /quiz|test|drill|練習/i,
    blocks: [
      {
        kind: "prose",
        text: "Three from this page. Say the reading out loud before you scroll — guessing is where the recall gets built.",
      },
      { kind: "example", japanese: "窓の外で雪が___", gloss: "started falling" },
      { kind: "example", japanese: "山の色がゆっくり___", gloss: "kept disappearing" },
      { kind: "example", japanese: "私は本を___、ただ外を見ていた", gloss: "closed (and then)" },
    ],
  },
  {
    match: /日本語|japanese only|in japanese/i,
    blocks: [
      { kind: "prose", text: "いいですね。ここからは日本語で説明します。" },
      {
        kind: "example",
        japanese: "「消えていく」は、だんだん見えなくなること",
        gloss: "gradually stops being visible",
      },
      { kind: "prose", text: "わからない言葉があったら、その言葉だけ聞いてください。" },
    ],
  },
  {
    match: /example|more|another/i,
    blocks: [
      {
        kind: "prose",
        text: "Same shape, different verbs — the pattern is easier to feel across three than to memorise from one.",
      },
      { kind: "example", japanese: "音が小さくなっていく", gloss: "the sound keeps getting quieter" },
      { kind: "example", japanese: "人が増えていった", gloss: "people kept increasing" },
      { kind: "example", japanese: "空が明るくなっていく", gloss: "the sky keeps brightening" },
    ],
  },
];

function cannedFor(ask: TutorAsk): TutorBlock[] {
  const hit = canned.find((entry) => entry.match.test(ask.question));
  if (hit) return hit.blocks;

  if (ask.focusWord) {
    return [
      {
        kind: "prose",
        text: `Taking «${ask.focusWord}» from where you tapped it. Ask me for the grammar around it, a few more examples, or a quick drill — I'll answer against this page, not in the abstract.`,
      },
    ];
  }
  return [
    {
      kind: "prose",
      text: "I can only answer against this passage while the model is stubbed out. Try asking about 〜ていく, は versus が, or ask me to quiz you on page 3.",
    },
  ];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* streamCanned(ask: TutorAsk): AsyncGenerator<TutorBlock> {
  for (const [index, block] of cannedFor(ask).entries()) {
    await wait(index === 0 ? MOCK_FIRST_BLOCK_MS : MOCK_BLOCK_GAP_MS);
    yield block;
  }
}

/** Splits an SSE byte stream into `[event, data]` frames. */
async function* frames(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<[string, string]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // A frame ends at a blank line; anything after the last one is partial.
      const complete = buffer.split("\n\n");
      buffer = complete.pop() ?? "";

      for (const frame of complete) {
        let name = "";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) name = line.slice(7);
          else if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (name) yield [name, data];
      }
    }
  } finally {
    reader.cancel().catch(() => {
      // The consumer stopped listening; a failed cancel changes nothing.
    });
  }
}

async function* streamFromBackend(
  ask: TutorAsk,
  signal?: AbortSignal,
): AsyncGenerator<TutorBlock> {
  let response: Response;
  try {
    response = await fetch(`${API}/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        question: ask.question,
        focus_word: ask.focusWord ?? null,
        level: ask.level,
        known_words: ask.knownWords,
      }),
    });
  } catch (cause) {
    // An aborted request is the app's own doing and must stay distinguishable
    // from a tutor that genuinely cannot be reached.
    if (signal?.aborted) throw cause;
    throw new Error("Can't reach the tutor. Check that the API is running.");
  }

  if (!response.ok || !response.body) {
    const detail = await response
      .json()
      .then((payload: { detail?: string }) => payload.detail)
      .catch(() => null);
    throw new Error(detail ?? `The tutor is unreachable (${response.status}).`);
  }

  for await (const [event, data] of frames(response.body, signal)) {
    if (event === "done") return;
    if (event === "error") {
      throw new Error(
        (JSON.parse(data) as { message?: string }).message ??
          "The tutor stopped answering.",
      );
    }
    if (event === "block") yield JSON.parse(data) as TutorBlock;
  }
}

export function streamTutor(
  ask: TutorAsk,
  signal?: AbortSignal,
): AsyncGenerator<TutorBlock> {
  return API ? streamFromBackend(ask, signal) : streamCanned(ask);
}

let sequence = 0;

export function turnId(role: "learner" | "tutor"): string {
  sequence += 1;
  return `${role}-${sequence}`;
}
