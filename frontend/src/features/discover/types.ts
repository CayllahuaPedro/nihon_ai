/** What Discover ranks and shelves. */

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
