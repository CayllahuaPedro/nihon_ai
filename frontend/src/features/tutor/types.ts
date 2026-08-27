/** The tutor's own vocabulary. Shared app types live in `@/lib/types`. */

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
