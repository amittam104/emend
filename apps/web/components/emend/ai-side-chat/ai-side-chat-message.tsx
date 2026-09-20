"use client"

import { setEmendSelectionDecoration } from "@emend/ai/tiptap"
import type { UseEditorAiOptions, UseEditorAiResult } from "@emend/ai/react"
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon"
import CheckmarkCircle01Icon from "@hugeicons/core-free-icons/CheckmarkCircle01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon"
import StopIcon from "@hugeicons/core-free-icons/StopIcon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEffect, useState } from "react"

export function AiSideChatMessage({
  editor,
  session,
}: {
  readonly editor: UseEditorAiOptions["editor"]
  readonly session: UseEditorAiResult
}) {
  const [confirmation, setConfirmation] = useState({ key: "", checked: false })
  const request = session.activeRequest
  const pendingProposal = session.pendingProposal
  const proposalMarkdown =
    session.proposalMarkdown ?? pendingProposal?.content.value ?? ""
  const confirmationKey = `${pendingProposal?.id ?? ""}:${proposalMarkdown}`
  const confirmDocumentReplacement =
    confirmation.key === confirmationKey && confirmation.checked
  const preparation = session.preparation
  const isRunning =
    session.state === "submitting" || session.state === "streaming"
  const isAsk = request?.interactionMode === "ask"
  const isEdit = pendingProposal?.request.interactionMode === "edit"
  const isBlocked = isEdit && preparation?.kind === "blocked"
  const isPlainTextFallback =
    isEdit && preparation?.kind === "plain-text-fallback"
  const proposalRenderedInline =
    isEdit && Boolean(session.editorState?.previewKind)
  const visibleError = session.error ?? session.reviewError
  const canRetry =
    !session.stale &&
    !isRunning &&
    (session.state === "error" || session.state === "aborted") &&
    session.error?.retryable === true
  const canRegenerate = Boolean(request) && !isRunning
  const canApply =
    isEdit &&
    !session.stale &&
    session.streamCompleted &&
    preparation?.kind !== "blocked" &&
    (preparation?.kind === "supported-markdown" ||
      preparation?.kind === "plain-text-fallback") &&
    (!preparation.requiresDocumentConfirmation || confirmDocumentReplacement)

  useEffect(
    () => () => {
      setEmendSelectionDecoration(editor, null)
    },
    [editor]
  )

  function highlightTarget(active: boolean) {
    const range = request?.targetRange
    setEmendSelectionDecoration(editor, active && range ? range : null)
  }

  return (
    <div
      className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3 text-sm text-foreground"
      onMouseEnter={() => highlightTarget(true)}
      onMouseLeave={() => highlightTarget(false)}
      onFocusCapture={() => highlightTarget(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          highlightTarget(false)
        }
      }}
    >
      {visibleError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
          role="alert"
        >
          {visibleError.message}
        </p>
      )}

      {isRunning && (
        <p className="leading-relaxed whitespace-pre-wrap">
          {session.streamedMarkdown || "Thinking…"}
        </p>
      )}

      {isAsk && !isRunning && (
        <p className="leading-relaxed whitespace-pre-wrap">
          {session.informationalMarkdown || session.streamedMarkdown}
        </p>
      )}

      {!isRunning && !isAsk && !isEdit && visibleError && (
        <p className="leading-relaxed whitespace-pre-wrap">
          {session.streamedMarkdown || "No response was received."}
        </p>
      )}

      {isEdit && (
        <div className="space-y-3">
          {!proposalRenderedInline && (
            <Textarea
              className="h-44 resize-none overflow-y-auto bg-background font-mono text-sm leading-relaxed md:text-sm dark:bg-background"
              aria-label={
                isPlainTextFallback
                  ? "Plain-text proposal"
                  : "Editable proposal Markdown"
              }
              readOnly={isPlainTextFallback}
              value={
                isPlainTextFallback &&
                preparation.kind === "plain-text-fallback"
                  ? preparation.text
                  : proposalMarkdown
              }
              onChange={(event) =>
                session.setProposalMarkdown(event.target.value)
              }
            />
          )}

          {isBlocked && preparation.kind === "blocked" && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
              role="alert"
            >
              {preparation.error.message}
            </p>
          )}

          {preparation &&
            preparation.kind !== "blocked" &&
            preparation.requiresDocumentConfirmation &&
            !session.stale && (
              <Label className="items-start rounded-xl border border-destructive/30 bg-destructive/10 p-3 leading-normal font-normal">
                <Checkbox
                  className="mt-1"
                  checked={confirmDocumentReplacement}
                  onCheckedChange={(checked) =>
                    setConfirmation({
                      key: confirmationKey,
                      checked,
                    })
                  }
                />
                Confirm replacing the non-empty Document.
              </Label>
            )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {!isRunning && (
            <MessageAction
              label="Copy"
              icon={Copy01Icon}
              disabled={!session.copy()}
              onClick={() => void copySession(session)}
            />
          )}
          {canRetry && (
            <MessageAction
              label="Retry"
              icon={ReloadIcon}
              onClick={() => void session.retry()}
            />
          )}
          {canRegenerate && (
            <MessageAction
              label="Regenerate"
              icon={Refresh01Icon}
              onClick={() => void session.regenerate()}
            />
          )}
          {preparation && preparation.warnings.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    type="button"
                    aria-label="View proposal warnings"
                  />
                }
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={14} />
              </TooltipTrigger>
              <TooltipContent>
                {preparation.warnings.map((warning) => (
                  <p key={warning.code}>{warning.message}</p>
                ))}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {isRunning ? (
          <MessageAction
            label="Stop"
            icon={StopIcon}
            variant="outline"
            size="icon-sm"
            onClick={session.stop}
          />
        ) : isEdit ? (
          <div className="flex items-center gap-1">
            <MessageAction
              label="Reject"
              icon={CancelCircleIcon}
              variant="destructive"
              size="icon-sm"
              onClick={() => session.reject()}
            />
            <MessageAction
              label={isPlainTextFallback ? "Apply as plain text" : "Accept"}
              icon={CheckmarkCircle01Icon}
              variant="default"
              size="icon-sm"
              disabled={!canApply}
              onClick={() => session.accept(confirmDocumentReplacement)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MessageAction({
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
          />
        }
      >
        <HugeiconsIcon icon={icon} size={14} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

async function copySession(session: UseEditorAiResult) {
  const value = session.copy()
  if (!value || !navigator.clipboard) return
  await navigator.clipboard.writeText(value).catch(() => undefined)
}
