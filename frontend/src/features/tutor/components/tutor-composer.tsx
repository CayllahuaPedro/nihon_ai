"use client";

import { useId, useState } from "react";

type TutorComposerProps = {
  onSend: (question: string) => void;
  disabled: boolean;
  suggestions: string[];
  placeholder: string;
};

export function TutorComposer({
  onSend,
  disabled,
  suggestions,
  placeholder,
}: TutorComposerProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const submit = (question: string) => {
    if (disabled || !question.trim()) return;
    onSend(question);
    setDraft("");
  };

  return (
    <div className="flex flex-none flex-col gap-2.5">
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => submit(suggestion)}
              className="cursor-pointer rounded-full bg-[var(--color-raised)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-raised-ink)] transition-colors hover:bg-[var(--color-inset)] disabled:cursor-default disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
        className="flex items-center gap-2 rounded-full bg-[var(--color-raised)] py-1.5 pr-1.5 pl-[18px]"
      >
        <label htmlFor={inputId} className="sr-only">
          Ask the tutor about this sentence
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-[var(--color-raised-ink)] placeholder:text-[var(--color-muted)] focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label="Send question"
          className="flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full bg-[var(--color-voice)] text-[17px] text-[var(--color-voice-contrast)] transition-opacity disabled:cursor-default disabled:opacity-40"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
