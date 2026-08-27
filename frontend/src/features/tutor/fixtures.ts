import { settled } from "./types";
import type { TutorTurn } from "./types";

/* Stand-in tutor data. Lives inside the feature rather than in the shared
   fixture module: a component reaching out to global data that reaches back
   for the feature's own types is a cycle, and it was one. */

export const tutorThread: TutorTurn[] = [
  { id: "seed-learner-1", role: "learner", text: "Why 〜ていった and not 〜ていた?" },
  {
    id: "seed-tutor-1",
    role: "tutor",
    blocks: [
      settled({
        kind: "prose",
        text: "〜ていく adds direction: the change moves away from you, over time. The colour didn't just vanish — it kept fading as the train moved.",
      }, 0),
      settled({ kind: "example", japanese: "色が消えていった", gloss: "kept fading" }, 1),
      settled({
        kind: "prose",
        text: "〜ていた would just report a state you observed. Swap it in and the snow stops moving.",
      }, 2),
    ],
  },
];

export const tutorSuggestions = [
  "日本語で話す",
  "Quiz me on page 3",
  "More examples",
  "は or が here?",
];
