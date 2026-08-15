import type { EmendTransport } from "../protocol/controller.js"
import { createEmendError } from "../protocol/errors.js"
import {
  PROTOCOL_VERSION,
  type EmendAiRequest,
  type EmendStreamEvent,
} from "../protocol/types.js"

export interface MockTransportOptions {
  readonly delayMs?: number
  readonly failAfterDeltas?: number
}

export function createMockTransport(
  options: MockTransportOptions = {}
): EmendTransport {
  return {
    async *run(
      request: EmendAiRequest,
      signal: AbortSignal
    ): AsyncIterable<EmendStreamEvent> {
      const chunks = splitAtWordBoundaries(createMockMarkdown(request))
      let emittedDeltas = 0

      for (const delta of chunks) {
        signal.throwIfAborted()
        if (emittedDeltas === options.failAfterDeltas) {
          yield createFailureEvent(request.requestId)
          return
        }

        if (options.delayMs && options.delayMs > 0) {
          await wait(options.delayMs, signal)
        }
        signal.throwIfAborted()

        yield {
          protocolVersion: PROTOCOL_VERSION,
          type: "text-delta",
          requestId: request.requestId,
          delta,
        }
        emittedDeltas += 1
      }

      signal.throwIfAborted()
      if (emittedDeltas === options.failAfterDeltas) {
        yield createFailureEvent(request.requestId)
        return
      }

      yield {
        protocolVersion: PROTOCOL_VERSION,
        type: "done",
        requestId: request.requestId,
      }
    },
  }
}

function createMockMarkdown(request: EmendAiRequest): string {
  const source = request.targetMarkdown.trim() || request.contextMarkdown.trim()

  switch (request.actionId) {
    case "improve":
      return source ? `A clearer rewrite:\n\n${source}` : "A clearer rewrite."
    case "shorten":
      return source.split(/\s+/).slice(0, 12).join(" ")
    case "expand":
      return `${source}\n\nHere is one supporting detail that strengthens the main point.`
    case "fix-grammar":
      return source.replace(/\bi\b/g, "I").replace(/\s+/g, " ")
    case "continue":
      return "Continue with the next practical idea in the same tone."
    case "summarize":
      return `Summary:\n\n${
        source.slice(0, 240) || "There is no content to summarize yet."
      }`
    case "custom":
      return source
        ? `${source}\n\nInstruction: ${request.instruction ?? ""}`
        : `Instruction: ${request.instruction ?? ""}`
    default:
      return source
  }
}

function splitAtWordBoundaries(value: string): readonly string[] {
  return value.match(/\S+\s*|\s+/g) ?? []
}

function createFailureEvent(requestId: string): EmendStreamEvent {
  return {
    protocolVersion: PROTOCOL_VERSION,
    type: "error",
    requestId,
    error: createEmendError("provider_error"),
  }
}

async function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()

  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timeout)
      reject(signal.reason)
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, delayMs)

    signal.addEventListener("abort", abort, { once: true })
  })
}
