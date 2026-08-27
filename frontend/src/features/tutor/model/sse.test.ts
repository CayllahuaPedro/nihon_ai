import { describe, expect, it } from "vitest";
import { frames } from "./sse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(chunks: string[], signal?: AbortSignal) {
  const out: [string, string][] = [];
  for await (const frame of frames(streamOf(chunks), signal)) out.push(frame);
  return out;
}

describe("frames", () => {
  it("reads one complete frame", async () => {
    expect(await collect(['event: block\ndata: {"a":1}\n\n'])).toEqual([
      ["block", '{"a":1}'],
    ]);
  });

  it("reads several frames from a single chunk", async () => {
    const parsed = await collect(["event: a\ndata: 1\n\nevent: b\ndata: 2\n\n"]);

    expect(parsed.map(([name]) => name)).toEqual(["a", "b"]);
  });

  it("does not re-emit a frame when the next chunk arrives", async () => {
    // The consumed part of the buffer must be dropped, or every frame is
    // delivered again with each following chunk.
    const parsed = await collect([
      "event: a\ndata: 1\n\n",
      "event: b\ndata: 2\n\n",
    ]);

    expect(parsed).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  it("reassembles a frame split across chunks", async () => {
    expect(await collect(["event: blo", "ck\ndata: {", '"a":1}\n\n'])).toEqual([
      ["block", '{"a":1}'],
    ]);
  });

  it("reassembles a frame split inside its blank-line terminator", async () => {
    expect(await collect(["event: block\ndata: x\n", "\n"])).toEqual([
      ["block", "x"],
    ]);
  });

  it("withholds a frame that has not been terminated", async () => {
    expect(await collect(["event: block\ndata: x\n"])).toEqual([]);
  });

  it("skips a frame with no event name", async () => {
    expect(await collect(["data: orphan\n\nevent: kept\ndata: y\n\n"])).toEqual([
      ["kept", "y"],
    ]);
  });

  it("survives a multi-byte character split down the middle", async () => {
    const bytes = new TextEncoder().encode("event: block\ndata: 雪\n\n");
    const cut = bytes.length - 4; // lands inside the encoded 雪
    const parsed: [string, string][] = [];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    for await (const frame of frames(stream)) parsed.push(frame);

    expect(parsed).toEqual([["block", "雪"]]);
  });

  it("stops reading once the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    expect(await collect(["event: block\ndata: x\n\n"], controller.signal)).toEqual([]);
  });

  it("yields nothing for an empty stream", async () => {
    expect(await collect([])).toEqual([]);
  });
});
