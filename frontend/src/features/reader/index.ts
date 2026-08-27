/** Public surface of the reader feature. */

export { DisplaySettings } from "./components/display-settings";
export { PassageText, type TokenPick } from "./components/passage-text";
export { ReaderSettingsProvider } from "./components/reader-settings-provider";
export { WordEntry, WordPopup } from "./components/word-popup";
export { type ReaderSettings, useReaderSettings } from "./hooks/use-reader-settings";
export { POPUP_WIDTH, popupPosition } from "./model/popup-position";
export { parseTokens } from "./model/tokenize";
export type {
  DictionaryEntry,
  FuriganaMode,
  KanjiBreakdown,
  Pairing,
  Paragraph,
  Passage,
  ReaderMode,
  Segment,
  Token,
  WordState,
} from "./types";
export { dictionary, passage } from "./fixtures";
