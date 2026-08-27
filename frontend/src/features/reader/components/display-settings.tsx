"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReaderSettings } from "../hooks/use-reader-settings";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import type { FuriganaMode, Pairing } from "../types";

const furiganaOptions: { value: FuriganaMode; label: string }[] = [
  { value: "hover", label: "On tap" },
  { value: "always", label: "Always" },
  { value: "off", label: "Off" },
];

const pairingOptions: { value: Pairing; label: string }[] = [
  { value: "kohi", label: "Kōhi" },
  { value: "washi", label: "Washi" },
  { value: "sumi", label: "Sumi" },
];

/** Phone-only. Furigana and the colour pairing are settings you change once,
 *  not controls you reach for while reading, so they come out of the page and
 *  stop competing with the passage for attention. */
export function DisplaySettings() {
  const { furigana, setFurigana, pairing, setPairing } = useReaderSettings();
  const [open, setOpen] = useState(false);
  // Widening the window past the breakpoint puts these controls back in the
  // page, so the sheet holding them must not stay up as a stray modal.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full bg-surface px-4 py-2 text-[13px] font-semibold text-neutral-700"
      >
        Display
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label="Display settings" height="auto">
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <h2 className="font-heading text-[19px]">Display</h2>

          <Field label="Furigana" hint="Readings above the kanji">
            <Segmented
              label="Furigana"
              size="sm"
              value={furigana}
              options={furiganaOptions}
              onChange={setFurigana}
            />
          </Field>

          <Field label="Pairing" hint="Ground, accent and Japanese face">
            <Segmented
              label="Pairing"
              size="sm"
              value={pairing}
              options={pairingOptions}
              onChange={setPairing}
            />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">
        {label}
        <span className="ml-2 font-normal text-[var(--color-muted)]">{hint}</span>
      </p>
      {children}
    </div>
  );
}
