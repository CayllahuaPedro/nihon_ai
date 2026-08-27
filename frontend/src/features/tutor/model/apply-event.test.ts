import { describe, expect, it } from "vitest";
import { applyEvent } from "./apply-event";
import type { StreamingBlock, TutorEvent } from "../types";

const fold = (events: TutorEvent[]): StreamingBlock[] =>
  events.reduce<StreamingBlock[]>(applyEvent, []);

const start = (index: number, kind: "prose" | "example"): TutorEvent => ({
  type: "start",
  index,
  kind,
});
const delta = (index: number, text: string): TutorEvent => ({
  type: "delta",
  index,
  text,
});

describe("applyEvent", () => {
  it("opens a prose block with empty text so the bubble can render at once", () => {
    expect(fold([start(0, "prose")])).toEqual([
      { index: 0, kind: "prose", done: false, text: "" },
    ]);
  });

  it("opens an example block with no text, because none is coming", () => {
    expect(fold([start(0, "example")])).toEqual([
      { index: 0, kind: "example", done: false },
    ]);
  });

  it("accumulates deltas into the block they belong to", () => {
    const blocks = fold([start(0, "prose"), delta(0, "It "), delta(0, "adds")]);

    expect(blocks[0].text).toBe("It adds");
  });

  it("routes a delta to its own block, not the newest one", () => {
    const blocks = fold([
      start(0, "prose"),
      start(1, "prose"),
      delta(0, "first"),
    ]);

    expect([blocks[0].text, blocks[1].text]).toEqual(["first", ""]);
  });

  it("replaces streamed text with the validated block on end", () => {
    const blocks = fold([
      start(0, "prose"),
      delta(0, "partia"),
      { type: "end", index: 0, block: { kind: "prose", text: "partial" } },
    ]);

    expect(blocks).toEqual([
      { index: 0, kind: "prose", done: true, text: "partial" },
    ]);
  });

  it("fills an example only once it has been validated", () => {
    const blocks = fold([
      start(0, "example"),
      {
        type: "end",
        index: 0,
        block: { kind: "example", japanese: "雪", gloss: "snow" },
      },
    ]);

    expect(blocks[0]).toMatchObject({ done: true, japanese: "雪", gloss: "snow" });
  });

  it("removes a dropped block", () => {
    const blocks = fold([start(0, "prose"), delta(0, "shown"), { type: "drop", index: 0 }]);

    expect(blocks).toEqual([]);
  });

  it("keeps later blocks addressable after an earlier one is dropped", () => {
    // The regression this guards: indexing by array position would send
    // block 1's text into the slot block 0 just vacated.
    const blocks = fold([
      start(0, "prose"),
      { type: "drop", index: 0 },
      start(1, "prose"),
      delta(1, "second"),
    ]);

    expect(blocks).toEqual([
      { index: 1, kind: "prose", done: false, text: "second" },
    ]);
  });

  it("ignores a delta for a block that is not open", () => {
    expect(fold([start(0, "prose"), delta(7, "stray")])[0].text).toBe("");
  });

  it("does not mutate the array it is given", () => {
    const before: StreamingBlock[] = [
      { index: 0, kind: "prose", done: false, text: "a" },
    ];
    const snapshot = structuredClone(before);

    applyEvent(before, delta(0, "b"));

    expect(before).toEqual(snapshot);
  });
});
