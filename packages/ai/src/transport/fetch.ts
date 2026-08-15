import { EventSourceParserStream } from "eventsource-parser/stream"

import type { EmendTransport } from "../protocol/controller.js"
import {
  createEmendError,
  isEmendErrorCode,
  type EmendAiError,
} from "../protocol/errors.js"
import type { EmendAiRequest, EmendStreamEvent } from "../protocol/types.js"
import { createStreamEventParser } from "../protocol/validate-stream.js"

export interface FetchTransportOptions {
  readonly url: string
  readonly headers?: HeadersInit
  readonly fetch?: typeof fetch
}

export function createFetchTransport(
  options: FetchTransportOptions
): EmendTransport {
  const fetchFn = options.fetch ?? globalThis.fetch

  return {
    async *run(
      request: EmendAiRequest,
      signal: AbortSignal
    ): AsyncIterable<EmendStreamEvent> {
      signal.throwIfAborted()

      let response: Response
      try {
        response = await fetchFn(options.url, {
          method: "POST",
          headers: createHeaders(options.headers),
          body: JSON.stringify(request),
          signal,
        })
      } catch {
        signal.throwIfAborted()
        throw toError(createEmendError("transport_error"))
      }

      if (!response.ok) throw toError(await readResponseError(response))
      if (!response.body) {
        throw toError(createEmendError("transport_error"))
      }

      const stream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream({ onError: "terminate" }))
      const reader = stream.getReader()
      const parser = createStreamEventParser(request.requestId)
      const abort = () => {
        void reader.cancel(signal.reason).catch(() => undefined)
      }

      signal.addEventListener("abort", abort, { once: true })

      try {
        while (true) {
          signal.throwIfAborted()
          const { done, value } = await reader.read()
          if (done) break

          const event = parseEvent(value.data, parser)
          if (event.type === "error") throw toError(event.error)

          yield event
          if (event.type === "done") return
        }

        const error = parser.finish()
        if (error) throw toError(error)
      } catch (error) {
        signal.throwIfAborted()
        if (isPublicError(error)) throw error
        throw toError(createEmendError("transport_error"))
      } finally {
        signal.removeEventListener("abort", abort)
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
    },
  }
}

function createHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers)
  result.set("accept", "text/event-stream")
  result.set("content-type", "application/json")
  return result
}

function parseEvent(
  data: string,
  parser: ReturnType<typeof createStreamEventParser>
): EmendStreamEvent {
  let input: unknown
  try {
    input = JSON.parse(data)
  } catch {
    throw toError(createEmendError("transport_error"))
  }

  const validation = parser.parse(input)
  if (!validation.ok) throw toError(validation.error)
  return validation.event
}

async function readResponseError(response: Response): Promise<EmendAiError> {
  try {
    const body: unknown = await response.json()
    const candidate = isRecord(body) && "error" in body ? body.error : body
    if (isEmendAiError(candidate)) {
      return {
        code: candidate.code,
        message: candidate.message,
        retryable: candidate.retryable,
      }
    }
  } catch {
    // Fall back to the status code below.
  }

  if (response.status === 401 || response.status === 403) {
    return createEmendError("unauthorized")
  }
  if (response.status === 413) return createEmendError("context_too_large")
  if (response.status === 429) return createEmendError("rate_limited")
  if ([400, 415, 422].includes(response.status)) {
    return createEmendError("invalid_request")
  }
  return createEmendError("transport_error")
}

function toError(error: EmendAiError): Error & EmendAiError {
  return Object.assign(new Error(error.message), error)
}

function isPublicError(error: unknown): error is Error & EmendAiError {
  return (
    error instanceof Error &&
    isEmendErrorCode((error as { readonly code?: unknown }).code)
  )
}

function isEmendAiError(value: unknown): value is EmendAiError {
  return (
    isRecord(value) &&
    isEmendErrorCode(value.code) &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
