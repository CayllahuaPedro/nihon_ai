import { settled } from "../types";
import type { StreamingBlock, TutorEvent } from "../types";

/**
 * Folds one streaming event into the blocks of a tutor turn.
 *
 * Pure on purpose: this is the part that decides what a reader sees mid-answer,
 * and it should be provable without mounting React or opening a socket.
 *
 * Blocks are matched on the backend's index, never on array position — a
 * dropped block would otherwise shift every later block onto the wrong slot.
 */
export function applyEvent(
  blocks: StreamingBlock[],
  event: TutorEvent,
): StreamingBlock[] {
  switch (event.type) {
    case "start":
      return [
        ...blocks,
        {
          index: event.index,
          kind: event.kind,
          done: false,
          ...(event.kind === "prose" ? { text: "" } : {}),
        },
      ];
    case "delta":
      return blocks.map((block) =>
        block.index === event.index
          ? { ...block, text: (block.text ?? "") + event.text }
          : block,
      );
    case "end":
      return blocks.map((block) =>
        block.index === event.index ? settled(event.block, event.index) : block,
      );
    case "drop":
      return blocks.filter((block) => block.index !== event.index);
  }
}
