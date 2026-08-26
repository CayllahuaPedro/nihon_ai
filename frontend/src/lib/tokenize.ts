import type { Segment, Token, WordState } from "./types";

/**
 * Parses the compact passage notation used by the fixtures.
 *
 *   token    := segment ("/" segment)* ("#" state)? ("@" entryId)?
 *   segment  := base ("|" reading)?
 *
 * A reading turns that segment into ruby, so `静|しず/か` renders 静 with しず
 * above it followed by a bare か. Tokens are separated by whitespace.
 *
 *   朝|あさ の 電車|でんしゃ#known は 静|しず/か#known だった。
 */
export function parseTokens(source: string): Token[] {
  return source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, index) => {
      let body = raw;
      let entryId: string | undefined;
      let state: WordState | undefined;

      const entrySplit = body.indexOf("@");
      if (entrySplit !== -1) {
        entryId = body.slice(entrySplit + 1);
        body = body.slice(0, entrySplit);
      }

      const stateSplit = body.indexOf("#");
      if (stateSplit !== -1) {
        state = body.slice(stateSplit + 1) as WordState;
        body = body.slice(0, stateSplit);
      }

      const segments: Segment[] = body.split("/").map((piece) => {
        const [base, reading] = piece.split("|");
        return reading ? { base, reading } : { base };
      });

      return { id: `t${index}`, segments, state, entryId };
    });
}
