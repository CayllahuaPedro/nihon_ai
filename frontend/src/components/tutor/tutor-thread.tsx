"use client";

import { useEffect, useRef } from "react";
import type { TutorTurn as Turn } from "@/lib/types";
import { ThinkingDots } from "./thinking-dots";
import { TutorTurn } from "./tutor-turn";

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
  const foot = useRef<HTMLDivElement>(null);

  // Follow the newest turn. `smooth` is dropped for reduced motion, where a
  // long animated jump is exactly what the setting asks us not to do.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    foot.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "end",
    });
  }, [turns, waiting]);

  return (
    <div
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

      <div ref={foot} />
    </div>
  );
}
