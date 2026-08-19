import type { Editor } from "@tiptap/core"
import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import {
  EmendAiController,
  type EmendAiControllerSnapshot,
  type EmendRunOptions,
  type EmendTransport,
} from "../protocol/controller.js"
import { createEmendError, type EmendAiError } from "../protocol/errors.js"
import type {
  EmendActionId,
  EmendAiRequest,
  EmendAiState,
  EmendRequestLimits,
} from "../protocol/types.js"
import {
  createEmendTiptapAdapter,
  type EmendTiptapAdapter,
  type EmendTiptapAdapterOptions,
} from "../tiptap/adapter.js"
import type {
  EmendTiptapApplyResult,
  EmendTiptapEditorState,
  EmendTiptapPreparation,
} from "../tiptap/types.js"
import type { EmendProposal } from "../proposal/index.js"

export interface UseEditorAiOptions {
  readonly editor: Editor | null
  readonly transport: EmendTransport
  readonly previewMode: "inline" | "card"
  readonly limits?: Partial<EmendRequestLimits>
  readonly linkProtocols?: readonly string[]
  readonly contextProjection?: string
}

export interface UseEditorAiResult {
  readonly state: EmendAiState
  readonly activeRequest: EmendAiRequest | null
  readonly streamedMarkdown: string
  readonly informationalMarkdown: string
  readonly streamCompleted: boolean
  readonly pendingProposal: EmendProposal | null
  readonly proposalMarkdown: string | null
  readonly preparation: EmendTiptapPreparation | null
  readonly error: EmendAiError | null
  readonly reviewError: EmendAiError | null
  readonly editorState: EmendTiptapEditorState | null
  readonly stale: boolean
  readonly run: (
    actionId: EmendActionId,
    options?: EmendRunOptions
  ) => Promise<void>
  readonly stop: () => void
  readonly retry: () => Promise<void>
  readonly regenerate: () => Promise<void>
  readonly setProposalMarkdown: (markdown: string) => void
  readonly accept: (
    confirmDocumentReplacement?: boolean
  ) => EmendTiptapApplyResult
  readonly reject: () => EmendTiptapApplyResult
  readonly dismissInformationalResult: () => void
  readonly copy: () => string | null
}

interface SessionSnapshot {
  readonly controller: EmendAiControllerSnapshot
  readonly proposalMarkdown: string | null
  readonly preparation: EmendTiptapPreparation | null
  readonly reviewError: EmendAiError | null
  readonly editorState: EmendTiptapEditorState | null
}

interface SessionStore {
  readonly getSnapshot: () => SessionSnapshot
  readonly getSession: () => Session | null
  readonly setSession: (session: Session | null) => void
  readonly subscribe: (listener: () => void) => () => void
  readonly publish: (snapshot: SessionSnapshot) => void
  readonly reset: () => void
}

interface Session {
  readonly editor: Editor
  readonly adapter: EmendTiptapAdapter
  readonly controller: EmendAiController
  readonly store: SessionStore
  previewMode: "inline" | "card"
  controllerSnapshot: EmendAiControllerSnapshot
  proposalId: string | null
  proposalMarkdown: string | null
  preparation: EmendTiptapPreparation | null
  reviewError: EmendAiError | null
  editorState: EmendTiptapEditorState | null
  disposed: boolean
}

const EMPTY_CONTROLLER_SNAPSHOT: EmendAiControllerSnapshot = Object.freeze({
  state: "idle",
  activeRequest: null,
  streamedMarkdown: "",
  informationalMarkdown: "",
  streamCompleted: false,
  error: null,
  pendingProposal: null,
})

const EMPTY_SESSION_SNAPSHOT: SessionSnapshot = Object.freeze({
  controller: EMPTY_CONTROLLER_SNAPSHOT,
  proposalMarkdown: null,
  preparation: null,
  reviewError: null,
  editorState: null,
})

export function useEditorAi(options: UseEditorAiOptions): UseEditorAiResult {
  const {
    editor,
    transport,
    previewMode,
    limits,
    linkProtocols,
    contextProjection,
  } = options
  const [store] = useState<SessionStore>(createSessionStore)
  const limitsKey = getLimitsKey(limits)
  const linkProtocolsKey = getLinkProtocolsKey(linkProtocols)

  useEffect(() => {
    if (!editor) {
      resetStore(store)
      return
    }

    const adapterOptions: EmendTiptapAdapterOptions = {
      limits,
      linkProtocols,
      contextProjection,
    }
    const adapter = createEmendTiptapAdapter(editor, adapterOptions)
    const controller = new EmendAiController({
      transport,
      capture: adapter.capture,
      isSourceRevisionCurrent: adapter.isSourceRevisionCurrent,
      limits,
    })
    const session: Session = {
      editor,
      adapter,
      controller,
      store,
      previewMode,
      controllerSnapshot: controller.getSnapshot(),
      proposalId: null,
      proposalMarkdown: null,
      preparation: null,
      reviewError: null,
      editorState: adapter.getEditorState(),
      disposed: false,
    }
    store.setSession(session)
    publish(session)

    const unsubscribe = controller.subscribe((snapshot) => {
      handleControllerSnapshot(session, snapshot)
    })
    const onTransaction = () => {
      session.editorState = adapter.getEditorState()
      publish(session)
    }
    editor.on("transaction", onTransaction)

    return () => {
      session.disposed = true
      unsubscribe()
      editor.off("transaction", onTransaction)
      controller.cancel()
      adapter.destroy()
      if (store.getSession() === session) resetStore(store)
    }
    // These serialized keys intentionally replace object and array identity.
    // Preview mode is presentation state and must not recreate the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextProjection, editor, limitsKey, linkProtocolsKey, store, transport])

  useEffect(() => {
    const session = store.getSession()
    if (!session) return

    setPreviewMode(session, previewMode)
    showCurrentPresentation(session)
  }, [previewMode, store])

  const subscribe = useCallback(
    (listener: () => void) => {
      return store.subscribe(listener)
    },
    [store]
  )
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])
  const getServerSnapshot = useCallback(() => EMPTY_SESSION_SNAPSHOT, [])
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const run = useCallback(
    (actionId: EmendActionId, runOptions?: EmendRunOptions) =>
      store.getSession()?.controller.run(actionId, runOptions) ??
      Promise.resolve(),
    [store]
  )
  const stop = useCallback(() => {
    store.getSession()?.controller.cancel()
  }, [store])
  const retry = useCallback(
    () => store.getSession()?.controller.retry() ?? Promise.resolve(),
    [store]
  )
  const regenerate = useCallback(
    () => store.getSession()?.controller.regenerate() ?? Promise.resolve(),
    [store]
  )
  const setProposalMarkdown = useCallback(
    (markdown: string) => {
      const session = store.getSession()
      const proposal = session?.controllerSnapshot.pendingProposal
      if (!session || !proposal) return

      setSessionProposalMarkdown(session, markdown)
      prepareAndShow(
        session,
        proposal,
        markdown === proposal.content.value ? undefined : markdown
      )
    },
    [store]
  )
  const accept = useCallback(
    (confirmDocumentReplacement = false): EmendTiptapApplyResult => {
      const session = store.getSession()
      const proposal = session?.controllerSnapshot.pendingProposal
      const preparation = session?.preparation
      if (!session) return failure("editor_not_configured")
      if (!proposal || !preparation) return failure("invalid_request")

      const result = session.adapter.accept(proposal, preparation, {
        confirmDocumentReplacement,
      })
      if (!result.ok) {
        setReviewError(session, result.error)
        publish(session)
        return result
      }

      if (!session.controller.clearPendingProposal(proposal.id)) {
        const error = createEmendError("invalid_request")
        setReviewError(session, error)
        publish(session)
        return { ok: false, error }
      }
      return result
    },
    [store]
  )
  const reject = useCallback((): EmendTiptapApplyResult => {
    const session = store.getSession()
    const proposal = session?.controllerSnapshot.pendingProposal
    if (!session) return failure("editor_not_configured")
    if (!proposal) return failure("invalid_request")

    const result = session.adapter.reject(proposal.id)
    if (!result.ok) {
      setReviewError(session, result.error)
      publish(session)
      return result
    }

    if (!session.controller.clearPendingProposal(proposal.id)) {
      const error = createEmendError("invalid_request")
      setReviewError(session, error)
      publish(session)
      return { ok: false, error }
    }
    return result
  }, [store])
  const dismissInformationalResult = useCallback(() => {
    store.getSession()?.controller.dismissInformationalResult()
  }, [store])
  const copy = useCallback(() => {
    const session = store.getSession()
    if (!session) return null

    const snapshot = session.controllerSnapshot
    if (snapshot.activeRequest?.interactionMode === "ask") {
      return snapshot.informationalMarkdown || snapshot.streamedMarkdown || null
    }
    if (session.proposalMarkdown !== null) return session.proposalMarkdown
    return session.controller.copy()
  }, [store])

  return {
    state: current.controller.state,
    activeRequest: current.controller.activeRequest,
    streamedMarkdown: current.controller.streamedMarkdown,
    informationalMarkdown: current.controller.informationalMarkdown,
    streamCompleted: current.controller.streamCompleted,
    pendingProposal: current.controller.pendingProposal,
    proposalMarkdown: current.proposalMarkdown,
    preparation: current.preparation,
    error: current.controller.error,
    reviewError: current.reviewError,
    editorState: current.editorState,
    stale: isStale(current),
    run,
    stop,
    retry,
    regenerate,
    setProposalMarkdown,
    accept,
    reject,
    dismissInformationalResult,
    copy,
  }
}

function handleControllerSnapshot(
  session: Session,
  snapshot: EmendAiControllerSnapshot
): void {
  if (session.disposed) return

  const previousProposalId = session.proposalId
  session.controllerSnapshot = snapshot
  const proposal = snapshot.pendingProposal

  if (!proposal) {
    if (previousProposalId !== null) clearReview(session)
  } else if (proposal.id !== previousProposalId) {
    session.proposalId = proposal.id
    session.proposalMarkdown = proposal.content.value
    session.preparation = null
    session.reviewError = null
    if (proposal.request.interactionMode === "edit") {
      prepareAndShow(session, proposal)
    }
  }

  session.editorState = session.adapter.getEditorState()
  publish(session)
}

function prepareAndShow(
  session: Session,
  proposal: EmendProposal,
  editedMarkdown?: string
): void {
  const preparation = session.adapter.prepare(proposal, editedMarkdown)
  session.preparation = preparation
  session.reviewError = null

  if (preparation.kind === "blocked") {
    const hidden = session.adapter.hide(proposal.id)
    if (!hidden.ok) session.reviewError = hidden.error
    session.editorState = session.adapter.getEditorState()
    publish(session)
    return
  }

  const shown = session.adapter.show(proposal, preparation, {
    inlinePreview: session.previewMode === "inline",
  })
  if (!shown.ok) {
    session.reviewError = shown.error
    const hidden = session.adapter.hide(proposal.id)
    if (!hidden.ok) session.reviewError = hidden.error
  }
  session.editorState = session.adapter.getEditorState()
  publish(session)
}

function showCurrentPresentation(session: Session): void {
  const proposal = session.controllerSnapshot.pendingProposal
  const preparation = session.preparation
  if (!proposal || !preparation || preparation.kind === "blocked") return

  const shown = session.adapter.show(proposal, preparation, {
    inlinePreview: session.previewMode === "inline",
  })
  session.reviewError = shown.ok ? null : shown.error
  if (!shown.ok) {
    const hidden = session.adapter.hide(proposal.id)
    if (!hidden.ok) session.reviewError = hidden.error
  }
  session.editorState = session.adapter.getEditorState()
  publish(session)
}

function clearReview(session: Session): void {
  session.proposalId = null
  session.proposalMarkdown = null
  session.preparation = null
  session.reviewError = null
}

function isStale(snapshot: SessionSnapshot): boolean {
  return (
    snapshot.editorState?.stale === true ||
    snapshot.reviewError?.code === "stale_revision" ||
    (snapshot.preparation?.kind === "blocked" &&
      snapshot.preparation.error.code === "stale_revision")
  )
}

function publish(session: Session): void {
  if (session.disposed || session.store.getSession() !== session) return
  session.store.publish({
    controller: session.controllerSnapshot,
    proposalMarkdown: session.proposalMarkdown,
    preparation: session.preparation,
    reviewError: session.reviewError,
    editorState: session.editorState,
  })
}

function resetStore(store: SessionStore): void {
  store.reset()
}

function createSessionStore(): SessionStore {
  let snapshot = EMPTY_SESSION_SNAPSHOT
  let session: Session | null = null
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => snapshot,
    getSession: () => session,
    setSession: (next) => {
      session = next
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    publish: (next) => {
      snapshot = Object.freeze(next)
      for (const listener of listeners) listener()
    },
    reset: () => {
      session = null
      snapshot = EMPTY_SESSION_SNAPSHOT
      for (const listener of listeners) listener()
    },
  }
}

function setPreviewMode(
  session: Session,
  previewMode: "inline" | "card"
): void {
  session.previewMode = previewMode
}

function setSessionProposalMarkdown(session: Session, markdown: string): void {
  session.proposalMarkdown = markdown
}

function setReviewError(session: Session, error: EmendAiError | null): void {
  session.reviewError = error
}

function getLimitsKey(limits?: Partial<EmendRequestLimits>): string {
  return [
    limits?.maxRequestIdLength ?? "",
    limits?.maxTargetMarkdownLength ?? "",
    limits?.maxContextMarkdownLength ?? "",
    limits?.maxInstructionLength ?? "",
    limits?.maxActionIdLength ?? "",
    limits?.maxCapabilityNameLength ?? "",
  ].join("|")
}

function getLinkProtocolsKey(linkProtocols?: readonly string[]): string {
  return JSON.stringify(linkProtocols ?? null)
}

function failure(
  code: "editor_not_configured" | "invalid_request"
): EmendTiptapApplyResult {
  return { ok: false, error: createEmendError(code) }
}
