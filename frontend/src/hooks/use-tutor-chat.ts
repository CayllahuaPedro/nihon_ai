"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamTutor, turnId } from "@/lib/tutor";
import { settled } from "@/lib/types";
import type { StreamingBlock, TutorEvent, TutorTurn } from "@/lib/types";

export type TutorChat = {
  turns: TutorTurn[];
  /** True from the moment a question is sent until its answer completes. */
  thinking: boolean;
  /** True only before the first event of the current answer arrives. */
  waiting: boolean;
  error: string | null;
  /** `focus` overrides the ambient focus word for this one question, so a word
   *  handed over from the dictionary keeps its context even as that closes. */
  send: (question: string, focus?: string) => void;
  retry: () => void;
  clear: () => void;
};

type Learner = { level: string; knownWords: number };

/** Blocks are matched on the backend's index, never on array position — a
 *  dropped block would otherwise shift every later block onto the wrong slot. */
function applyEvent(
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

export function useTutorChat(
  seed: TutorTurn[],
  learner: Learner,
  focusWord?: string,
): TutorChat {
  const [turns, setTurns] = useState<TutorTurn[]>(seed);
  const [thinking, setThinking] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);
  const lastQuestion = useRef<string | null>(null);
  const lastFocus = useRef<string | undefined>(undefined);

  useEffect(() => () => inFlight.current?.abort(), []);

  const ask = useCallback(
    async (question: string, focus?: string) => {
      // Only the newest question may write into the thread; an answer the
      // learner has moved on from is cancelled rather than left to land.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      lastQuestion.current = question;
      lastFocus.current = focus ?? focusWord;

      setError(null);
      setThinking(true);
      setWaiting(true);

      const id = turnId("tutor");

      // The updater decides from the state it is handed, never from a variable
      // captured out here: React runs it later, by which time such a variable
      // has already moved on and every event lands in the wrong branch.
      const absorb = (event: TutorEvent) => {
        setTurns((current) => {
          const last = current.at(-1);
          if (last?.id === id && last.role === "tutor") {
            return [
              ...current.slice(0, -1),
              { ...last, blocks: applyEvent(last.blocks, event) },
            ];
          }
          return [
            ...current,
            { id, role: "tutor", blocks: applyEvent([], event) },
          ];
        });
      };

      try {
        for await (const event of streamTutor(
          {
            question,
            focusWord: lastFocus.current,
            level: learner.level,
            knownWords: learner.knownWords,
          },
          controller.signal,
        )) {
          if (controller.signal.aborted) return;
          setWaiting(false);
          absorb(event);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "The tutor didn't answer.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setThinking(false);
          setWaiting(false);
        }
      }
    },
    [focusWord, learner.level, learner.knownWords],
  );

  const send = useCallback(
    (question: string, focus?: string) => {
      const trimmed = question.trim();
      if (!trimmed || thinking) return;

      setTurns((current) => [
        ...current,
        { id: turnId("learner"), role: "learner", text: trimmed },
      ]);
      void ask(trimmed, focus);
    },
    [ask, thinking],
  );

  const retry = useCallback(() => {
    const question = lastQuestion.current;
    if (!question || thinking) return;
    void ask(question, lastFocus.current);
  }, [ask, thinking]);

  const clear = useCallback(() => {
    inFlight.current?.abort();
    lastQuestion.current = null;
    lastFocus.current = undefined;
    setTurns([]);
    setThinking(false);
    setWaiting(false);
    setError(null);
  }, []);

  return { turns, thinking, waiting, error, send, retry, clear };
}
