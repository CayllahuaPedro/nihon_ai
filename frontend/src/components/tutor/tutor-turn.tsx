import type { TutorTurn as Turn } from "@/lib/types";

/** A tutor answer is prose plus quoted Japanese, never one undifferentiated
 *  paragraph. The quoted lines carry a rule in the accent so the eye can find
 *  the language itself without reading the explanation around it. */
export function TutorTurn({ turn }: { turn: Turn }) {
  if (turn.role === "learner") {
    return (
      <p className="max-w-[85%] self-end rounded-[18px_18px_6px_18px] bg-accent-200 px-4 py-3 text-sm text-accent-900">
        {turn.text}
      </p>
    );
  }

  return (
    <div className="flex max-w-[92%] flex-col gap-2.5 self-start rounded-[18px_18px_18px_6px] bg-[var(--color-raised)] px-[18px] py-4 text-sm leading-[1.55] text-[var(--color-raised-ink)]">
      {turn.blocks.map((block, index) =>
        block.kind === "prose" ? (
          <p key={index}>{block.text}</p>
        ) : (
          <p
            key={index}
            className="rounded-md border-l-2 border-[var(--color-voice)] bg-[var(--color-inset-deep)] px-[13px] py-2.5 font-jp text-[17px] leading-[1.7]"
          >
            {block.japanese}
            <span className="font-body text-[13px] text-[var(--color-muted)]">
              {" "}
              — {block.gloss}
            </span>
          </p>
        ),
      )}
    </div>
  );
}
