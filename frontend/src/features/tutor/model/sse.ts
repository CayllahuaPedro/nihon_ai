/**
 * Splits a server-sent event stream into `[event, data]` pairs.
 *
 * Pure transport concern, kept apart from what the tutor does with the events:
 * a byte stream can cut anywhere, and that is worth proving in isolation rather
 * than through a live socket.
 */
export async function* frames(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<[string, string]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // A frame ends at a blank line; anything after the last one is partial.
      const complete = buffer.split("\n\n");
      buffer = complete.pop() ?? "";

      for (const frame of complete) {
        let name = "";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) name = line.slice(7);
          else if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (name) yield [name, data];
      }
    }
  } finally {
    reader.cancel().catch(() => {
      // The consumer stopped listening; a failed cancel changes nothing.
    });
  }
}
