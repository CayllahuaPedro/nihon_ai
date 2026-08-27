/** The reader's own vocabulary: how a passage is shaped and how a word
 *  sits against the learner model. */

export type Pairing = "kohi" | "washi" | "sumi";

export type FuriganaMode = "hover" | "always" | "off";

export type ReaderMode = "learn" | "book" | "dense";

/** How a word sits against the learner model, which is what colours it. */
export type WordState = "known" | "learning" | "selected";

/** One run of text inside a token. `reading` present means it renders as ruby. */
export type Segment = {
  base: string;
  reading?: string;
};

export type Token = {
  id: string;
  segments: Segment[];
  state?: WordState;
  /** Key into the dictionary fixture; absent for particles and punctuation. */
  entryId?: string;
};

export type Paragraph = {
  id: string;
  tokens: Token[];
};

export type Passage = {
  id: string;
  title: string;
  japaneseTitle: string;
  kicker: string;
  page: number;
  pageCount: number;
  unknownOnPage: number;
  paragraphs: Paragraph[];
};

export type DictionaryEntry = {
  id: string;
  lemma: string;
  kana: string;
  /** 0-indexed mora that carries the downstep, or null for heiban. */
  pitchDrop: number | null;
  pitchLabel: string;
  glosses: string[];
  state: WordState;
  frequencyRank: number;
  /** Surface form in the text → dictionary form, one step per hop. */
  derivation: string[];
  kanji: KanjiBreakdown | null;
};

export type KanjiBreakdown = {
  character: string;
  components: { glyph: string; meaning: string }[];
  readings: string;
};
