"use client";

import type { Paragraph, ReaderMode, Token, WordState } from "@/lib/types";

const stateClass: Record<WordState, string> = {
  known: "shadow-[0_2px_0_var(--color-accent-2-400)]",
  learning: "rounded-[6px] bg-accent-200 px-[3px]",
  selected:
    "rounded-[8px] bg-[var(--color-voice)] px-[5px] py-0.5 text-[var(--color-voice-contrast)]",
};

/* Japanese needs more type size than Latin text to keep kanji legible, so the
   phone step down is gentler than it would be for English. Dense mode gives up
   its second column outright — 375px cannot carry two. */
const modeClass: Record<ReaderMode, string> = {
  learn: "max-w-[700px] text-[25px] leading-[1.95] tracking-[0.01em] sm:text-[34px] sm:leading-[2.05]",
  book: "max-w-[660px] text-[22px] leading-[2.05] sm:text-justify sm:text-[27px] sm:leading-[2.25]",
  dense: "text-[17px] leading-[1.9] sm:columns-2 sm:gap-10 sm:text-[19px] sm:leading-[1.95] sm:[column-rule:1px_solid_var(--color-neutral-300)]",
};

export type TokenPick = {
  key: string;
  token: Token;
  /** Viewport rect of the clicked word, so the popup can anchor to it. */
  rect: DOMRect;
};

type PassageTextProps = {
  paragraphs: Paragraph[];
  mode: ReaderMode;
  selectedTokenId: string | null;
  onSelect: (pick: TokenPick) => void;
};

export function PassageText({
  paragraphs,
  mode,
  selectedTokenId,
  onSelect,
}: PassageTextProps) {
  return (
    <div className={`font-jp ${modeClass[mode]}`}>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.id} className="mb-0">
          {paragraph.tokens.map((token) => {
            const key = `${paragraph.id}-${token.id}`;
            return (
              <TokenSpan
                key={key}
                tokenKey={key}
                token={token}
                selected={key === selectedTokenId}
                onSelect={onSelect}
              />
            );
          })}
        </p>
      ))}
    </div>
  );
}

function TokenSpan({
  tokenKey,
  token,
  selected,
  onSelect,
}: {
  tokenKey: string;
  token: Token;
  selected: boolean;
  onSelect: (pick: TokenPick) => void;
}) {
  const body = token.segments.map((segment, index) =>
    segment.reading ? (
      <ruby key={index}>
        {segment.base}
        <rt>{segment.reading}</rt>
      </ruby>
    ) : (
      <span key={index}>{segment.base}</span>
    ),
  );

  if (!token.entryId) {
    return <>{body}</>;
  }

  const state: WordState = selected ? "selected" : (token.state ?? "known");
  const plain = token.segments.map((segment) => segment.base).join("");

  return (
    <button
      type="button"
      onClick={(event) =>
        onSelect({
          key: tokenKey,
          token,
          rect: event.currentTarget.getBoundingClientRect(),
        })
      }
      aria-pressed={selected}
      aria-label={`Look up ${plain}`}
      className={`cursor-pointer ${stateClass[state]}`}
    >
      {body}
    </button>
  );
}
