"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FuriganaMode, Pairing, ReaderMode } from "@/lib/types";

type ReaderSettings = {
  pairing: Pairing;
  furigana: FuriganaMode;
  mode: ReaderMode;
  setPairing: (value: Pairing) => void;
  setFurigana: (value: FuriganaMode) => void;
  setMode: (value: ReaderMode) => void;
};

const STORAGE_KEY = "nihon-ai.reader-settings";

const defaults = {
  pairing: "kohi" as Pairing,
  furigana: "hover" as FuriganaMode,
  mode: "learn" as ReaderMode,
};

const ReaderSettingsContext = createContext<ReaderSettings | null>(null);

export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pairing, setPairing] = useState<Pairing>(defaults.pairing);
  const [furigana, setFurigana] = useState<FuriganaMode>(defaults.furigana);
  const [mode, setMode] = useState<ReaderMode>(defaults.mode);

  // Read after mount rather than during render: the server has no localStorage,
  // so seeding state from it directly would break hydration.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<typeof defaults>;
      if (parsed.pairing) setPairing(parsed.pairing);
      if (parsed.furigana) setFurigana(parsed.furigana);
      if (parsed.mode) setMode(parsed.mode);
    } catch {
      // A private window or blocked site data just means defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pairing, furigana, mode }),
      );
    } catch {
      // Preferences are a convenience; failing to persist is not an error.
    }
  }, [pairing, furigana, mode]);

  const value = useMemo(
    () => ({ pairing, furigana, mode, setPairing, setFurigana, setMode }),
    [pairing, furigana, mode],
  );

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  const value = useContext(ReaderSettingsContext);
  if (!value) {
    throw new Error("useReaderSettings must be used inside ReaderSettingsProvider");
  }
  return value;
}
