import type { ContentKind } from "../types";

export type KindFilter = ContentKind | "all";

export function matchesFilter(kind: ContentKind, filter: KindFilter): boolean {
  return filter === "all" || filter === kind;
}

/**
 * How far the learner is toward unlocking the next shelf, as a percentage.
 *
 * Clamped at both ends: the raw ratio overshoots 100 as soon as the known-word
 * count passes the threshold, and a bar filled past its track reads as broken
 * rather than as finished.
 */
export function shelfProgress(knownWords: number, unlocksAt: number): number {
  if (unlocksAt <= 0) return 100;
  return Math.round(Math.min(100, Math.max(0, (knownWords / unlocksAt) * 100)));
}
