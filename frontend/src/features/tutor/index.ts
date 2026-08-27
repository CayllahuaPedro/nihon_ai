/** Public surface of the tutor feature. Nothing outside it should reach past
 *  this file into `model/`, `hooks/` or `components/`. */

export { TutorPanel } from "./components/tutor-panel";
export { TutorRail } from "./components/tutor-rail";
export { type TutorChat, useTutorChat } from "./hooks/use-tutor-chat";
export { tutorSource } from "./model/stream";
export { tutorSuggestions, tutorThread } from "./fixtures";
export type {
  StreamingBlock,
  TutorAsk,
  TutorBlock,
  TutorEvent,
  TutorTurn,
} from "./types";
export { settled } from "./types";
