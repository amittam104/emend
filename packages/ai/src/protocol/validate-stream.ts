import {
  createEmendError,
  isEmendErrorCode,
  type EmendAiError,
} from "./errors.js"
import { PROTOCOL_VERSION, type EmendStreamEvent } from "./types.js"

export type StreamEventValidation =
  | { readonly ok: true; readonly event: EmendStreamEvent }
  | { readonly ok: false; readonly error: EmendAiError }

export interface EmendStreamEventParser {
  parse(input: unknown): StreamEventValidation
  finish(): EmendAiError | null
}

const eventTypes = ["text-delta", "done", "error"] as const

export function parseStreamEvent(
  input: unknown,
  expectedRequestId: string
): StreamEventValidation {
  if (!isRecord(input)) return invalidStream()
  if (input.protocolVersion !== PROTOCOL_VERSION) {
    return { ok: false, error: createEmendError("invalid_protocol") }
  }
  if (input.requestId !== expectedRequestId) return invalidStream()
  if (!isOneOf(input.type, eventTypes)) return invalidStream()

  switch (input.type) {
    case "text-delta":
      if (
        !hasExactKeys(input, [
          "protocolVersion",
          "type",
          "requestId",
          "delta",
        ]) ||
        typeof input.delta !== "string"
      ) {
        return invalidStream()
      }
      return {
        ok: true,
        event: {
          protocolVersion: PROTOCOL_VERSION,
          type: "text-delta",
          requestId: expectedRequestId,
          delta: input.delta,
        },
      }
    case "done":
      if (!hasExactKeys(input, ["protocolVersion", "type", "requestId"])) {
        return invalidStream()
      }
      return {
        ok: true,
        event: {
          protocolVersion: PROTOCOL_VERSION,
          type: "done",
          requestId: expectedRequestId,
        },
      }
    case "error":
      if (
        !hasExactKeys(input, [
          "protocolVersion",
          "type",
          "requestId",
          "error",
        ]) ||
        !isPublicError(input.error)
      ) {
        return invalidStream()
      }
      return {
        ok: true,
        event: {
          protocolVersion: PROTOCOL_VERSION,
          type: "error",
          requestId: expectedRequestId,
          error: input.error,
        },
      }
  }
}

export function createStreamEventParser(
  expectedRequestId: string
): EmendStreamEventParser {
  let terminal: "done" | "error" | null = null

  return {
    parse(input) {
      if (terminal !== null) return invalidStream()

      const validation = parseStreamEvent(input, expectedRequestId)
      if (validation.ok && validation.event.type !== "text-delta") {
        terminal = validation.event.type
      }
      return validation
    },
    finish() {
      return terminal === "done" ? null : createEmendError("transport_error")
    },
  }
}

function invalidStream(): StreamEventValidation {
  return { ok: false, error: createEmendError("transport_error") }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[]
): boolean {
  const allowed = new Set(required)
  return (
    Reflect.ownKeys(value).every(
      (key) => typeof key === "string" && allowed.has(key)
    ) && required.every((key) => Object.hasOwn(value, key))
  )
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T)
}

function isPublicError(value: unknown): value is EmendAiError {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["code", "message", "retryable"]) ||
    !isEmendErrorCode(value.code) ||
    typeof value.message !== "string" ||
    typeof value.retryable !== "boolean"
  ) {
    return false
  }

  return true
}
