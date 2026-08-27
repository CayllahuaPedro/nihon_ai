import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TutorEvent } from "../types";

const streamTutor = vi.fn();

vi.mock("@/features/tutor/model/stream", () => ({
  streamTutor: (...args: unknown[]) => streamTutor(...args),
  turnId: (role: string) => `${role}-${(turnId.n += 1)}`,
}));
const turnId = { n: 0 };

const { useTutorChat } = await import("./use-tutor-chat");

const LEARNER = { level: "N4", knownWords: 1842 };

/** Yields events, pausing between them so a test can observe mid-flight state. */
function emitting(events: TutorEvent[], gapMs = 0) {
  return async function* () {
    for (const event of events) {
      if (gapMs) await new Promise((r) => setTimeout(r, gapMs));
      yield event;
    }
  };
}

const ANSWER: TutorEvent[] = [
  { type: "start", index: 0, kind: "prose" },
  { type: "delta", index: 0, text: "It adds" },
  { type: "end", index: 0, block: { kind: "prose", text: "It adds direction." } },
];

const setup = (seed = []) => renderHook(() => useTutorChat(seed, LEARNER));

beforeEach(() => {
  turnId.n = 0;
  streamTutor.mockReset();
});

describe("useTutorChat", () => {
  it("records the learner's question straight away", async () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("Why 〜ていった?"));

    expect(result.current.turns[0]).toMatchObject({
      role: "learner",
      text: "Why 〜ていった?",
    });
  });

  it("builds the answer from the events it receives", async () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("Why 〜ていった?"));
    await waitFor(() => expect(result.current.thinking).toBe(false));

    expect(result.current.turns[1]).toMatchObject({
      role: "tutor",
      blocks: [{ kind: "prose", done: true, text: "It adds direction." }],
    });
  });

  it("waits only until the first event arrives", async () => {
    // Driven by hand rather than by timers: the distinction under test is
    // between "nothing yet" and "still arriving", and a sleep cannot express
    // that without racing the assertion.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    streamTutor.mockImplementation(async function* () {
      yield ANSWER[0];
      await held;
      yield ANSWER[2];
    });
    const { result } = setup();

    act(() => result.current.send("Why?"));
    expect(result.current.waiting).toBe(true);

    // First event in, answer not finished: the dots give way, the answer grows.
    await waitFor(() => expect(result.current.waiting).toBe(false));
    expect(result.current.thinking).toBe(true);

    await act(async () => {
      release();
      await held;
    });
    await waitFor(() => expect(result.current.thinking).toBe(false));
  });

  it("trims and ignores an empty question", () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("   "));

    expect(result.current.turns).toEqual([]);
    expect(streamTutor).not.toHaveBeenCalled();
  });

  it("refuses a second question while one is in flight", async () => {
    streamTutor.mockImplementation(emitting(ANSWER, 20));
    const { result } = setup();

    act(() => result.current.send("first"));
    act(() => result.current.send("second"));

    expect(streamTutor).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failure as an error the reader can act on", async () => {
    streamTutor.mockImplementation(async function* () {
      throw new Error("Can't reach the tutor.");
    });
    const { result } = setup();

    act(() => result.current.send("Why?"));
    await waitFor(() => expect(result.current.error).toBe("Can't reach the tutor."));
    expect(result.current.thinking).toBe(false);
  });

  it("asks the same question again on retry", async () => {
    streamTutor.mockImplementation(async function* () {
      throw new Error("nope");
    });
    const { result } = setup();

    act(() => result.current.send("Why 〜ていった?"));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    streamTutor.mockImplementation(emitting(ANSWER));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.thinking).toBe(false));

    expect(streamTutor.mock.calls.at(-1)?.[0]).toMatchObject({
      question: "Why 〜ていった?",
    });
  });

  it("sends the learner's level so the answer can be pitched to it", async () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("Why?"));

    expect(streamTutor.mock.calls[0][0]).toMatchObject({
      level: "N4",
      knownWords: 1842,
    });
  });

  it("carries a focus word supplied for one question only", async () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("Explain 消える", "消える"));

    expect(streamTutor.mock.calls[0][0]).toMatchObject({ focusWord: "消える" });
  });

  it("clears the thread and the error", async () => {
    streamTutor.mockImplementation(emitting(ANSWER));
    const { result } = setup();

    act(() => result.current.send("Why?"));
    await waitFor(() => expect(result.current.thinking).toBe(false));
    act(() => result.current.clear());

    expect(result.current.turns).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("abandons an answer the learner has moved on from", async () => {
    streamTutor.mockImplementation(emitting(ANSWER, 30));
    const { result } = setup();

    act(() => result.current.send("first"));
    await waitFor(() => expect(result.current.waiting).toBe(false));
    act(() => result.current.clear());
    await new Promise((r) => setTimeout(r, 120));

    expect(result.current.turns).toEqual([]);
  });
});
