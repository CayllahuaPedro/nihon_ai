/** Geometry the dictionary popup needs, as plain numbers. */
export type Box = {
  left: number;
  top: number;
  width: number;
  bottom: number;
};

export const POPUP_WIDTH = 372;

const GAP = 14;
const MARGIN = 16;

/**
 * Places the dictionary popup under the word it explains.
 *
 * Centred on the word, then pulled back inside the reading pane so it never
 * hangs off an edge — a word at the start of a line would otherwise open a
 * popup half outside the page.
 */
export function popupPosition(
  word: Box,
  pane: Box,
): { left: number; top: number } {
  const centred = word.left - pane.left + word.width / 2 - POPUP_WIDTH / 2;
  const maxLeft = pane.width - POPUP_WIDTH - MARGIN;

  return {
    // `Math.min` first, then `Math.max`: in a pane too narrow for the popup,
    // maxLeft goes below MARGIN and the left edge must still win.
    left: Math.max(MARGIN, Math.min(centred, maxLeft)),
    top: word.bottom - pane.top + GAP,
  };
}
