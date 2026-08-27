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

/** What the backend reports while an answer is still being written.
 *  `delta` text is safe to show and always superseded by the matching `end`. */
export type TutorEvent =
  | { type: "start"; index: number; kind: TutorBlock["kind"] }
  | { type: "delta"; index: number; text: string }
  | { type: "end"; index: number; block: TutorBlock }
  | { type: "drop"; index: number };

/** A block as it exists on screen, which may be mid-arrival. */
export type StreamingBlock = {
  /** The backend's block number. Identity is this, never array position: a
   *  dropped block leaves the ones after it with unchanged numbers. */
  index: number;
  kind: TutorBlock["kind"];
  /** False while text is still coming; the fields below are then partial. */
  done: boolean;
  text?: string;
  japanese?: string;
  gloss?: string;
};

export function settled(block: TutorBlock, index: number): StreamingBlock {
  return { ...block, index, done: true };
}

export type TutorTurn =
  | { id: string; role: "learner"; text: string }
  | { id: string; role: "tutor"; blocks: StreamingBlock[] };

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
