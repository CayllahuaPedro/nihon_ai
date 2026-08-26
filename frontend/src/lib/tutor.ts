import type { TutorAsk, TutorBlock, TutorTurn } from "./types";

/* The one seam between the tutor UI and a real model. Everything above this
   file already behaves like the answer arrives over the network — it awaits,
   it can fail, it takes a variable amount of time. Replacing the body with a
   POST to /tutor is the whole migration. */

const LATENCY_FLOOR_MS = 700;
const LATENCY_SPREAD_MS = 900;

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
      { kind: "example", japanese: "「消えていく」は、だんだん見えなくなること", gloss: "gradually stops being visible" },
      { kind: "prose", text: "わからない言葉があったら、その言葉だけ聞いてください。" },
    ],
  },
  {
    match: /example|more|another/i,
    blocks: [
      { kind: "prose", text: "Same shape, different verbs — the pattern is easier to feel across three than to memorise from one." },
      { kind: "example", japanese: "音が小さくなっていく", gloss: "the sound keeps getting quieter" },
      { kind: "example", japanese: "人が増えていった", gloss: "people kept increasing" },
      { kind: "example", japanese: "空が明るくなっていく", gloss: "the sky keeps brightening" },
    ],
  },
];

function fallback(ask: TutorAsk): TutorBlock[] {
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

let sequence = 0;

export function turnId(role: TutorTurn["role"]): string {
  sequence += 1;
  return `${role}-${sequence}`;
}

export async function askTutor(ask: TutorAsk): Promise<TutorTurn> {
  const delay = LATENCY_FLOOR_MS + Math.random() * LATENCY_SPREAD_MS;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const hit = canned.find((entry) => entry.match.test(ask.question));
  return {
    id: turnId("tutor"),
    role: "tutor",
    blocks: hit ? hit.blocks : fallback(ask),
  };
}
