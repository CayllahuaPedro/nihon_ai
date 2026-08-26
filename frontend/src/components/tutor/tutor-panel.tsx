"use client";

import type { TutorChat } from "@/hooks/use-tutor-chat";
import { tutorSuggestions } from "@/lib/fixtures";
import { TutorComposer } from "./tutor-composer";
import { TutorThread } from "./tutor-thread";

type TutorPanelProps = {
  chat: TutorChat;
  /** Word the reader currently has open, shown so the answer's scope is visible. */
  focusWord?: string;
  className?: string;
};

export function TutorPanel({ chat, focusWord, className = "" }: TutorPanelProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-[18px] ${className}`}>
      {focusWord ? (
        <p className="flex-none self-start rounded-full bg-[var(--color-inset)] px-3.5 py-1.5 text-[13px] text-[var(--color-muted)]">
          Answering about{" "}
          <span className="font-jp text-[15px] text-[var(--color-ink)]">{focusWord}</span>
        </p>
      ) : null}

      <TutorThread
        turns={chat.turns}
        thinking={chat.thinking}
        error={chat.error}
        onRetry={chat.retry}
        emptyHint="Ask about anything on this page — a grammar shape, a word you tapped, or a quick drill."
      />

      <TutorComposer
        onSend={chat.send}
        disabled={chat.thinking}
        suggestions={chat.thinking ? [] : tutorSuggestions}
        placeholder="Ask about this sentence…"
      />
    </div>
  );
}
