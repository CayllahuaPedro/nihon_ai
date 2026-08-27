/** Types shared across features. Anything only one feature needs belongs
 *  in that feature's own `types.ts`. */

export type LearnerSummary = {
  knownWords: number;
  level: string;
  knownToday: number;
  srsDue: number;
  finishedTexts: number;
  /** Known-word count the locked shelf unlocks at. */
  nextShelfAt: number;
};
