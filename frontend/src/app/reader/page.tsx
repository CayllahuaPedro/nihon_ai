"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  DisplaySettings,
  PassageText,
  popupPosition,
  type TokenPick,
  dictionary,
  passage,
  useReaderSettings,
  WordEntry,
  WordPopup,
} from "@/features/reader";
import {
  TutorPanel,
  TutorRail,
  tutorThread,
  useTutorChat,
} from "@/features/tutor";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { learner } from "@/lib/fixtures";
import type {
  DictionaryEntry,
  FuriganaMode,
  Pairing,
  ReaderMode,
} from "@/features/reader";

/** Matches the `lg:` breakpoint the layout switches on. */
const DESKTOP = "(min-width: 1024px)";

const modeOptions: { value: ReaderMode; label: string }[] = [
  { value: "learn", label: "Learn" },
  { value: "book", label: "Book" },
  { value: "dense", label: "Dense" },
];

const furiganaOptions: { value: FuriganaMode; label: string }[] = [
  { value: "hover", label: "On hover" },
  { value: "always", label: "Always" },
  { value: "off", label: "Off" },
];

const pairingOptions: { value: Pairing; label: string }[] = [
  { value: "kohi", label: "Kōhi" },
  { value: "washi", label: "Washi" },
  { value: "sumi", label: "Sumi" },
];

export default function ReaderPage() {
  const { furigana, setFurigana, mode, setMode, pairing, setPairing } =
    useReaderSettings();
  // The sheets open a real modal dialog, which must never happen on a desktop
  // where the rail and the popup already carry the same content.
  const isDesktop = useMediaQuery(DESKTOP);
  const paneRef = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<TokenPick | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [srsAdditions, setSrsAdditions] = useState<string[]>([]);
  const [tutorOpen, setTutorOpen] = useState(false);
  // Survives the dictionary closing, so a word handed to the tutor stays the
  // subject of the conversation until another word takes its place.
  const [tutorFocus, setTutorFocus] = useState<string | null>(null);

  const entry = pick?.token.entryId ? dictionary[pick.token.entryId] : null;
  const focusWord = entry?.lemma ?? tutorFocus ?? undefined;
  const chat = useTutorChat(tutorThread, learner, focusWord);

  // Measure before paint so the popup never flashes at the wrong offset.
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pick || !pane) return;

    setPosition(popupPosition(pick.rect, pane.getBoundingClientRect()));
  }, [pick]);

  const paragraphs =
    mode === "learn" ? passage.paragraphs.slice(0, 1) : passage.paragraphs;

  const addToSrs = useCallback((added: DictionaryEntry) => {
    setSrsAdditions((current) =>
      current.includes(added.id) ? current : [...current, added.id],
    );
  }, []);

  // Handing a word to the tutor closes the dictionary: the question is already
  // about that word, so keeping both surfaces open just buries the answer.
  const askTutorAbout = useCallback(
    (asked: DictionaryEntry) => {
      setPick(null);
      setTutorFocus(asked.lemma);
      setTutorOpen(true);
      chat.send(`Explain ${asked.lemma} in this sentence`, asked.lemma);
    },
    [chat],
  );

  const selectToken = useCallback((next: TokenPick) => {
    setTutorFocus(null);
    setPick(next);
  }, []);

  const entryProps = entry
    ? {
        entry,
        onAddToSrs: addToSrs,
        onAskTutor: askTutorAbout,
        added: srsAdditions.includes(entry.id),
      }
    : null;

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_356px] lg:items-start">
      <div
        ref={paneRef}
        data-furi={furigana}
        className="relative flex min-w-0 flex-col gap-6 px-5 pt-6 pb-28 sm:px-8 lg:gap-[30px] lg:px-[52px] lg:py-10"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs tracking-[0.1em] text-[var(--color-muted)] uppercase">
              {passage.kicker}
            </p>
            <h1 className="font-heading text-[26px] leading-tight sm:text-[32px]">
              {passage.title}
            </h1>
          </div>
          <Segmented
            label="Reading mode"
            value={mode}
            options={modeOptions}
            onChange={setMode}
          />
        </div>

        <PassageText
          paragraphs={paragraphs}
          mode={mode}
          selectedTokenId={pick?.key ?? null}
          onSelect={selectToken}
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 text-[13px] text-[var(--color-muted)]">
          <Swatch className="h-[3px] w-5 rounded-sm bg-accent-2-400" label="known" />
          <Swatch className="h-3 w-5 rounded bg-accent-200" label="learning" />
          <Swatch
            className="h-3 w-5 rounded bg-[var(--color-voice)]"
            label="selected"
          />
          <span className="flex-1" />
          <DisplaySettings />
          <div className="hidden lg:block">
            <Segmented
              label="Furigana"
              size="sm"
              value={furigana}
              options={furiganaOptions}
              onChange={setFurigana}
            />
          </div>
        </div>

        <div className="hidden flex-1 lg:block" />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 text-[13px] text-[var(--color-muted)]">
          <span>
            Page {passage.page} of {passage.pageCount}
          </span>
          <span aria-hidden>·</span>
          <span>{passage.unknownOnPage} unknown</span>
          {srsAdditions.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{srsAdditions.length} added to SRS this session</span>
            </>
          ) : null}
          <span className="hidden flex-1 sm:block" />
          <div className="hidden lg:block">
            <Segmented
              label="Pairing"
              size="sm"
              value={pairing}
              options={pairingOptions}
              onChange={setPairing}
            />
          </div>
        </div>

        {entryProps && isDesktop ? (
          <WordPopup
            {...entryProps}
            position={position}
            onClose={() => setPick(null)}
          />
        ) : null}
      </div>

      <TutorRail chat={chat} focusWord={focusWord} />

      {!isDesktop ? (
        <>
          <button
            type="button"
            onClick={() => setTutorOpen(true)}
            className="fixed right-5 bottom-[86px] z-30 flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-voice)] px-5 py-3.5 font-heading text-sm text-[var(--color-voice-contrast)] shadow-lg"
          >
            <span aria-hidden className="font-jp">
              話
            </span>
            Ask the tutor
          </button>

          <Sheet
            open={tutorOpen}
            onClose={() => setTutorOpen(false)}
            label="Tutor"
            height="82svh"
          >
            <TutorPanel
              chat={chat}
              focusWord={focusWord}
              className="px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            />
          </Sheet>

          <Sheet
            open={Boolean(entryProps)}
            onClose={() => setPick(null)}
            label={entry ? `${entry.lemma} — dictionary entry` : "Dictionary entry"}
            height="auto"
          >
            {entryProps ? (
              <div className="flex flex-col gap-4 overflow-y-auto px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <WordEntry {...entryProps} />
              </div>
            ) : null}
          </Sheet>
        </>
      ) : null}
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={className} />
      {label}
    </span>
  );
}
