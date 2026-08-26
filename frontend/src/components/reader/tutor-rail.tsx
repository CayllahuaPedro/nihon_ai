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
      className="hidden min-h-0 min-w-0 flex-col gap-[18px] bg-[var(--color-ground-raised)] px-[26px] py-7 lg:flex"
    >
      <h2 className="flex flex-none items-center gap-2.5 font-heading text-[19px]">
        <span aria-hidden className="h-[30px] w-[30px] rounded-full bg-accent-2-500" />
        Tutor
      </h2>

      <TutorPanel chat={chat} focusWord={focusWord} />
    </aside>
  );
}
