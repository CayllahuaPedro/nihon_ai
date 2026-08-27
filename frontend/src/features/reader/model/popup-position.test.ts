import { describe, expect, it } from "vitest";
import { Box, POPUP_WIDTH, popupPosition } from "./popup-position";

const pane: Box = { left: 0, top: 0, width: 1000, bottom: 800 };
const word = (over: Partial<Box> = {}): Box => ({
  left: 400,
  top: 100,
  width: 60,
  bottom: 130,
  ...over,
});

describe("popupPosition", () => {
  it("centres the popup under the word", () => {
    const { left } = popupPosition(word(), pane);

    expect(left).toBe(400 + 30 - POPUP_WIDTH / 2);
  });

  it("sits below the word, not on top of it", () => {
    expect(popupPosition(word(), pane).top).toBeGreaterThan(word().bottom);
  });

  it("keeps the popup inside the left edge", () => {
    const { left } = popupPosition(word({ left: 0, width: 20 }), pane);

    expect(left).toBeGreaterThanOrEqual(0);
  });

  it("keeps the popup inside the right edge", () => {
    const { left } = popupPosition(word({ left: 980, width: 20 }), pane);

    expect(left + POPUP_WIDTH).toBeLessThanOrEqual(pane.width);
  });

  it("prefers the left edge when the pane is narrower than the popup", () => {
    // maxLeft goes negative here; clamping in the wrong order would push the
    // popup off the left of the screen instead of the right.
    const narrow: Box = { left: 0, top: 0, width: 300, bottom: 800 };

    expect(popupPosition(word({ left: 150 }), narrow).left).toBeGreaterThanOrEqual(0);
  });

  it("measures against the pane, not the viewport", () => {
    const scrolled: Box = { left: 200, top: 50, width: 1000, bottom: 800 };
    const flush = popupPosition(word({ left: 600 }), scrolled);
    const origin = popupPosition(word({ left: 400 }), pane);

    expect(flush).toEqual({ left: origin.left, top: origin.top - 50 });
  });
});
