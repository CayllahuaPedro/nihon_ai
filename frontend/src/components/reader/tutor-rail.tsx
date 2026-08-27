"use client";

import type { TutorChat } from "@/hooks/use-tutor-chat";
import { TutorPanel } from "@/components/tutor/tutor-panel";

/** The desktop home for the tutor. On phones the same panel arrives in a
 *  sheet instead — see the reader page. */
export function TutorRail({
  chat,
  focusWord,
}: {
  chat: TutorChat;
  focusWord?: string;
}) {
  return (
    <aside
      aria-label="Tutor"
      className="hidden min-w-0 bg-[var(--color-ground-raised)] px-[26px] py-7 lg:sticky lg:top-[var(--header-h)] lg:flex lg:h-[calc(100svh-var(--header-h))] lg:min-h-0 lg:flex-col lg:gap-[18px]"
    >
      <h2 className="flex flex-none items-center gap-2.5 font-heading text-[19px]">
        <span aria-hidden className="h-[30px] w-[30px] rounded-full bg-accent-2-500" />
        Tutor
      </h2>

      <TutorPanel chat={chat} focusWord={focusWord} />
    </aside>
  );
}
