import type { LearnerSummary } from "./types";

/* The learner summary, read by every feature. Data that belongs to one feature
   lives in that feature's own fixtures — keeping it here made shared code
   depend on features, and that is a cycle waiting to happen. */

export const learner: LearnerSummary = {
  knownWords: 1842,
  level: "N4",
  knownToday: 216,
  srsDue: 42,
  finishedTexts: 11,
  nextShelfAt: 2600,
};
