"use client";

import { useCallback, useRef, useState } from "react";
import { askTutor, turnId } from "@/lib/tutor";
import type { TutorTurn } from "@/lib/types";

export type TutorChat = {
  turns: TutorTurn[];
  /** True while an answer is in flight, so the thread can show it thinking. */
  thinking: boolean;
  error: string | null;
  /** `focus` overrides the ambient focus word for this one question, so a word
   *  handed over from the dictionary keeps its context even as that closes. */
  send: (question: string, focus?: string) => void;
  retry: () => void;
  clear: () => void;
};

export function useTutorChat(
  seed: TutorTurn[],
  focusWord?: string,
): TutorChat {
  const [turns, setTurns] = useState<TutorTurn[]>(seed);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only the newest question may resolve into the thread. An answer that
  // arrives after the learner has moved on would otherwise land out of order.
  const latestAsk = useRef(0);
  const lastQuestion = useRef<string | null>(null);
  const lastFocus = useRef<string | undefined>(undefined);

  const ask = useCallback(
    async (question: string, focus?: string) => {
      const ticket = latestAsk.current + 1;
      latestAsk.current = ticket;
      lastQuestion.current = question;
      lastFocus.current = focus ?? focusWord;

      setError(null);
      setThinking(true);

      try {
        const answer = await askTutor({ question, focusWord: lastFocus.current });
        if (latestAsk.current !== ticket) return;
        setTurns((current) => [...current, answer]);
      } catch {
        if (latestAsk.current !== ticket) return;
        setError("The tutor didn't answer. Ask again.");
      } finally {
        if (latestAsk.current === ticket) setThinking(false);
      }
    },
    [focusWord],
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
    latestAsk.current += 1;
    lastQuestion.current = null;
    lastFocus.current = undefined;
    setTurns([]);
    setThinking(false);
    setError(null);
  }, []);

  return { turns, thinking, error, send, retry, clear };
}
