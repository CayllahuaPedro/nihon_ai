import { describe, expect, it } from "vitest";
import { matchesFilter, shelfProgress } from "./shelves";

describe("matchesFilter", () => {
  it("keeps everything under the all filter", () => {
    expect(matchesFilter("video", "all")).toBe(true);
  });

  it("keeps a matching kind", () => {
    expect(matchesFilter("book", "book")).toBe(true);
  });

  it("drops a kind that was not asked for", () => {
    expect(matchesFilter("book", "video")).toBe(false);
  });
});

describe("shelfProgress", () => {
  it("reports partial progress", () => {
    expect(shelfProgress(1300, 2600)).toBe(50);
  });

  it("rounds to a whole percent", () => {
    expect(shelfProgress(1842, 2600)).toBe(71);
  });

  it("reports nothing learned as zero", () => {
    expect(shelfProgress(0, 2600)).toBe(0);
  });

  it("stops at 100 once the threshold is passed", () => {
    // The raw ratio overshoots here, and a bar filled past its track looks
    // broken rather than finished.
    expect(shelfProgress(4000, 2600)).toBe(100);
  });

  it("never goes negative", () => {
    expect(shelfProgress(-50, 2600)).toBe(0);
  });

  it("treats an unreachable threshold as already met", () => {
    expect(shelfProgress(10, 0)).toBe(100);
  });
});
