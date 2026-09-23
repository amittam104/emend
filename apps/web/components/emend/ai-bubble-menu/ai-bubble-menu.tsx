"use client"

import { isTextSelection, posToDOMRect } from "@tiptap/react"
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus"
import { cn } from "@/lib/utils"
import {
  type UseEditorAiOptions,
  type UseEditorAiResult,
  useEditorAi,
} from "@/components/emend/_shared/use-emend-ai-session"
import AiBeautifyIcon from "@hugeicons/core-free-icons/AiBeautifyIcon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowTurnBackwardIcon from "@hugeicons/core-free-icons/ArrowTurnBackwardIcon"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import BookAIcon from "@hugeicons/core-free-icons/BookAIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import HappyIcon from "@hugeicons/core-free-icons/HappyIcon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import StopIcon from "@hugeicons/core-free-icons/StopIcon"
import TextIndent01Icon from "@hugeicons/core-free-icons/TextIndent01Icon"
import Tick01Icon from "@hugeicons/core-free-icons/Tick01Icon"
import UnfoldLessIcon from "@hugeicons/core-free-icons/UnfoldLessIcon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useCallback, useState } from "react"

type Editor = NonNullable<BubbleMenuProps["editor"]>

const actions = [
  { id: "improve", label: "Improve", busy: "Improving", icon: AiBeautifyIcon },
  { id: "shorten", label: "Shorten", busy: "Shortening", icon: UnfoldLessIcon },
  { id: "expand", label: "Expand", busy: "Expanding", icon: TextIndent01Icon },
  { id: "tone", label: "Tone", busy: "Changing tone", icon: HappyIcon },
  {
    id: "fix-grammar",
    label: "Grammar",
    busy: "Fixing grammar",
    icon: BookAIcon,
  },
] as const

const buttonClass =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[12.5px] whitespace-nowrap outline-none transition-[background-color,color,scale] duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50"
const iconButtonClass = cn(buttonClass, "w-7 px-0")

const menuOptions = {
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
  const [prompt, setPrompt] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(
    null
  )
  const isRunning =
    session.state === "submitting" || session.state === "streaming"
  const pending = session.pendingProposal
  const request = session.activeRequest
  const error = session.error ?? session.reviewError
  const reviewActive =
    showReview &&
    (request?.interactionMode === "edit" || (!request && error !== null)) &&
    request?.requestId !== dismissedRequestId &&
    (session.state !== "idle" || pending !== null || error !== null)
  const range = request?.targetRange ?? session.editorState?.targetRange
  const blocked = session.preparation?.kind === "blocked"
  const canApply =
    pending !== null &&
    !session.stale &&
    !error &&
    session.streamCompleted &&
    !blocked &&
    Boolean(session.editorState?.previewKind) &&
    session.preparation !== null &&
    (!session.preparation.requiresDocumentConfirmation ||
      request?.targetScope !== "document")
  const canRun = !isRunning && pending === null
  const hasPrompt = prompt.trim().length > 0
  const busyLabel =
    actions.find((action) => action.id === request?.actionId)?.busy ?? "Editing"

  const shouldShow = useCallback<NonNullable<BubbleMenuProps["shouldShow"]>>(
    ({ editor: currentEditor, element, view, state, from, to }) => {
      if (currentEditor.isDestroyed) return false
      if (reviewActive) return true
      if (!showReview && session.state !== "idle") return false
      return (
        currentEditor.isEditable &&
        isTextSelection(state.selection) &&
        !state.selection.empty &&
        Boolean(state.doc.textBetween(from, to).length) &&
        (view.hasFocus() || element.contains(document.activeElement))
      )
    },
    [reviewActive, session.state, showReview]
  )

  const getReviewReference = useCallback<
    NonNullable<BubbleMenuProps["getReferencedVirtualElement"]>
  >(() => {
    if (!reviewActive || !range) return null
    const max = editor.state.doc.content.size
    try {
      const rect = posToDOMRect(
        editor.view,
        Math.min(range.from, max),
        Math.min(range.to, max)
      )
      return {
        getBoundingClientRect: () => rect,
        getClientRects: () => [rect],
      }
    } catch {
      return null
    }
  }, [editor, range, reviewActive])

  function run(actionId: (typeof actions)[number]["id"] | "custom") {
    if (!canRun || editor.state.selection.empty) return
    if (actionId === "custom" && !hasPrompt) return
    setExpanded(false)
    setDismissedRequestId(null)
    void session.run(actionId === "tone" ? "custom" : actionId, {
      interactionMode: "edit",
      targetScope: "selection",
      contextScope: "current-block",
      mutationOperation: "replace-selection",
      ...(actionId === "custom"
        ? { instruction: prompt.trim() }
        : actionId === "tone"
          ? {
              instruction:
                "Rewrite the selection in a warmer, more conversational tone.",
            }
          : {}),
    })
    setPrompt("")
  }

  function accept() {
    session.accept()
  }

  function resetReview(close = false) {
    if (pending && !session.reject().ok) return
    session.dismissInformationalResult()
    setDismissedRequestId(request?.requestId ?? null)
    setPrompt("")
    setExpanded(false)
    if (close) {
      editor.chain().setTextSelection(editor.state.selection.to).focus().run()
    } else {
      editor.commands.focus()
    }
  }

  const status =
    error?.message ??
    (session.stale
      ? "Selection changed; discard and select text again"
      : blocked
        ? session.preparation.error.message
        : session.state === "aborted"
          ? "Stopped"
          : pending && !session.preparation
            ? "Preparing preview…"
            : "Preview unavailable")

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="emendAiBubbleMenu"
      options={menuOptions}
      shouldShow={shouldShow}
      getReferencedVirtualElement={getReviewReference}
    >
      <div
        data-emend-ai-bubble-menu
        className={cn(
          "flex h-9 w-fit max-w-[calc(100vw-3rem)] items-center gap-0.5 overflow-hidden rounded-full bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10",
          className
        )}
      >
        {reviewActive ? (
          isRunning ? (
            <>
              <span
                className="inline-flex h-7 items-center gap-1.5 px-2.5 text-[12.5px] text-muted-foreground"
                role="status"
              >
                <span className="size-3 shrink-0 rounded-full border-[1.5px] border-current border-t-transparent motion-safe:animate-spin" />
                {busyLabel}…
              </span>
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Stop"
                onClick={session.stop}
              >
                <Icon icon={StopIcon} />
              </button>
            </>
          ) : pending && canApply ? (
            <>
              <button
                type="button"
                className={cn(
                  buttonClass,
                  "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                )}
                title={
                  session.preparation?.kind === "plain-text-fallback"
                    ? "Apply as plain text"
                    : undefined
                }
                onClick={accept}
              >
                <Icon icon={Tick01Icon} />
                {session.preparation?.kind === "plain-text-fallback"
                  ? "Keep text"
                  : "Keep"}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => session.reject()}
              >
                <Icon icon={Cancel01Icon} />
                Discard
              </button>
              <span className="mx-0.5 h-4 w-px shrink-0 bg-border" />
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Try again"
                onClick={() => void session.regenerate()}
              >
                <Icon icon={Refresh01Icon} />
              </button>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "max-w-lg min-w-0 truncate px-2.5 text-[12.5px]",
                  error || blocked
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
                role={error || blocked ? "alert" : "status"}
                title={status}
              >
                {status}
              </span>
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Return to edit actions"
                title="Return to edit actions"
                onClick={() => resetReview()}
              >
                <Icon icon={ArrowTurnBackwardIcon} />
              </button>
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Close bubble menu"
                title="Close bubble menu"
                onClick={() => resetReview(true)}
              >
                <Icon icon={Cancel01Icon} />
              </button>
            </>
          )
        ) : (
          <>
            {!expanded && (
              <form
                className={cn(
                  "flex h-7 min-w-0 items-center",
                  hasPrompt ? "w-55" : "w-36"
                )}
                onSubmit={(event) => {
                  event.preventDefault()
                  run("custom")
                }}
              >
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  aria-label="Describe edits"
                  placeholder="Describe edits"
                  className="h-7 w-full min-w-0 bg-transparent pr-2.5 pl-3 text-[12.5px] outline-none placeholder:text-muted-foreground"
                />
              </form>
            )}
            {!hasPrompt && (
              <>
                <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {!expanded && (
                    <span className="mx-0.5 h-4 w-px shrink-0 bg-border" />
                  )}
                  {actions.slice(0, expanded ? undefined : 2).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className={cn(
                        buttonClass,
                        !expanded && action.id === "shorten" && "max-sm:hidden"
                      )}
                      disabled={!canRun}
                      onClick={() => run(action.id)}
                    >
                      <Icon icon={action.icon} />
                      {action.label}
                    </button>
                  ))}
                </div>
                {expanded && <span className="h-4 w-px shrink-0 bg-border" />}
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={
                    expanded ? "Show fewer actions" : "Show more actions"
                  }
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                >
                  <span
                    className={cn(
                      "transition-transform duration-150",
                      expanded && "rotate-180"
                    )}
                  >
                    <Icon icon={ArrowRight01Icon} />
                  </span>
                </button>
              </>
            )}
            {hasPrompt && !expanded && (
              <button
                type="button"
                className={cn(
                  iconButtonClass,
                  "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                )}
                aria-label="Send edit instruction"
                disabled={!canRun}
                onClick={() => run("custom")}
              >
                <Icon icon={ArrowUp01Icon} />
              </button>
            )}
          </>
        )}
      </div>
    </BubbleMenu>
  )
}

function Icon({ icon }: { readonly icon: IconSvgElement }) {
  return (
    <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} aria-hidden="true" />
  )
}
