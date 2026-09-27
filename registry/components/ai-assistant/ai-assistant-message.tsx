"use client"

import { setEmendSelectionDecoration } from "@emend/ai/tiptap"
import type { UseEditorAiOptions, UseEditorAiResult } from "@emend/ai/react"
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon"
import CheckmarkCircle01Icon from "@hugeicons/core-free-icons/CheckmarkCircle01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon"
import TextCheckIcon from "@hugeicons/core-free-icons/TextCheckIcon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { AiMarkdown } from "@/components/emend/_shared/ai-markdown"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Message, MessageContent, MessageFooter } from "@/components/ui/message"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useEffect, useState } from "react"

export function AiAssistantMessage({
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

  const status = isRunning
    ? isAsk
      ? "Thinking…"
      : "Writing a suggestion…"
    : null

  return (
    <Message
      onMouseEnter={() => highlightTarget(true)}
      onMouseLeave={() => highlightTarget(false)}
      onFocusCapture={() => highlightTarget(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          highlightTarget(false)
        }
      }}
    >
      <MessageContent>
        {status && !session.streamedMarkdown && (
          <Marker role="status">
            <MarkerContent className="shimmer motion-reduce:shimmer-none">
              {status}
            </MarkerContent>
          </Marker>
        )}

        {visibleError && (
          <Bubble variant="destructive">
            <BubbleContent role="alert">{visibleError.message}</BubbleContent>
          </Bubble>
        )}

        {isRunning && isAsk && session.streamedMarkdown && (
          <AnswerBubble>{session.streamedMarkdown}</AnswerBubble>
        )}

        {isAsk && !isRunning && (
          <AnswerBubble>
            {session.informationalMarkdown || session.streamedMarkdown}
          </AnswerBubble>
        )}

        {!isRunning && !isAsk && !isEdit && visibleError && (
          <AnswerBubble>
            {session.streamedMarkdown || "No response was received."}
          </AnswerBubble>
        )}

        {isRunning && !isAsk && session.streamedMarkdown && (
          <Marker role="status">
            <MarkerContent className="shimmer motion-reduce:shimmer-none">
              {status}
            </MarkerContent>
          </Marker>
        )}

        {isEdit && (
          <div className="space-y-3">
            {proposalRenderedInline ? (
              <Marker>
                <MarkerIcon>
                  <HugeiconsIcon icon={TextCheckIcon} size={16} />
                </MarkerIcon>
                <MarkerContent>
                  {session.stale
                    ? "The document changed, so this suggestion is out of date."
                    : "The suggested change is shown in your document."}
                </MarkerContent>
              </Marker>
            ) : (
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
              <Bubble variant="destructive">
                <BubbleContent role="alert">
                  {preparation.error.message}
                </BubbleContent>
              </Bubble>
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
                  Confirm replacing the whole document.
                </Label>
              )}

            {!isRunning && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!canApply}
                  onClick={() => session.accept(confirmDocumentReplacement)}
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                  {isPlainTextFallback ? "Apply as plain text" : "Accept"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => session.reject()}
                >
                  <HugeiconsIcon icon={CancelCircleIcon} size={14} />
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
        {!isRunning && (
          <MessageFooter className="-mt-1 gap-0.5 px-0">
            <MessageAction
              label="Copy"
              icon={Copy01Icon}
              disabled={!session.copy()}
              onClick={() => void copySession(session)}
            />
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
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

export function AnswerBubble({ children }: { readonly children: string }) {
  return (
    <Bubble variant="ghost" className="w-full">
      <BubbleContent>
        <AiMarkdown>{children}</AiMarkdown>
      </BubbleContent>
    </Bubble>
  )
}

function MessageAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  readonly label: string
  readonly icon: IconSvgElement
  readonly disabled?: boolean
  readonly onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
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
