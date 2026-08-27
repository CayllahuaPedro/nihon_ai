"use client";

import Link from "next/link";
import { TutorPanel, useTutorChat } from "@/features/tutor";
import { passage } from "@/features/reader";
import { learner } from "@/lib/fixtures";

export default function TutorPage() {
  const chat = useTutorChat([], learner);

  return (
    <div className="mx-auto flex h-[calc(100svh-var(--header-h)-var(--tabbar-h))] w-full max-w-[760px] min-h-0 flex-col gap-5 px-5 pt-6 pb-5 lg:px-8 lg:py-9">
      <header className="flex flex-none flex-wrap items-start gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[26px] leading-tight sm:text-[30px]">
            Ask about anything you&apos;re reading
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            The tutor answers at {learner.level}, against the words you already
            know — not with grammar you haven&apos;t met yet.
          </p>
        </div>
        {chat.turns.length > 0 ? (
          <button
            type="button"
            onClick={chat.clear}
            className="flex-none cursor-pointer rounded-full bg-[var(--color-ground-raised)] px-4 py-2 text-[13px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Clear
          </button>
        ) : null}
      </header>

      <p className="flex-none rounded-md bg-[var(--color-ground-raised)] px-4 py-3 text-[13px] text-[var(--color-muted)]">
        Reading{" "}
        <Link href="/reader" className="font-semibold text-[var(--color-voice)]">
          {passage.title}
        </Link>{" "}
        · page {passage.page} of {passage.pageCount}. Tap a word in the reader to
        bring it here with its dictionary entry attached.
      </p>

      <TutorPanel chat={chat} />
    </div>
  );
}
