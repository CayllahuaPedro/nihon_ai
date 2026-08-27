import type { FuriganaMode, Pairing, ReaderMode } from "../types";

/** Reading preferences, as they are persisted between visits. */
export type ReaderSettingsValues = {
  pairing: Pairing;
  furigana: FuriganaMode;
  mode: ReaderMode;
};

export const STORAGE_KEY = "nihon-ai.reader-settings";

export const defaultSettings: ReaderSettingsValues = {
  pairing: "kohi",
  furigana: "hover",
  mode: "learn",
};

const PAIRINGS: Pairing[] = ["kohi", "washi", "sumi"];
const FURIGANA: FuriganaMode[] = ["hover", "always", "off"];
const MODES: ReaderMode[] = ["learn", "book", "dense"];

function pick<T extends string>(allowed: T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Stored settings are attacker-adjacent in the mildest sense — anyone can edit
 * localStorage — and stale after a rename. Either way an unrecognised value
 * must fall back rather than reach the DOM as a bogus `data-pairing`.
 */
export function parseSettings(raw: string | null): ReaderSettingsValues {
  if (!raw) return defaultSettings;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSettings;
  }

  if (typeof parsed !== "object" || parsed === null) return defaultSettings;
  const values = parsed as Partial<ReaderSettingsValues>;

  return {
    pairing: pick(PAIRINGS, values.pairing, defaultSettings.pairing),
    furigana: pick(FURIGANA, values.furigana, defaultSettings.furigana),
    mode: pick(MODES, values.mode, defaultSettings.mode),
  };
}

/** A private window or blocked site data just means defaults. */
export function readSettings(): ReaderSettingsValues {
  try {
    return parseSettings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return defaultSettings;
  }
}

/** Preferences are a convenience; failing to persist is not an error. */
export function writeSettings(values: ReaderSettingsValues): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Nothing to recover: the next visit simply starts from defaults.
  }
}
