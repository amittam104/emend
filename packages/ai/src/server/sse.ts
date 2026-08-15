import { publicError } from "../protocol/errors.js"
import { PROTOCOL_VERSION, type EmendStreamEvent } from "../protocol/types.js"

export function createEmendSseStream(
  generate: AsyncIterable<string>,
  requestId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const encode = (event: EmendStreamEvent) =>
    encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  const iterator = generate[Symbol.asyncIterator]()
  let cancelled = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (!cancelled) {
          const result = await iterator.next()
          if (result.done) break

          controller.enqueue(
            encode({
              protocolVersion: PROTOCOL_VERSION,
              type: "text-delta",
              requestId,
              delta: result.value,
            })
          )
        }

        if (!cancelled) {
          controller.enqueue(
            encode({
              protocolVersion: PROTOCOL_VERSION,
              type: "done",
              requestId,
            })
          )
        }
      } catch (error) {
        if (!cancelled) {
          controller.enqueue(
            encode({
              protocolVersion: PROTOCOL_VERSION,
              type: "error",
              requestId,
              error: publicError(error, "provider_error"),
            })
          )
        }
      }

      if (!cancelled) controller.close()
    },
    async cancel(reason) {
      cancelled = true
      await iterator.return?.(reason)
    },
  })
}
