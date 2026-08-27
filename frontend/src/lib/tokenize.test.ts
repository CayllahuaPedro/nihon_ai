import { describe, expect, it } from "vitest";
import { parseTokens } from "./tokenize";

/** The passage notation is the one place fixture text becomes renderable
 *  structure, so its edges are worth pinning down before anything moves. */
describe("parseTokens", () => {
  it("reads a bare word as a single plain segment", () => {
    expect(parseTokens("の")[0].segments).toEqual([{ base: "の" }]);
  });

  it("splits kanji from its reading", () => {
    expect(parseTokens("朝|あさ")[0].segments).toEqual([
      { base: "朝", reading: "あさ" },
    ]);
  });

  it("keeps okurigana as a segment without a reading", () => {
    expect(parseTokens("消|き/えていった")[0].segments).toEqual([
      { base: "消", reading: "き" },
      { base: "えていった" },
    ]);
  });

  it("tags a word against the learner model", () => {
    expect(parseTokens("雪|ゆき#learning@yuki")[0].state).toBe("learning");
  });

  it("links a dictionary entry", () => {
    expect(parseTokens("雪|ゆき#learning@yuki")[0].entryId).toBe("yuki");
  });

  it("leaves particles without an entry so they are not clickable", () => {
    expect(parseTokens("は")[0].entryId).toBeUndefined();
  });

  it("separates tokens written on one line", () => {
    expect(parseTokens("朝|あさ の 電車|でんしゃ は")).toHaveLength(4);
  });

  it("gives every token in a passage a distinct id", () => {
    const ids = parseTokens("朝|あさ の 電車|でんしゃ は").map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ignores the whitespace used to lay the notation out", () => {
    const spaced = parseTokens("\n  朝|あさ\n  の\n");

    expect(spaced).toHaveLength(2);
  });
});
