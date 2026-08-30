"use client"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon"
import CheckmarkCircle01Icon from "@hugeicons/core-free-icons/CheckmarkCircle01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon"
import StopIcon from "@hugeicons/core-free-icons/StopIcon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import type { UseEditorAiResult } from "@emend/ai/react"
import { useState } from "react"

export interface AiComposerReviewProps {
  readonly session: UseEditorAiResult
  readonly replayAllowed: boolean
}

export function AiComposerReview({
  session,
  replayAllowed,
}: AiComposerReviewProps) {
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
  const fallbackText =
    preparation?.kind === "plain-text-fallback" ? preparation.text : null
  const warnings = preparation?.warnings ?? []
  const proposalRenderedInline =
    isEditReview && Boolean(session.editorState?.previewKind)
  const showEditDetails =
    isEditReview &&
    (!proposalRenderedInline ||
      isBlocked ||
      Boolean(
        preparation &&
        preparation.kind !== "blocked" &&
        preparation.requiresDocumentConfirmation &&
        !isStale
      ))
  const canRetry =
    replayAllowed &&
    !isStale &&
    !isRunning &&
    (session.state === "error" || session.state === "aborted") &&
    session.error?.retryable === true
  const canRegenerate = replayAllowed && !isRunning
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
      className={
        proposalRenderedInline
          ? "max-w-lg space-y-2 rounded-3xl border border-border/60 bg-card p-1.5 text-card-foreground shadow-md"
          : "max-w-lg space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
      }
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

      {showEditDetails && (
        <div className="space-y-3">
          {!proposalRenderedInline && (
            <div className="relative">
              <Textarea
                className={cn(
                  "block min-h-40 resize-y rounded-[16px] bg-background px-3 py-2 font-mono text-sm leading-relaxed md:text-sm dark:bg-background",
                  warnings.length > 0 && "pb-9"
                )}
                aria-label={
                  fallbackText === null
                    ? "Editable Proposal Markdown"
                    : "Plain-text fallback"
                }
                readOnly={fallbackText !== null}
                value={fallbackText ?? proposalMarkdown}
                onChange={(event) => {
                  if (fallbackText === null) {
                    session.setProposalMarkdown(event.target.value)
                  }
                }}
              />
              <WarningButton
                warnings={warnings}
                className="absolute right-2 bottom-2"
              />
            </div>
          )}

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
              <Label
                htmlFor="confirm-document-replacement"
                className="items-start rounded-xl border border-destructive/30 bg-destructive/10 p-3 leading-normal font-normal"
              >
                <Checkbox
                  id="confirm-document-replacement"
                  className="mt-1"
                  checked={confirmDocumentReplacement}
                  onCheckedChange={(checked) =>
                    setConfirmation({
                      key: confirmationKey,
                      checked,
                    })
                  }
                />
                <span>
                  Confirm replacing the non-empty Document. This confirmation is
                  checked again when the proposal is applied.
                </span>
              </Label>
            )}
        </div>
      )}

      {isRunning && (
        <div className="flex justify-end">
          <ReviewAction
            label="Stop"
            icon={StopIcon}
            variant="outline"
            size="icon-sm"
            onClick={session.stop}
          />
        </div>
      )}

      {!isRunning && (isAsk || (!isEditReview && visibleError)) && (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <ReviewAction
              label="Copy"
              icon={Copy01Icon}
              disabled={!copyValue(session)}
              onClick={() => void copySession(session)}
            />
            {canRetry && (
              <ReviewAction
                label="Retry"
                icon={ReloadIcon}
                variant="outline"
                onClick={() => void session.retry()}
              />
            )}
            {canRegenerate && (
              <ReviewAction
                label="Regenerate"
                icon={Refresh01Icon}
                onClick={() => void session.regenerate()}
              />
            )}
          </div>
          {isAsk && (
            <ReviewAction
              label="Close"
              icon={Cancel01Icon}
              onClick={session.dismissInformationalResult}
            />
          )}
        </div>
      )}

      {!isRunning && isEditReview && (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <ReviewAction
              label="Copy"
              icon={Copy01Icon}
              disabled={!copyValue(session)}
              onClick={() => void copySession(session)}
            />
            {!isStale && canRegenerate && (
              <ReviewAction
                label="Regenerate"
                icon={Refresh01Icon}
                onClick={() => void session.regenerate()}
              />
            )}
            {proposalRenderedInline && <WarningButton warnings={warnings} />}
          </div>
          <div className="flex items-center gap-1">
            <ReviewAction
              label="Reject"
              icon={CancelCircleIcon}
              variant="destructive"
              size="icon-sm"
              onClick={() => session.reject()}
            />
            {isStale && canRegenerate ? (
              <ReviewAction
                label="Run again with current document"
                icon={Refresh01Icon}
                variant="default"
                size="icon-sm"
                onClick={() => void session.regenerate()}
              />
            ) : !isStale && !isBlocked ? (
              <ReviewAction
                label={isPlainTextFallback ? "Apply as plain text" : "Accept"}
                icon={CheckmarkCircle01Icon}
                variant="default"
                size="icon-sm"
                disabled={!canApply}
                onClick={() => session.accept(confirmDocumentReplacement)}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function ReviewAction({
  label,
  icon,
  variant = "ghost",
  size = "icon-xs",
  disabled,
  onClick,
}: {
  readonly label: string
  readonly icon: IconSvgElement
  readonly variant?: "default" | "destructive" | "ghost" | "outline"
  readonly size?: "icon-sm" | "icon-xs"
  readonly disabled?: boolean
  readonly onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            <HugeiconsIcon icon={icon} size={14} />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function WarningButton({
  warnings,
  className,
}: {
  readonly warnings: readonly {
    readonly code: string
    readonly message: string
  }[]
  readonly className?: string
}) {
  if (warnings.length === 0) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            type="button"
            className={cn(
              "text-amber-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400",
              className
            )}
            aria-label="View proposal warnings"
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={14} />
          </Button>
        }
      />
      <TooltipContent>
        <div className="space-y-1">
          {warnings.map((warning) => (
            <p key={warning.code}>{warning.message}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
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
