import { publicError } from "../protocol/errors.js"
import { PROTOCOL_VERSION, type EmendStreamEvent } from "../protocol/types.js"

export function createEmendSseStream(
  generate: AsyncIterable<string>,
  requestId: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const encode = (event: EmendStreamEvent) =>
    encoder.encode(`data: ${JSON.stringify(event)}\n\n`)

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of generate) {
          controller.enqueue(
            encode({
              protocolVersion: PROTOCOL_VERSION,
              type: "text-delta",
              requestId,
              delta,
            })
          )
        }

        controller.enqueue(
          encode({
            protocolVersion: PROTOCOL_VERSION,
            type: "done",
            requestId,
          })
        )
      } catch (error) {
        controller.enqueue(
          encode({
            protocolVersion: PROTOCOL_VERSION,
            type: "error",
            requestId,
            error: publicError(error, "provider_error"),
          })
        )
      }

      controller.close()
    },
  })
}
