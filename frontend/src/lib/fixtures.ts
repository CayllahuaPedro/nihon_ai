import { parseTokens } from "./tokenize";
import type {
  DictionaryEntry,
  LearnerSummary,
  LockedRecommendation,
  Passage,
  Recommendation,
  TutorTurn,
} from "./types";

/* Stand-in data shaped like the responses the FastAPI backend will serve:
   /progress for the learner summary, /classify for word states, /mining for
   the Discover shelves and /tutor for the rail. Swap each export for a fetch
   once the endpoint lands; nothing downstream needs to change. */

export const learner: LearnerSummary = {
  knownWords: 1842,
  level: "N4",
  knownToday: 216,
  srsDue: 42,
  finishedTexts: 11,
  nextShelfAt: 2600,
};

export const passage: Passage = {
  id: "snow-morning-train",
  title: "Snow on the morning train",
  japaneseTitle: "朝の電車",
  kicker: "Curated · Beginner N5–N4",
  page: 3,
  pageCount: 11,
  unknownOnPage: 62,
  paragraphs: [
    {
      id: "p1",
      tokens: parseTokens(`
        朝|あさ の 電車|でんしゃ#known@densha は 静|しず/か#known@shizuka だった。
        窓|まど の 外|そと で 雪|ゆき#learning@yuki が 降|ふ/りはじめて、
        山|やま の 色|いろ が ゆっくり 消|き/えていった#selected@kieru 。
        私|わたし は 本|ほん#known@hon を 閉|と/じて、 ただ 外|そと を 見|み/ていた。
      `),
    },
    {
      id: "p2",
      tokens: parseTokens(`
        次|つぎ の 駅|えき で、 女|おんな の 子|こ が 犬|いぬ#learning@inu と
        一緒|いっしょ に 乗|の/ってきた。 犬|いぬ は 小|ちい/さくて、 白|しろ/い
        毛|け が 雪|ゆき のようだった。 誰|だれ も 何|なに も 言|い/わなかったが、
        みんな 少|すこ/し 笑|わら/っていた。
      `),
    },
  ],
};

export const dictionary: Record<string, DictionaryEntry> = {
  kieru: {
    id: "kieru",
    lemma: "消える",
    kana: "きえる",
    pitchDrop: 1,
    pitchLabel: "Pitch 2",
    glosses: ["to disappear", "to fade away", "to go out (of a light)"],
    state: "learning",
    frequencyRank: 1204,
    derivation: ["消えていった", "消えていく", "消える"],
    kanji: {
      character: "消",
      components: [
        { glyph: "氵", meaning: "water" },
        { glyph: "肖", meaning: "resemble" },
      ],
      readings: "ショウ · き・える · け・す",
    },
  },
  yuki: {
    id: "yuki",
    lemma: "雪",
    kana: "ゆき",
    pitchDrop: 1,
    pitchLabel: "Pitch 2",
    glosses: ["snow"],
    state: "learning",
    frequencyRank: 892,
    derivation: ["雪"],
    kanji: {
      character: "雪",
      components: [
        { glyph: "⻗", meaning: "rain" },
        { glyph: "彐", meaning: "hand sweeping" },
      ],
      readings: "セツ · ゆき",
    },
  },
  inu: {
    id: "inu",
    lemma: "犬",
    kana: "いぬ",
    pitchDrop: null,
    pitchLabel: "Heiban",
    glosses: ["dog"],
    state: "learning",
    frequencyRank: 1105,
    derivation: ["犬"],
    kanji: {
      character: "犬",
      components: [{ glyph: "犬", meaning: "dog (pictograph)" }],
      readings: "ケン · いぬ",
    },
  },
  densha: {
    id: "densha",
    lemma: "電車",
    kana: "でんしゃ",
    pitchDrop: null,
    pitchLabel: "Heiban",
    glosses: ["train", "electric train"],
    state: "known",
    frequencyRank: 1480,
    derivation: ["電車"],
    kanji: {
      character: "電",
      components: [
        { glyph: "⻗", meaning: "rain" },
        { glyph: "电", meaning: "lightning" },
      ],
      readings: "デン",
    },
  },
  shizuka: {
    id: "shizuka",
    lemma: "静か",
    kana: "しずか",
    pitchDrop: 0,
    pitchLabel: "Pitch 1",
    glosses: ["quiet", "still", "calm"],
    state: "known",
    frequencyRank: 1622,
    derivation: ["静か"],
    kanji: {
      character: "静",
      components: [
        { glyph: "青", meaning: "blue" },
        { glyph: "争", meaning: "contend" },
      ],
      readings: "セイ · しず・か",
    },
  },
  hon: {
    id: "hon",
    lemma: "本",
    kana: "ほん",
    pitchDrop: null,
    pitchLabel: "Heiban",
    glosses: ["book", "main", "this"],
    state: "known",
    frequencyRank: 210,
    derivation: ["本"],
    kanji: {
      character: "本",
      components: [{ glyph: "木", meaning: "tree with a marked root" }],
      readings: "ホン · もと",
    },
  },
};

export const tutorThread: TutorTurn[] = [
  { id: "seed-learner-1", role: "learner", text: "Why 〜ていった and not 〜ていた?" },
  {
    id: "seed-tutor-1",
    role: "tutor",
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
];

export const tutorSuggestions = [
  "日本語で話す",
  "Quiz me on page 3",
  "More examples",
  "は or が here?",
];

export const comfortable: Recommendation[] = [
  {
    id: "rec-v1",
    kind: "video",
    extent: "4 min",
    japaneseTitle: "雪の朝、電車が止まった",
    source: "NHK Easy News · subtitled",
    expectedComprehension: 93,
    note: "11 new words\n2 already in your SRS",
    imageDescription: "NHK news still — snowy morning platform",
  },
  {
    id: "rec-a1",
    kind: "article",
    extent: "800 chars",
    japaneseTitle: "猫と暮らす、静かな一日",
    source: "Curated blog · plain style",
    expectedComprehension: 95,
    note: "6 new words\nno kanji above N4",
    imageDescription: "Photo — cat on a windowsill",
  },
  {
    id: "rec-b1",
    kind: "book",
    extent: "Vol. 1",
    japaneseTitle: "となりの町の四つ葉",
    source: "Manga · furigana throughout",
    expectedComprehension: 91,
    note: "heavy spoken forms\n1,100 words per volume",
    imageDescription: "Book cover — slice-of-life manga",
  },
];

export const stretch: Recommendation[] = [
  {
    id: "rec-v2",
    kind: "video",
    extent: "12 min",
    japaneseTitle: "〜ていく と 〜てくる",
    source: "Grammar channel",
    expectedComprehension: 84,
    note: "exactly what you looked up today",
    imageDescription: "Grammar lesson thumbnail",
  },
  {
    id: "rec-a2",
    kind: "article",
    extent: "1,400 chars",
    japaneseTitle: "春の便り — コラム抜粋",
    source: "Newspaper column",
    expectedComprehension: 78,
    note: "62 new words · dense kanji",
    imageDescription: "Newspaper column photo",
  },
  {
    id: "rec-b2",
    kind: "book",
    extent: "Ch. 1 free",
    japaneseTitle: "風の丘の郵便屋",
    source: "Young-adult fiction",
    expectedComprehension: 81,
    note: "240 new words over 9 chapters",
    imageDescription: "Novel cover — young-adult fiction",
  },
];

export const locked: LockedRecommendation[] = [
  { id: "rec-l1", japaneseTitle: "コンビニの夜", expectedComprehension: 62 },
  { id: "rec-l2", japaneseTitle: "機械の街", expectedComprehension: 54 },
];
