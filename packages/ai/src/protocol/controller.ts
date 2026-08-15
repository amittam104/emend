import { createProposal, type EmendProposal } from "../proposal/index.js"
import { getAction } from "./actions.js"
import {
  createEmendError,
  isEmendErrorCode,
  publicError,
  type EmendAiError,
} from "./errors.js"
import { canTransition } from "./transitions.js"
import {
  PROTOCOL_VERSION,
  type EmendActionId,
  type EmendAiRequest,
  type EmendAiState,
  type EmendCaptureResult,
  type EmendContextScope,
  type EmendInteractionMode,
  type EmendMutationOperation,
  type EmendRequestLimits,
  type EmendSourceRevision,
  type EmendStreamEvent,
  type EmendTargetScope,
} from "./types.js"
import { parseRequest, type RequestValidation } from "./validate-request.js"

export interface EmendTransport {
  run(
    request: EmendAiRequest,
    signal: AbortSignal
  ): AsyncIterable<EmendStreamEvent>
}

export interface EmendCaptureOptions {
  readonly targetScope: EmendTargetScope
  readonly contextScope: EmendContextScope
  readonly mutationOperation: EmendMutationOperation | null
}

export interface EmendRunOptions {
  readonly interactionMode?: EmendInteractionMode
  readonly targetScope?: EmendTargetScope
  readonly contextScope?: EmendContextScope
  readonly mutationOperation?: EmendMutationOperation | null
  readonly instruction?: string
}

export interface EmendAiControllerOptions {
  readonly transport: EmendTransport
  readonly capture: (options: EmendCaptureOptions) => EmendCaptureResult
  readonly isSourceRevisionCurrent?: (
    sourceRevision: EmendSourceRevision
  ) => boolean
  readonly limits?: Partial<EmendRequestLimits>
  readonly createRequestId?: () => string
}

export interface EmendAiControllerSnapshot {
  readonly state: EmendAiState
  readonly activeRequest: EmendAiRequest | null
  readonly streamedMarkdown: string
  readonly informationalMarkdown: string
  readonly streamCompleted: boolean
  readonly error: EmendAiError | null
  readonly pendingProposal: EmendProposal | null
}

export type EmendAiControllerListener = (
  snapshot: EmendAiControllerSnapshot
) => void

interface ResolvedRunOptions extends EmendCaptureOptions {
  readonly interactionMode: EmendInteractionMode
}

interface LastRun {
  readonly actionId: EmendActionId
  readonly options: EmendRunOptions
}

const initialSnapshot: EmendAiControllerSnapshot = Object.freeze({
  state: "idle",
  activeRequest: null,
  streamedMarkdown: "",
  informationalMarkdown: "",
  streamCompleted: false,
  error: null,
  pendingProposal: null,
})

export class EmendAiController {
  private snapshot = initialSnapshot
  private readonly listeners = new Set<EmendAiControllerListener>()
  private readonly createRequestId: () => string
  private abortController: AbortController | null = null
  private generation = 0
  private lastRequest: EmendAiRequest | null = null
  private lastRun: LastRun | null = null

  constructor(private readonly options: EmendAiControllerOptions) {
    this.createRequestId = options.createRequestId ?? createRequestId
  }

  getSnapshot(): EmendAiControllerSnapshot {
    return this.snapshot
  }

  subscribe(listener: EmendAiControllerListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async run(
    actionId: EmendActionId,
    options: EmendRunOptions = {}
  ): Promise<void> {
    if (this.isRunning()) {
      this.report(createEmendError("request_in_progress"))
      return
    }

    const resolved = resolveRunOptions(actionId, options)
    if (!resolved.ok) {
      this.report(resolved.error)
      return
    }

    if (
      resolved.options.interactionMode === "edit" &&
      this.snapshot.pendingProposal
    ) {
      this.report(createEmendError("pending_review"))
      return
    }

    const validation = this.captureRequest(actionId, options, resolved.options)
    if (!validation.ok) {
      this.report(validation.error)
      return
    }

    this.lastRun = { actionId, options: Object.freeze({ ...options }) }
    this.begin(validation.request)
    await this.execute(validation.request)
  }

  cancel(): void {
    if (!this.isRunning()) return

    this.generation += 1
    this.abortController?.abort()
    this.abortController = null
    this.update({
      state: "aborted",
      streamCompleted: false,
      error: createEmendError("aborted"),
    })
  }

  async retry(): Promise<void> {
    const request = this.lastRequest
    if (
      !request ||
      (this.snapshot.state !== "error" && this.snapshot.state !== "aborted")
    ) {
      return
    }

    try {
      if (
        this.options.isSourceRevisionCurrent &&
        !this.options.isSourceRevisionCurrent(request.sourceRevision)
      ) {
        this.report(createEmendError("stale_revision"))
        return
      }
    } catch (error) {
      this.report(publicError(error))
      return
    }

    this.begin(request)
    await this.execute(request)
  }

  async regenerate(): Promise<void> {
    if (!this.lastRun) return

    const resolved = resolveRunOptions(
      this.lastRun.actionId,
      this.lastRun.options
    )
    if (!resolved.ok) {
      this.report(resolved.error)
      return
    }

    const validation = this.captureRequest(
      this.lastRun.actionId,
      this.lastRun.options,
      resolved.options
    )
    if (!validation.ok) {
      this.report(validation.error)
      return
    }

    this.begin(validation.request)
    await this.execute(validation.request)
  }

  reject(): void {
    if (this.isRunning()) this.cancel()

    this.generation += 1
    this.abortController?.abort()
    this.abortController = null
    this.lastRequest = null
    this.lastRun = null
    this.update({
      state: "idle",
      activeRequest: null,
      streamedMarkdown: "",
      informationalMarkdown: "",
      streamCompleted: false,
      error: null,
      pendingProposal: null,
    })
  }

  copy(): string | null {
    if (this.snapshot.pendingProposal) {
      return this.snapshot.pendingProposal.content.value
    }
    if (this.snapshot.informationalMarkdown) {
      return this.snapshot.informationalMarkdown
    }
    return this.snapshot.streamedMarkdown || null
  }

  private captureRequest(
    actionId: EmendActionId,
    options: EmendRunOptions,
    resolved: ResolvedRunOptions
  ): RequestValidation {
    try {
      const captured = this.options.capture(resolved)

      if (
        captured.targetScope !== resolved.targetScope ||
        captured.contextScope !== resolved.contextScope ||
        captured.mutationOperation !== resolved.mutationOperation
      ) {
        return {
          ok: false,
          error: createEmendError("invalid_request"),
        }
      }

      return parseRequest(
        {
          protocolVersion: PROTOCOL_VERSION,
          requestId: this.createRequestId(),
          actionId,
          interactionMode: resolved.interactionMode,
          targetScope: captured.targetScope,
          contextScope: captured.contextScope,
          mutationOperation: captured.mutationOperation,
          targetRange: captured.targetRange,
          targetMarkdown: captured.targetMarkdown,
          contextMarkdown: captured.contextMarkdown,
          ...(options.instruction !== undefined
            ? { instruction: options.instruction }
            : {}),
          sourceRevision: captured.sourceRevision,
          schemaCapabilities: captured.schemaCapabilities,
        },
        { limits: this.options.limits }
      )
    } catch (error) {
      return { ok: false, error: publicError(error) }
    }
  }

  private begin(request: EmendAiRequest): void {
    this.generation += 1
    this.abortController?.abort()

    if (this.isRunning()) {
      this.update({ state: "aborted" })
    }

    this.abortController = new AbortController()
    this.lastRequest = request
    this.update({
      state: "submitting",
      activeRequest: request,
      streamedMarkdown: "",
      informationalMarkdown: "",
      streamCompleted: false,
      error: null,
      pendingProposal:
        request.interactionMode === "ask"
          ? this.snapshot.pendingProposal
          : null,
    })
  }

  private async execute(request: EmendAiRequest): Promise<void> {
    const generation = this.generation
    const signal = this.abortController?.signal
    if (!signal) return

    try {
      for await (const event of this.options.transport.run(request, signal)) {
        if (!this.isActive(generation, request.requestId) || signal.aborted) {
          return
        }
        if (
          event.protocolVersion !== PROTOCOL_VERSION ||
          event.requestId !== request.requestId
        ) {
          continue
        }

        if (event.type === "text-delta") {
          this.update({
            state:
              this.snapshot.state === "submitting"
                ? "streaming"
                : this.snapshot.state,
            streamedMarkdown: this.snapshot.streamedMarkdown + event.delta,
          })
          continue
        }

        this.abortController = null
        if (event.type === "error") {
          this.update({ state: "error", error: event.error })
          return
        }

        this.complete(request)
        return
      }

      if (this.isActive(generation, request.requestId)) {
        this.abortController = null
        this.update({
          state: "error",
          error: createEmendError("transport_error"),
        })
      }
    } catch (error) {
      if (!this.isActive(generation, request.requestId)) return

      this.abortController = null
      if (signal.aborted || isAbortError(error)) {
        this.update({ state: "aborted", error: createEmendError("aborted") })
        return
      }

      this.update({ state: "error", error: toTransportError(error) })
    }
  }

  private complete(request: EmendAiRequest): void {
    const streamedMarkdown = this.snapshot.streamedMarkdown
    const informational = request.interactionMode === "ask"

    this.update({
      state: "reviewing",
      streamCompleted: true,
      error: null,
      informationalMarkdown: informational ? streamedMarkdown : "",
      pendingProposal: informational
        ? this.snapshot.pendingProposal
        : createProposal({
            id: request.requestId,
            actionId: request.actionId,
            request,
            content: { format: "markdown", value: streamedMarkdown },
          }),
    })
  }

  private isRunning(): boolean {
    return (
      this.snapshot.state === "submitting" ||
      this.snapshot.state === "streaming"
    )
  }

  private isActive(generation: number, requestId: string): boolean {
    return (
      generation === this.generation &&
      this.snapshot.activeRequest?.requestId === requestId
    )
  }

  private report(error: EmendAiError): void {
    this.update({ error })
  }

  private update(patch: Partial<EmendAiControllerSnapshot>): void {
    const nextState = patch.state ?? this.snapshot.state
    if (
      nextState !== this.snapshot.state &&
      !canTransition(this.snapshot.state, nextState)
    ) {
      throw new Error(
        `Invalid Emend controller transition: ${this.snapshot.state} -> ${nextState}`
      )
    }

    this.snapshot = Object.freeze({ ...this.snapshot, ...patch })
    for (const listener of this.listeners) listener(this.snapshot)
  }
}

type RunOptionsResolution =
  | { readonly ok: true; readonly options: ResolvedRunOptions }
  | { readonly ok: false; readonly error: EmendAiError }

function resolveRunOptions(
  actionId: EmendActionId,
  options: EmendRunOptions
): RunOptionsResolution {
  const action = getAction(actionId)
  if (!action) return { ok: false, error: createEmendError("invalid_action") }

  if (actionId === "custom" && options.interactionMode === undefined) {
    return { ok: false, error: createEmendError("invalid_action") }
  }

  const interactionMode =
    options.interactionMode ??
    (action.informational ? "ask" : action.allowedInteractionModes[0])
  const targetScope = options.targetScope ?? action.allowedTargetScopes[0]
  if (!interactionMode || !targetScope) {
    return { ok: false, error: createEmendError("invalid_action") }
  }

  if (
    actionId === "custom" &&
    interactionMode === "edit" &&
    (options.targetScope === undefined ||
      options.mutationOperation === undefined ||
      options.mutationOperation === null)
  ) {
    return { ok: false, error: createEmendError("invalid_action") }
  }

  const contextScope = options.contextScope ?? targetScope
  const mutationOperation =
    options.mutationOperation !== undefined
      ? options.mutationOperation
      : interactionMode === "ask"
        ? null
        : (action.allowedMutationOperations[0] ?? null)

  return {
    ok: true,
    options: {
      interactionMode,
      targetScope,
      contextScope,
      mutationOperation,
    },
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  )
}

function toTransportError(error: unknown): EmendAiError {
  if (error && typeof error === "object") {
    const value = error as {
      readonly code?: unknown
      readonly emendCode?: unknown
    }
    if (isEmendErrorCode(value.emendCode ?? value.code)) {
      return publicError(error)
    }
  }

  return createEmendError("transport_error")
}

function createRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `emend-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
