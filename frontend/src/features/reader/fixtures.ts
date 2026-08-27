import { parseTokens } from "./model/tokenize";
import type { DictionaryEntry, Passage } from "./types";

/* Stand-in reader data, shaped like the responses /classify will serve. */

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
