"use client"

import { useState } from "react"
import type { UseEditorAiResult } from "./use-emend-ai-session.js"

export interface AiReviewCardProps {
  readonly session: UseEditorAiResult
}

export function AiReviewCard({ session }: AiReviewCardProps) {
  const [confirmation, setConfirmation] = useState<{
    readonly key: string
    readonly checked: boolean
  }>({ key: "", checked: false })
  const pendingProposal = session.pendingProposal
  const proposalMarkdown =
    session.proposalMarkdown ?? pendingProposal?.content.value ?? ""
  const confirmationKey = `${pendingProposal?.id ?? ""}:${proposalMarkdown}`
  const confirmDocumentReplacement =
    confirmation.key === confirmationKey && confirmation.checked
  const preparation = session.preparation
  const isRunning =
    session.state === "submitting" || session.state === "streaming"
  const isAsk = session.activeRequest?.interactionMode === "ask"
  const isEditReview =
    !isAsk &&
    pendingProposal !== null &&
    pendingProposal.request.interactionMode === "edit"
  const isStale = session.stale
  const isBlocked = isEditReview && preparation?.kind === "blocked"
  const isPlainTextFallback =
    isEditReview && preparation?.kind === "plain-text-fallback"
  const canRetry =
    !isStale &&
    !isRunning &&
    (session.state === "error" || session.state === "aborted") &&
    session.error?.retryable === true
  const canRegenerate = Boolean(session.activeRequest) && !isRunning
  const canApply =
    isEditReview &&
    !isStale &&
    session.streamCompleted &&
    preparation?.kind !== "blocked" &&
    (preparation?.kind === "supported-markdown" ||
      preparation?.kind === "plain-text-fallback") &&
    (!preparation.requiresDocumentConfirmation || confirmDocumentReplacement)
  const statusMessage = getStatusMessage({
    isAsk,
    isBlocked,
    isPlainTextFallback,
    isRunning,
    isStale,
    state: session.state,
  })
  const visibleError = session.error ?? session.reviewError

  if (session.state === "idle" && !isEditReview && !isAsk && !visibleError) {
    return null
  }

  return (
    <section
      className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
      data-emend-review
      aria-label="AI review"
    >
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      {visibleError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {visibleError.message}
        </p>
      )}

      {isRunning && (
        <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {session.streamedMarkdown || "Generating proposal…"}
        </pre>
      )}

      {isAsk && !isRunning && (
        <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {session.informationalMarkdown || session.streamedMarkdown}
        </pre>
      )}

      {!isRunning && !isAsk && !isEditReview && visibleError && (
        <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {session.streamedMarkdown || "No partial output was received."}
        </pre>
      )}

      {isEditReview && (
        <div className="space-y-3">
          <label className="grid gap-2 text-sm font-medium">
            Proposal Markdown
            <textarea
              className="min-h-40 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              aria-label="Editable Proposal Markdown"
              value={proposalMarkdown}
              onChange={(event) =>
                session.setProposalMarkdown(event.target.value)
              }
            />
          </label>

          {isPlainTextFallback &&
            preparation.kind === "plain-text-fallback" && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Plain-text fallback
                </p>
                <pre className="mt-2 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {preparation.text}
                </pre>
              </div>
            )}

          {preparation?.warnings.map((warning) => (
            <p
              key={warning.code}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
            >
              {warning.message}
            </p>
          ))}

          {isBlocked && preparation.kind === "blocked" && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {preparation.error.message}
            </p>
          )}

          {preparation &&
            preparation.kind !== "blocked" &&
            preparation.requiresDocumentConfirmation &&
            !isStale && (
              <label className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={confirmDocumentReplacement}
                  onChange={(event) =>
                    setConfirmation({
                      key: confirmationKey,
                      checked: event.target.checked,
                    })
                  }
                />
                <span>
                  Confirm replacing the non-empty Document. This confirmation is
                  checked again when the proposal is applied.
                </span>
              </label>
            )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isRunning && (
          <button
            type="button"
            className={buttonClass("outline")}
            onClick={session.stop}
          >
            Stop
          </button>
        )}

        {!isRunning && (isAsk || (!isEditReview && visibleError)) && (
          <>
            <button
              type="button"
              className={buttonClass("outline")}
              disabled={!copyValue(session)}
              onClick={() => void copySession(session)}
            >
              Copy
            </button>
            {canRetry && (
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={() => void session.retry()}
              >
                Retry
              </button>
            )}
            {canRegenerate && (
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={() => void session.regenerate()}
              >
                Regenerate
              </button>
            )}
            {isAsk && (
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={session.dismissInformationalResult}
              >
                Close
              </button>
            )}
          </>
        )}

        {!isRunning && isEditReview && (
          <>
            <button
              type="button"
              className={buttonClass("outline")}
              disabled={!copyValue(session)}
              onClick={() => void copySession(session)}
            >
              Copy
            </button>
            {!isStale && canRegenerate && (
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={() => void session.regenerate()}
              >
                Regenerate
              </button>
            )}
            <button
              type="button"
              className={buttonClass("destructive")}
              onClick={() => session.reject()}
            >
              Reject
            </button>
            {isStale ? (
              <button
                type="button"
                className={buttonClass("primary")}
                onClick={() => void session.regenerate()}
              >
                Run again with current document
              </button>
            ) : !isBlocked ? (
              <button
                type="button"
                className={buttonClass("primary")}
                disabled={!canApply}
                onClick={() => session.accept(confirmDocumentReplacement)}
              >
                {isPlainTextFallback ? "Apply as plain text" : "Accept"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function buttonClass(variant: "destructive" | "outline" | "primary"): string {
  const base =
    "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
  if (variant === "primary") {
    return `${base} border-primary bg-primary text-primary-foreground hover:bg-primary/80`
  }
  if (variant === "destructive") {
    return `${base} border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20`
  }
  return `${base} border-border bg-background hover:bg-muted`
}

function copyValue(session: UseEditorAiResult): string | null {
  return session.copy()
}

async function copySession(session: UseEditorAiResult): Promise<void> {
  const value = copyValue(session)
  if (!value || typeof navigator === "undefined" || !navigator.clipboard) return

  await navigator.clipboard.writeText(value).catch(() => undefined)
}

function getStatusMessage(input: {
  readonly isAsk: boolean
  readonly isBlocked: boolean
  readonly isPlainTextFallback: boolean
  readonly isRunning: boolean
  readonly isStale: boolean
  readonly state: UseEditorAiResult["state"]
}): string {
  if (input.isRunning) return "Generating…"
  if (input.isStale) return "Proposal is stale"
  if (input.isBlocked) return "Proposal needs an edit"
  if (input.isPlainTextFallback) return "Review plain-text fallback"
  if (input.isAsk) return "Review response"
  if (input.state === "aborted") return "Request stopped"
  if (input.state === "error") return "Request needs attention"
  return "Review proposal"
}
