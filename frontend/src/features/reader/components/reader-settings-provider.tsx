"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReaderSettingsContext,
  type ReaderSettings,
} from "../hooks/use-reader-settings";
import {
  defaultSettings,
  readSettings,
  writeSettings,
} from "../model/settings-storage";

export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pairing, setPairing] = useState(defaultSettings.pairing);
  const [furigana, setFurigana] = useState(defaultSettings.furigana);
  const [mode, setMode] = useState(defaultSettings.mode);

  // Read after mount rather than during render: the server has no localStorage,
  // so seeding state from it directly would break hydration.
  useEffect(() => {
    const stored = readSettings();
    setPairing(stored.pairing);
    setFurigana(stored.furigana);
    setMode(stored.mode);
  }, []);

  useEffect(() => {
    writeSettings({ pairing, furigana, mode });
  }, [pairing, furigana, mode]);

  const value = useMemo<ReaderSettings>(
    () => ({ pairing, furigana, mode, setPairing, setFurigana, setMode }),
    [pairing, furigana, mode],
  );

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}
