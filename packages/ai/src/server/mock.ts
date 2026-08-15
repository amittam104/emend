import type { EmendAiRequest } from "../protocol/types.js"
import {
  createMockTransport,
  type MockTransportOptions,
} from "../transport/mock.js"

export async function* mockGenerate(
  request: EmendAiRequest,
  signal: AbortSignal,
  options: MockTransportOptions = {}
): AsyncIterable<string> {
  const transport = createMockTransport(options)

  for await (const event of transport.run(request, signal)) {
    if (event.type === "text-delta") {
      yield event.delta
      continue
    }
    if (event.type === "error") throw event.error
    return
  }
}
