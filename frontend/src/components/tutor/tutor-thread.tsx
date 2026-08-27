"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TutorTurn as Turn } from "@/lib/types";
import { ThinkingDots } from "./thinking-dots";
import { TutorTurn } from "./tutor-turn";

/** How close to the bottom still counts as following along. */
const FOLLOW_THRESHOLD_PX = 48;

type TutorThreadProps = {
  turns: Turn[];
  thinking: boolean;
  waiting: boolean;
  error: string | null;
  onRetry: () => void;
  emptyHint: string;
};

export function TutorThread({
  turns,
  thinking,
  waiting,
  error,
  onRetry,
  emptyHint,
}: TutorThreadProps) {
  const pane = useRef<HTMLDivElement>(null);
  // Whether the reader is following the newest text. Scrolling up to re-read
  // an earlier answer is a decision, and the thread must not drag them back.
  const following = useRef(true);

  const onScroll = useCallback(() => {
    const el = pane.current;
    if (!el) return;
    following.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD_PX;
  }, []);

  // Jump rather than animate. An answer arrives in many small steps, and a
  // smooth scroll restarted on each one never finishes — which also makes this
  // the behaviour reduced-motion asks for.
  useEffect(() => {
    const el = pane.current;
    if (!el) return;

    // Asking a question is an act of intent: the reader wants to see it and
    // the answer to it, even if they had scrolled up to re-read something.
    if (turns.at(-1)?.role === "learner") following.current = true;

    if (!following.current) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, waiting, error]);

  return (
    <div
      ref={pane}
      onScroll={onScroll}
      role="log"
      aria-live="polite"
      aria-label="Tutor conversation"
      className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto overscroll-contain"
    >
      {turns.length === 0 && !thinking ? (
        <p className="mt-auto mb-1 max-w-[38ch] self-center text-center text-sm text-balance text-[var(--color-muted)]">
          {emptyHint}
        </p>
      ) : null}

      {turns.map((turn) => (
        <TutorTurn key={turn.id} turn={turn} />
      ))}

      {waiting ? <ThinkingDots /> : null}

      {error ? (
        <p className="flex flex-wrap items-center gap-2.5 self-start rounded-md bg-accent-200 px-4 py-3 text-sm text-accent-900">
          {error}
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-full bg-accent-800 px-3.5 py-1.5 text-[13px] font-semibold text-accent-100"
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}
