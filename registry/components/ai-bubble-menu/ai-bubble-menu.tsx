"use client"

import "@tiptap/extension-bold"
import "@tiptap/extension-italic"
import "@tiptap/extension-link"
import "@tiptap/extension-text-style"
import "@tiptap/extension-underline"
import { isTextSelection, posToDOMRect, useEditorState } from "@tiptap/react"
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus"
import { cn } from "@workspace/ui/lib/utils"
import {
  type UseEditorAiOptions,
  type UseEditorAiResult,
  useEditorAi,
} from "../_shared/use-emend-ai-session"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Icon } from "../_shared/icon"
import TextBoldIcon from "@hugeicons/core-free-icons/TextBoldIcon"
import TextItalicIcon from "@hugeicons/core-free-icons/TextItalicIcon"
import AiBeautifyIcon from "@hugeicons/core-free-icons/AiBeautifyIcon"
import AiChat01Icon from "@hugeicons/core-free-icons/AiChat01Icon"
import BookAIcon from "@hugeicons/core-free-icons/BookAIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon"
import CheckmarkCircle01Icon from "@hugeicons/core-free-icons/CheckmarkCircle01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import HighlighterIcon from "@hugeicons/core-free-icons/HighlighterIcon"
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon"
import MagicWand01Icon from "@hugeicons/core-free-icons/MagicWand01Icon"
import ParagraphIcon from "@hugeicons/core-free-icons/ParagraphIcon"
import PencilIcon from "@hugeicons/core-free-icons/PencilIcon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon"
import StopIcon from "@hugeicons/core-free-icons/StopIcon"
import TextColorIcon from "@hugeicons/core-free-icons/TextColorIcon"
import TextIndent01Icon from "@hugeicons/core-free-icons/TextIndent01Icon"
import TextUnderlineIcon from "@hugeicons/core-free-icons/TextUnderlineIcon"
import TypeCursorIcon from "@hugeicons/core-free-icons/TypeCursorIcon"
import UnfoldLessIcon from "@hugeicons/core-free-icons/UnfoldLessIcon"
import { useCallback, useRef, useState } from "react"

type Editor = NonNullable<BubbleMenuProps["editor"]>

const AI_BUBBLE_MENU_PLUGIN_KEY = "emendAiBubbleMenu"

const quickActions = [
  { actionId: "improve", label: "Improve", icon: MagicWand01Icon },
  { actionId: "shorten", label: "Shorten", icon: UnfoldLessIcon },
  { actionId: "expand", label: "Expand", icon: TextIndent01Icon },
  { actionId: "fix-grammar", label: "Fix grammar", icon: BookAIcon },
] as const

const baseBubbleMenuOptions = {
  placement: "bottom" as const,
  offset: 8,
  flip: true,
  shift: { padding: 8 },
  inline: true,
} satisfies NonNullable<BubbleMenuProps["options"]>

export interface AiBubbleMenuProps {
  readonly editor: Editor
  readonly transport: UseEditorAiOptions["transport"]
  readonly showReview?: boolean
  readonly className?: string
}

export interface AiBubbleMenuViewProps {
  readonly editor: Editor
  readonly session: UseEditorAiResult
  readonly showReview?: boolean
  readonly className?: string
}

export function AiBubbleMenu({
  editor,
  transport,
  showReview = true,
  className,
}: AiBubbleMenuProps) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  return (
    <AiBubbleMenuView
      editor={editor}
      session={session}
      showReview={showReview}
      className={className}
    />
  )
}

export function AiBubbleMenuView({
  editor,
  session,
  showReview = true,
  className,
}: AiBubbleMenuViewProps) {
  const [openAiPanel, setOpenAiPanel] = useState(false)
  const [customInstructionOpen, setCustomInstructionOpen] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [documentContext, setDocumentContext] = useState(false)
  const textColorInputRef = useRef<HTMLInputElement>(null)
  const backgroundColorInputRef = useRef<HTMLInputElement>(null)
  const supportsUnderline =
    typeof editor.commands.toggleUnderline === "function"
  const supportsTextColor = typeof editor.commands.setColor === "function"
  const supportsBackgroundColor =
    typeof editor.commands.setBackgroundColor === "function"
  const supportsLink =
    typeof editor.commands.setLink === "function" &&
    typeof editor.commands.unsetLink === "function"
  const activeFormats = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      link: editor.isActive("link"),
      textColor: editor.isActive("textStyle", { color: /.*/ }),
      backgroundColor: editor.isActive("textStyle", {
        backgroundColor: /.*/,
      }),
    }),
  })
  const requestInProgress =
    session.state === "submitting" || session.state === "streaming"
  const editActionsDisabled =
    requestInProgress || session.pendingProposal !== null
  const customSubmitDisabled = !instruction.trim() || requestInProgress
  const visibleError = session.error ?? session.reviewError
  const showReviewInMenu =
    showReview && (session.state !== "idle" || visibleError !== null)
  const reviewRange =
    session.activeRequest?.targetRange ?? session.editorState?.targetRange
  const reviewFrom = reviewRange?.from
  const reviewTo = reviewRange?.to
  const shouldShow = useCallback<NonNullable<BubbleMenuProps["shouldShow"]>>(
    ({ editor: currentEditor, element, view, state, from, to }) => {
      if (currentEditor.isDestroyed) return false
      if (showReviewInMenu) return true

      return (
        currentEditor.isEditable &&
        isTextSelection(state.selection) &&
        !state.selection.empty &&
        Boolean(state.doc.textBetween(from, to).length) &&
        (view.hasFocus() || element.contains(document.activeElement))
      )
    },
    [showReviewInMenu]
  )
  const [confirmation, setConfirmation] = useState<{
    readonly key: string
    readonly checked: boolean
  }>({ key: "", checked: false })
  const isRunning =
    session.state === "submitting" || session.state === "streaming"
  const pendingProposal = session.pendingProposal
  const proposalMarkdown =
    session.proposalMarkdown ?? pendingProposal?.content.value ?? ""
  const confirmationKey = `${pendingProposal?.id ?? ""}:${proposalMarkdown}`
  const confirmDocumentReplacement =
    confirmation.key === confirmationKey && confirmation.checked
  const preparation = session.preparation
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
  const getReviewReference = useCallback<
    NonNullable<BubbleMenuProps["getReferencedVirtualElement"]>
  >(() => {
    if (
      !showReviewInMenu ||
      reviewFrom === undefined ||
      reviewTo === undefined
    ) {
      return null
    }

    const maxPosition = editor.state.doc.content.size
    const from = Math.min(reviewFrom, maxPosition)
    const to = Math.min(reviewTo, maxPosition)

    try {
      const rect = posToDOMRect(
        editor.view,
        Math.min(from, to),
        Math.max(from, to)
      )

      return {
        getBoundingClientRect: () => rect,
        getClientRects: () => [rect],
      }
    } catch {
      return null
    }
  }, [editor, reviewFrom, reviewTo, showReviewInMenu])

  function runQuickAction(actionId: (typeof quickActions)[number]["actionId"]) {
    if (editor.state.selection.empty) {
      setOpenAiPanel(false)
      return
    }

    if (editActionsDisabled) return

    void session.run(actionId, {
      interactionMode: "edit",
      targetScope: "selection",
      contextScope: "current-block",
      mutationOperation: "replace-selection",
    })
  }

  function closeCustomInstruction() {
    setInstruction("")
    setDocumentContext(false)
    setCustomInstructionOpen(false)
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.commands.focus()
    })
  }

  function updateLink() {
    const currentHref = editor.getAttributes("link").href
    const href = window.prompt(
      "Enter a URL",
      typeof currentHref === "string" ? currentHref : ""
    )

    if (href === null) return
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }

    editor.chain().focus().setLink({ href: href.trim() }).run()
  }

  function runCustom(interactionMode: "ask" | "edit") {
    const trimmedInstruction = instruction.trim()

    if (!trimmedInstruction || requestInProgress) return
    if (interactionMode === "edit" && session.pendingProposal !== null) return
    if (editor.state.selection.empty) {
      setOpenAiPanel(false)
      return
    }

    void session.run("custom", {
      interactionMode,
      targetScope: "selection",
      contextScope: documentContext ? "document" : "current-block",
      mutationOperation:
        interactionMode === "edit" ? "replace-selection" : null,
      instruction: trimmedInstruction,
    })
    closeCustomInstruction()
  }

  function acceptProposal() {
    const result = session.accept(confirmDocumentReplacement)
    if (result.ok) setOpenAiPanel(false)
  }

  function copyValue(session: UseEditorAiResult): string | null {
    return session.copy()
  }

  async function copySession(session: UseEditorAiResult): Promise<void> {
    const value = copyValue(session)
    if (!value || typeof navigator === "undefined" || !navigator.clipboard)
      return

    await navigator.clipboard.writeText(value).catch(() => undefined)
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={AI_BUBBLE_MENU_PLUGIN_KEY}
      options={baseBubbleMenuOptions}
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReviewReference}
    >
      <div
        className={cn(
          "flex h-auto max-w-[calc(100vw-1rem)] flex-col items-start gap-0 rounded-xl border border-border bg-background shadow-xl",
          showReviewInMenu
            ? "w-108"
            : customInstructionOpen
              ? "w-88"
              : "w-auto min-w-64",
          className
        )}
      >
        <div
          className={cn(
            "flex w-full max-w-full gap-1 overflow-x-auto p-1",
            openAiPanel && "border-b border-border"
          )}
        >
          <Button
            variant="default"
            type="button"
            aria-label="AI"
            aria-expanded={openAiPanel}
            aria-controls="emend-ai-bubble-panel"
            onClick={() => setOpenAiPanel(!openAiPanel)}
          >
            <Icon icon={AiBeautifyIcon} size={14} />
            AI
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className={cn(activeFormats.bold && "bg-muted text-foreground")}
            aria-label="Bold"
            aria-pressed={activeFormats.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Icon icon={TextBoldIcon} size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className={cn(activeFormats.italic && "bg-muted text-foreground")}
            aria-label="Italic"
            aria-pressed={activeFormats.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Icon icon={TextItalicIcon} size={14} />
          </Button>
          {supportsUnderline && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(
                activeFormats.underline && "bg-muted text-foreground"
              )}
              aria-label="Underline"
              aria-pressed={activeFormats.underline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Icon icon={TextUnderlineIcon} size={14} />
            </Button>
          )}
          {supportsTextColor && (
            <>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className={cn(
                  activeFormats.textColor && "bg-muted text-foreground"
                )}
                aria-label="Text color"
                aria-pressed={activeFormats.textColor}
                onClick={() => textColorInputRef.current?.click()}
              >
                <Icon icon={TextColorIcon} size={14} />
              </Button>
              <input
                ref={textColorInputRef}
                type="color"
                tabIndex={-1}
                className="sr-only"
                aria-label="Choose text color"
                onChange={(event) =>
                  editor.chain().focus().setColor(event.target.value).run()
                }
              />
            </>
          )}
          {supportsBackgroundColor && (
            <>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className={cn(
                  activeFormats.backgroundColor && "bg-muted text-foreground"
                )}
                aria-label="Background color"
                aria-pressed={activeFormats.backgroundColor}
                onClick={() => backgroundColorInputRef.current?.click()}
              >
                <Icon icon={HighlighterIcon} size={14} />
              </Button>
              <input
                ref={backgroundColorInputRef}
                type="color"
                tabIndex={-1}
                className="sr-only"
                aria-label="Choose background color"
                defaultValue="#ffff00"
                onChange={(event) =>
                  editor
                    .chain()
                    .focus()
                    .setBackgroundColor(event.target.value)
                    .run()
                }
              />
            </>
          )}
          {supportsLink && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(activeFormats.link && "bg-muted text-foreground")}
              aria-label="Link"
              aria-pressed={activeFormats.link}
              onClick={updateLink}
            >
              <Icon icon={Link01Icon} size={14} />
            </Button>
          )}
        </div>
        {showReviewInMenu && (
          <section
            className="max-h-[calc(100vh-2rem)] w-full space-y-1 overflow-y-auto border-b border-border bg-accent p-1"
            data-emend-review
            aria-label="AI review"
          >
            {visibleError && (
              <p
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive"
                role="alert"
              >
                {visibleError.message}
              </p>
            )}

            {isRunning && (
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/70 p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {session.streamedMarkdown || "Generating proposal…"}
              </pre>
            )}

            {isAsk && !isRunning && (
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/70 p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {session.informationalMarkdown || session.streamedMarkdown}
              </pre>
            )}

            {!isRunning && !isAsk && !isEditReview && visibleError && (
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/70 p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {session.streamedMarkdown || "No partial output was received."}
              </pre>
            )}

            {isEditReview && (
              <div className="">
                <div className="space-y-1">
                  <label className="grid gap-2 text-sm font-medium">
                    <textarea
                      className="h-32 resize-none overflow-y-auto rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      aria-label="Editable Proposal Markdown"
                      value={proposalMarkdown}
                      onChange={(event) =>
                        session.setProposalMarkdown(event.target.value)
                      }
                    />
                  </label>
                </div>

                {isBlocked && preparation.kind === "blocked" && (
                  <p
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive"
                    role="alert"
                  >
                    {preparation.error.message}
                  </p>
                )}

                {preparation &&
                  preparation.kind !== "blocked" &&
                  preparation.requiresDocumentConfirmation &&
                  !isStale && (
                    <label className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm">
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
                        Confirm replacing the non-empty Document. This
                        confirmation is checked again when the proposal is
                        applied.
                      </span>
                    </label>
                  )}
              </div>
            )}

            {isRunning && (
              <div className="flex justify-end">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        aria-label="Stop"
                        onClick={session.stop}
                      >
                        <Icon icon={StopIcon} size={14} />
                      </Button>
                    }
                  />
                  <TooltipContent>Stop</TooltipContent>
                </Tooltip>
              </div>
            )}
            {!isRunning && (isAsk || (!isEditReview && visibleError)) && (
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          aria-label="Copy"
                          disabled={!copyValue(session)}
                          onClick={() => void copySession(session)}
                        >
                          <Icon icon={Copy01Icon} size={14} />
                        </Button>
                      }
                    />
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                  {canRetry && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="outline"
                            size="icon-xs"
                            type="button"
                            aria-label="Retry"
                            onClick={() => void session.retry()}
                          >
                            <Icon icon={ReloadIcon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>Retry</TooltipContent>
                    </Tooltip>
                  )}
                  {canRegenerate && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            aria-label="Regenerate"
                            onClick={() => void session.regenerate()}
                          >
                            <Icon icon={Refresh01Icon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>Regenerate</TooltipContent>
                    </Tooltip>
                  )}
                  {preparation && preparation.warnings.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400"
                            aria-label="View proposal warnings"
                          >
                            <Icon icon={InformationCircleIcon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        <div className="space-y-1">
                          {preparation.warnings.map((warning) => (
                            <p key={warning.code}>{warning.message}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {isAsk && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          aria-label="Close"
                          onClick={session.dismissInformationalResult}
                        >
                          <Icon icon={Cancel01Icon} size={14} />
                        </Button>
                      }
                    />
                    <TooltipContent>Close</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {!isRunning && isEditReview && (
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          aria-label="Copy"
                          disabled={!copyValue(session)}
                          onClick={() => void copySession(session)}
                        >
                          <Icon icon={Copy01Icon} size={14} />
                        </Button>
                      }
                    />
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                  {!isStale && canRegenerate && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            aria-label="Regenerate"
                            onClick={() => void session.regenerate()}
                          >
                            <Icon icon={Refresh01Icon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>Regenerate</TooltipContent>
                    </Tooltip>
                  )}
                  {preparation && preparation.warnings.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400"
                            aria-label="View proposal warnings"
                          >
                            <Icon icon={InformationCircleIcon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        <div className="space-y-1">
                          {preparation.warnings.map((warning) => (
                            <p key={warning.code}>{warning.message}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          type="button"
                          aria-label="Reject"
                          onClick={() => session.reject()}
                        >
                          <Icon icon={CancelCircleIcon} size={14} />
                        </Button>
                      }
                    />
                    <TooltipContent>Reject</TooltipContent>
                  </Tooltip>
                  {isStale ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="default"
                            size="icon-sm"
                            type="button"
                            aria-label="Run again with current document"
                            onClick={() => void session.regenerate()}
                          >
                            <Icon icon={Refresh01Icon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        Run again with current document
                      </TooltipContent>
                    </Tooltip>
                  ) : !isBlocked ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="default"
                            size="icon-sm"
                            type="button"
                            aria-label={
                              isPlainTextFallback
                                ? "Apply as plain text"
                                : "Accept"
                            }
                            disabled={!canApply}
                            onClick={acceptProposal}
                          >
                            <Icon icon={CheckmarkCircle01Icon} size={14} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {isPlainTextFallback ? "Apply as plain text" : "Accept"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        )}
        {openAiPanel && (
          <div
            id="emend-ai-bubble-panel"
            className="flex w-full flex-col gap-1 p-2"
            role="group"
            aria-label="AI writing actions"
          >
            <div className="flex w-full flex-col gap-1">
              {quickActions.map(({ actionId, label, icon }) => (
                <Button
                  key={actionId}
                  variant="ghost"
                  size="default"
                  type="button"
                  className="w-full justify-start gap-2"
                  disabled={editActionsDisabled}
                  onClick={() => runQuickAction(actionId)}
                >
                  <Icon icon={icon} size={14} />
                  {label}
                </Button>
              ))}
            </div>
            {!customInstructionOpen ? (
              <Button
                variant="ghost"
                size="default"
                type="button"
                className="w-full justify-start gap-2"
                aria-expanded={false}
                onClick={() => setCustomInstructionOpen(true)}
              >
                <Icon icon={TypeCursorIcon} size={14} />
                Custom instruction
              </Button>
            ) : (
              <form
                className="w-full"
                onSubmit={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || requestInProgress) return
                  event.preventDefault()
                  event.stopPropagation()
                  closeCustomInstruction()
                }}
              >
                <InputGroup className="h-auto flex-col items-stretch rounded-md bg-background has-disabled:bg-background has-disabled:opacity-100 dark:bg-background dark:has-disabled:bg-background">
                  <InputGroupTextarea
                    autoFocus
                    aria-label="Custom instruction"
                    placeholder="Tell Emend what to change..."
                    rows={3}
                    value={instruction}
                    className="pr-9"
                    onChange={(event) => setInstruction(event.target.value)}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          variant="ghost"
                          size="icon-xs"
                          className="absolute top-1 right-1 z-10"
                          aria-label="Close custom instruction"
                          onClick={closeCustomInstruction}
                        >
                          <Icon icon={Cancel01Icon} size={14} />
                        </InputGroupButton>
                      }
                    />
                    <TooltipContent>Close</TooltipContent>
                  </Tooltip>
                  <InputGroupAddon
                    align="block-end"
                    className="flex-wrap justify-between gap-1.5 px-1.5"
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <InputGroupButton
                            variant="outline"
                            size="icon-sm"
                            aria-label={
                              documentContext
                                ? "Read the document; only the selection can change"
                                : "Add document context; only the selection can change"
                            }
                            aria-pressed={documentContext}
                            onClick={() =>
                              setDocumentContext((value) => !value)
                            }
                          >
                            <Icon
                              icon={
                                documentContext ? File01Icon : ParagraphIcon
                              }
                              size={14}
                            />
                          </InputGroupButton>
                        }
                      />
                      <TooltipContent>
                        {documentContext
                          ? "Reading the document; only the selection can change"
                          : "Add document context; only the selection can change"}
                      </TooltipContent>
                    </Tooltip>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <InputGroupButton
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Ask with custom instruction"
                              disabled={customSubmitDisabled}
                              onClick={() => runCustom("ask")}
                            >
                              <Icon icon={AiChat01Icon} size={14} />
                              Ask
                            </InputGroupButton>
                          }
                        />
                        <TooltipContent>
                          Ask without changing content
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <InputGroupButton
                              type="button"
                              variant="default"
                              size="sm"
                              aria-label="Edit selection with custom instruction"
                              disabled={
                                customSubmitDisabled ||
                                session.pendingProposal !== null
                              }
                              onClick={() => runCustom("edit")}
                            >
                              <Icon icon={PencilIcon} size={14} />
                              Edit
                            </InputGroupButton>
                          }
                        />
                        <TooltipContent>Edit only the selection</TooltipContent>
                      </Tooltip>
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </form>
            )}
          </div>
        )}
      </div>
    </BubbleMenu>
  )
}
