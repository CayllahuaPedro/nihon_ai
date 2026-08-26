"use client";

import { useEffect, useRef } from "react";
import type { DictionaryEntry } from "@/lib/types";

type WordEntryProps = {
  entry: DictionaryEntry;
  onAddToSrs: (entry: DictionaryEntry) => void;
  onAskTutor: (entry: DictionaryEntry) => void;
  added: boolean;
};

export const POPUP_WIDTH = 372;

/** The dictionary card itself. It is placed by a popup beside the word on a
 *  desktop and by a sheet on a phone, but reads the same in both. */
export function WordEntry({
  entry,
  onAddToSrs,
  onAskTutor,
  added,
}: WordEntryProps) {
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-jp text-[30px] leading-[1.1]">{entry.lemma}</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2">
            <PitchReading kana={entry.kana} drop={entry.pitchDrop} />
            <span className="rounded-full bg-accent-2-200 px-[9px] py-[3px] text-[11px] font-semibold tracking-[0.06em] text-accent-2-800 uppercase">
              {entry.pitchLabel}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-accent-200 px-2.5 py-1 text-[11px] font-bold text-accent-800 uppercase">
            {entry.state}
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            freq #{entry.frequencyRank.toLocaleString()}
          </span>
        </div>
      </div>

      <p className="text-base leading-[1.45]">{entry.glosses.join(" · ")}</p>

      {entry.derivation.length > 1 ? (
        <ol className="m-0 flex list-none flex-wrap items-center gap-[7px] p-0 font-jp text-[15px]">
          {entry.derivation.map((step, index) => {
            const isLemma = index === entry.derivation.length - 1;
            return (
              <li key={step} className="flex items-center gap-[7px]">
                <span
                  className={`rounded-full px-[11px] py-[5px] ${
                    isLemma
                      ? "bg-accent-200 font-medium text-accent-800"
                      : "bg-[var(--color-inset)]"
                  }`}
                >
                  {step}
                </span>
                {isLemma ? null : (
                  <span aria-hidden className="text-[var(--color-voice)]">
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}

      {entry.kanji ? (
        <div className="flex items-center gap-3.5 rounded-md bg-[var(--color-inset)] p-3.5">
          <span className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-md bg-[var(--color-inset-deep)] font-jp text-[34px]">
            {entry.kanji.character}
          </span>
          <div className="flex min-w-0 flex-col gap-[5px] text-[13px]">
            <p className="flex flex-wrap items-center gap-1.5 font-jp text-[15px]">
              {entry.kanji.components.map((component, index) => (
                <span key={component.glyph} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <span aria-hidden className="text-neutral-500">
                      +
                    </span>
                  ) : null}
                  <span className="rounded-lg bg-[var(--color-inset-deep)] px-[9px] py-0.5">
                    {component.glyph} {component.meaning}
                  </span>
                </span>
              ))}
            </p>
            <p className="text-[var(--color-muted)]">{entry.kanji.readings}</p>
          </div>
        </div>
      ) : null}

      <p className="rounded-md bg-accent-2-100 px-3.5 py-2.5 text-xs leading-[1.4] text-accent-2-800">
        Card front <b>{entry.lemma}</b> · back gloss + this sentence
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onAddToSrs(entry)}
          disabled={added}
          className="flex-1 cursor-pointer rounded-full bg-[var(--color-voice)] px-5 py-3 text-center font-heading text-sm text-[var(--color-voice-contrast)] disabled:cursor-default disabled:opacity-60"
        >
          {added ? "In your SRS" : "+ Add to SRS"}
        </button>
        <button
          type="button"
          onClick={() => onAskTutor(entry)}
          className="cursor-pointer rounded-full bg-[var(--color-inset)] px-5 py-3 text-sm font-semibold text-[var(--color-raised-ink)] hover:bg-[var(--color-inset-deep)]"
        >
          Ask the tutor
        </button>
      </div>
    </>
  );
}

type WordPopupProps = WordEntryProps & {
  /** Offset within the reading pane, already clamped by the caller. */
  position: { left: number; top: number };
  onClose: () => void;
};

export function WordPopup({ position, onClose, ...entryProps }: WordPopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, [entryProps.entry.id]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${entryProps.entry.lemma} — dictionary entry`}
      tabIndex={-1}
      style={{ left: position.left, top: position.top, width: POPUP_WIDTH }}
      className="absolute z-20 hidden flex-col gap-4 rounded-lg bg-[var(--color-raised)] px-6 py-[22px] text-[var(--color-raised-ink)] shadow-lg focus:outline-none lg:flex"
    >
      <WordEntry {...entryProps} />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close dictionary entry"
        className="absolute top-3 right-3 cursor-pointer rounded-full px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-raised-ink)]"
      >
        ✕
      </button>
    </div>
  );
}

/** Draws the pitch contour: mora stay high through the drop, then fall. */
function PitchReading({ kana, drop }: { kana: string; drop: number | null }) {
  const mora = Array.from(kana);

  return (
    <span className="font-jp text-base text-[var(--color-muted)]">
      {mora.map((character, index) => (
        <span
          key={index}
          className={
            drop !== null && index === drop
              ? "border-t-2 border-[var(--color-voice)] pt-px"
              : undefined
          }
        >
          {character}
        </span>
      ))}
    </span>
  );
}
