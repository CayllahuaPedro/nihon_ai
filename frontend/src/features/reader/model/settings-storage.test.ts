import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  parseSettings,
  readSettings,
  STORAGE_KEY,
  writeSettings,
} from "./settings-storage";

describe("parseSettings", () => {
  it("falls back when nothing is stored", () => {
    expect(parseSettings(null)).toEqual(defaultSettings);
  });

  it("falls back on text that is not json", () => {
    expect(parseSettings("{not json")).toEqual(defaultSettings);
  });

  it("falls back on json that is not an object", () => {
    expect(parseSettings('"kohi"')).toEqual(defaultSettings);
  });

  it("reads a complete set of settings", () => {
    const raw = JSON.stringify({ pairing: "sumi", furigana: "off", mode: "dense" });

    expect(parseSettings(raw)).toEqual({
      pairing: "sumi",
      furigana: "off",
      mode: "dense",
    });
  });

  it("keeps the values it recognises and defaults the rest", () => {
    const raw = JSON.stringify({ pairing: "washi" });

    expect(parseSettings(raw)).toEqual({ ...defaultSettings, pairing: "washi" });
  });

  it("rejects a value outside the allowed set", () => {
    // Anyone can edit localStorage; an unknown pairing must not reach the DOM.
    const raw = JSON.stringify({ pairing: "neon", mode: "dense" });

    expect(parseSettings(raw).pairing).toBe(defaultSettings.pairing);
  });

  it("rejects a value of the wrong type", () => {
    expect(parseSettings(JSON.stringify({ mode: 7 })).mode).toBe(
      defaultSettings.mode,
    );
  });
});

describe("readSettings / writeSettings", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips through storage", () => {
    writeSettings({ pairing: "washi", furigana: "always", mode: "book" });

    expect(readSettings()).toEqual({
      pairing: "washi",
      furigana: "always",
      mode: "book",
    });
  });

  it("writes under the documented key", () => {
    writeSettings(defaultSettings);

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("returns defaults when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readSettings()).toEqual(defaultSettings);
  });

  it("does not throw when storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() => writeSettings(defaultSettings)).not.toThrow();
  });
});
