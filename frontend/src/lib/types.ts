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

export type TutorBlock =
  | { kind: "prose"; text: string }
  | { kind: "example"; japanese: string; gloss: string };

export type TutorTurn =
  | { id: string; role: "learner"; text: string }
  | { id: string; role: "tutor"; blocks: TutorBlock[] };

/** What the composer sends up and the tutor answers against. */
export type TutorAsk = {
  question: string;
  /** Word the reader has open, when the question came from the rail. */
  focusWord?: string;
  level: string;
  knownWords: number;
};

export type ContentKind = "video" | "article" | "book";

export type Recommendation = {
  id: string;
  kind: ContentKind;
  /** Free-text extent: "4 min", "800 chars", "Vol. 1". */
  extent: string;
  japaneseTitle: string;
  source: string;
  /** Share of tokens the learner model expects you to already know, 0–100. */
  expectedComprehension: number;
  note: string;
  imageDescription: string;
};

export type LockedRecommendation = {
  id: string;
  japaneseTitle: string;
  expectedComprehension: number;
};

export type LearnerSummary = {
  knownWords: number;
  level: string;
  knownToday: number;
  srsDue: number;
  finishedTexts: number;
  /** Known-word count the locked shelf unlocks at. */
  nextShelfAt: number;
};
