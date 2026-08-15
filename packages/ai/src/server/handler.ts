import type { EmendActionManifestEntry } from "../protocol/actions.js"
import { createEmendError, type EmendAiError } from "../protocol/errors.js"
import type { EmendAiRequest, EmendRequestLimits } from "../protocol/types.js"
import { parseRequest } from "../protocol/validate-request.js"
import { createEmendSseStream } from "./sse.js"

export interface EmendAiHandlerOptions {
  readonly generate: (
    request: EmendAiRequest,
    signal: AbortSignal
  ) => AsyncIterable<string>
  readonly authorize?: (
    request: Request,
    payload: EmendAiRequest
  ) => Promise<boolean> | boolean
  readonly manifest?: readonly EmendActionManifestEntry[]
  readonly limits?: Partial<EmendRequestLimits>
}

export function createEmendAiHandler(
  options: EmendAiHandlerOptions
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") {
      return errorResponse(createEmendError("invalid_request"), 405, {
        allow: "POST",
      })
    }

    if (!isJsonContentType(request.headers.get("content-type"))) {
      return errorResponse(createEmendError("invalid_request"), 415)
    }

    let input: unknown
    try {
      input = await request.json()
    } catch {
      return errorResponse(createEmendError("invalid_request"), 400)
    }

    const validation = parseRequest(input, {
      manifest: options.manifest,
      limits: options.limits,
    })
    if (!validation.ok) {
      const status = validation.error.code === "context_too_large" ? 413 : 400
      return errorResponse(validation.error, status)
    }
    const validatedRequest = validation.request

    try {
      if (
        options.authorize &&
        !(await options.authorize(request, validatedRequest))
      ) {
        return errorResponse(createEmendError("unauthorized"), 401)
      }
    } catch {
      return errorResponse(createEmendError("internal_error"), 500)
    }

    async function* generate(): AsyncIterable<string> {
      yield* options.generate(validatedRequest, request.signal)
    }

    const stream = createEmendSseStream(generate(), validatedRequest.requestId)

    return new Response(stream, {
      headers: {
        "cache-control": "no-cache, no-transform",
        "content-type": "text/event-stream; charset=utf-8",
      },
    })
  }
}

function isJsonContentType(contentType: string | null): boolean {
  return (
    contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json"
  )
}

function errorResponse(
  error: EmendAiError,
  status: number,
  headers?: HeadersInit
): Response {
  return Response.json({ error }, { status, headers })
}
