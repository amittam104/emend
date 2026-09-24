"use client"

import {
  DEFAULT_REQUEST_LIMITS,
  type EmendContextScope,
  type EmendMutationOperation,
  type EmendTargetScope,
} from "@emend/ai"
import { setEmendSelectionDecoration } from "@emend/ai/tiptap"
import {
  Add01Icon,
  ArrowUp01Icon,
  BookAIcon,
  BookOpenTextIcon,
  Cancel01Icon,
  CursorTextIcon,
  Edit02Icon,
  File01Icon,
  FileEditIcon,
  MagicWand01Icon,
  HappyIcon,
  TextAlignLeftIcon,
  TextIndent01Icon,
  TextSelectionIcon,
  StopIcon,
  TypeCursorIcon,
  UnfoldLessIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEditorState } from "@tiptap/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import {
  type UseEditorAiOptions,
  type UseEditorAiResult,
} from "@emend/ai/react"

const actions = [
  {
    actionId: "improve",
    command: "improve",
    label: "Improve",
    icon: MagicWand01Icon,
    description: "Make the selected writing clearer.",
    targetScope: "selection",
    contextScope: "selection",
    mutationOperation: "replace-selection",
  },
  {
    actionId: "shorten",
    command: "shorten",
    label: "Shorten",
    icon: UnfoldLessIcon,
    description: "Make the selected writing more concise.",
    targetScope: "selection",
    contextScope: "selection",
    mutationOperation: "replace-selection",
  },
  {
    actionId: "expand",
    command: "longer",
    label: "Longer",
    icon: TextIndent01Icon,
    description: "Add useful detail to the selected writing.",
    targetScope: "selection",
    contextScope: "selection",
    mutationOperation: "replace-selection",
  },
  {
    actionId: "fix-grammar",
    command: "fix-grammar",
    label: "Fix grammar",
    icon: BookAIcon,
    description: "Correct grammar and spelling.",
    targetScope: "selection",
    contextScope: "selection",
    mutationOperation: "replace-selection",
  },
  {
    actionId: "tone",
    command: "tone",
    label: "Tone",
    icon: HappyIcon,
    description: "Find the right voice for your writing.",
    targetScope: "selection",
    contextScope: "selection",
    mutationOperation: "replace-selection",
  },
  {
    actionId: "custom",
    command: "custom",
    label: "Custom instruction",
    icon: TypeCursorIcon,
    description: "Tell Emend what to do.",
    targetScope: null,
    contextScope: null,
    mutationOperation: null,
  },
] as const

type QuickAction = Exclude<(typeof actions)[number], { actionId: "custom" }>
const quickActions: QuickAction[] = actions.filter(
  (action): action is QuickAction => action.actionId !== "custom"
)

const changes = [
  {
    operation: "replace-selection",
    targetScope: "selection",
    label: "Replace Selection",
  },
  {
    operation: "replace-current-block",
    targetScope: "current-block",
    label: "Replace Current block",
  },
  {
    operation: "replace-document",
    targetScope: "document",
    label: "Replace Document",
  },
  {
    operation: "insert-at-cursor",
    targetScope: "selection",
    label: "Insert at cursor",
  },
] as const satisfies readonly {
  readonly operation: EmendMutationOperation
  readonly targetScope: EmendTargetScope
  readonly label: string
}[]

type ComposerActionId = (typeof actions)[number]["actionId"]
type ComposerChange = (typeof changes)[number]

const defaultContextScopes: readonly EmendContextScope[] = [
  "selection",
  "current-block",
  "document",
]
const defaultMutationOperations: readonly EmendMutationOperation[] =
  changes.map(({ operation }) => operation)

export interface AiAssistantPolicy {
  readonly allowedContextScopes?: readonly EmendContextScope[]
  readonly defaultContextScope?: "adaptive" | EmendContextScope
  readonly allowContextOverride?: boolean
  readonly allowedMutationOperations?: readonly EmendMutationOperation[]
  readonly defaultMutationOperation?: "adaptive" | EmendMutationOperation
  readonly allowMutationOverride?: boolean
}

export interface AiAssistantComposerProps {
  readonly editor: UseEditorAiOptions["editor"]
  readonly session: UseEditorAiResult
  readonly policy?: AiAssistantPolicy
  readonly className?: string
  readonly suggestions?: boolean
}

export function AiAssistantComposer({
  editor,
  session,
  policy,
  className,
  suggestions = false,
}: AiAssistantComposerProps) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [tone, setTone] = useState("warm and conversational")
  const [draft, setDraft] = useState("")
  const [selectedActionId, setSelectedActionId] =
    useState<ComposerActionId | null>(null)
  const [plusOpen, setPlusOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [selectionDecorationActive, setSelectionDecorationActive] =
    useState(false)
  const [active, setActive] = useState(0)
  const [chosenContext, setChosenContext] =
    useState<EmendContextScope>("document")
  const [contextTouched, setContextTouched] = useState(false)
  const [chosenChange, setChosenChange] =
    useState<EmendMutationOperation | null>(null)
  const [changeTouched, setChangeTouched] = useState(false)
  const selection = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return { collapsed: true, from: 0, hasText: false, to: 0 }
      }
      const { empty, from, to } = currentEditor.state.selection
      return {
        collapsed: empty,
        from,
        hasText:
          !empty && currentEditor.state.doc.textBetween(from, to).length > 0,
        to,
      }
    },
  }) ?? { collapsed: true, from: 0, hasText: false, to: 0 }

  const selectedAction = actions.find(
    (action) => action.actionId === selectedActionId
  )
  const builtInSelected =
    selectedAction !== undefined && selectedAction.actionId !== "custom"
  const token =
    dismissed || selectedActionId !== null ? null : parseSlashToken(draft)
  const menuOpen = plusOpen || token !== null
  const query = plusOpen ? "" : (token?.query ?? "")
  const rows = actions.filter(
    (action) =>
      action.command.includes(query) ||
      action.label.toLowerCase().includes(query)
  )
  const activeOptionId =
    menuOpen && rows[active]
      ? `${menuId}-option-${rows[active].actionId}`
      : undefined
  const isCustom = selectedActionId === "custom"
  const isAsk = selectedActionId === null && draft.trim().length > 0
  const inputValue = builtInSelected ? selectedAction.label : draft
  const allowedContextScopes =
    policy?.allowedContextScopes ?? defaultContextScopes
  const allowedMutationOperations =
    policy?.allowedMutationOperations ?? defaultMutationOperations
  const configuredContext = policy?.defaultContextScope ?? "adaptive"
  const adaptiveContext = selection.hasText
    ? allowedContextScopes.includes("selection")
      ? "selection"
      : allowedContextScopes.includes("document")
        ? "document"
        : (allowedContextScopes[0] ?? null)
    : allowedContextScopes.includes("document")
      ? "document"
      : (allowedContextScopes[0] ?? null)
  const policyContext =
    configuredContext === "adaptive"
      ? adaptiveContext
      : allowedContextScopes.includes(configuredContext)
        ? configuredContext
        : null
  const contextOverride =
    policy?.allowContextOverride !== false &&
    contextTouched &&
    allowedContextScopes.includes(chosenContext)
      ? chosenContext
      : null
  const contextScope = builtInSelected
    ? selectedAction.contextScope
    : (contextOverride ?? policyContext)
  const configuredMutation = policy?.defaultMutationOperation ?? "adaptive"
  const adaptiveMutation =
    selection.hasText && allowedMutationOperations.includes("replace-selection")
      ? "replace-selection"
      : null
  const policyMutation =
    configuredMutation === "adaptive"
      ? adaptiveMutation
      : allowedMutationOperations.includes(configuredMutation)
        ? configuredMutation
        : null
  const mutationOverride =
    policy?.allowMutationOverride !== false &&
    changeTouched &&
    chosenChange !== null &&
    allowedMutationOperations.includes(chosenChange)
      ? chosenChange
      : null
  const mutationOperation = builtInSelected
    ? selectedAction.mutationOperation
    : (mutationOverride ?? policyMutation)
  const change = changes.find(
    (candidate) => candidate.operation === mutationOperation
  )
  const showContextControl =
    (isAsk || isCustom) &&
    policy?.allowContextOverride !== false &&
    allowedContextScopes.length > 1
  const showChangeControl =
    isCustom &&
    policy?.allowMutationOverride !== false &&
    allowedMutationOperations.length > 1
  const builtInAllowed =
    !builtInSelected ||
    (selectedAction !== undefined &&
      selectedAction.contextScope !== null &&
      selectedAction.mutationOperation !== null &&
      allowedContextScopes.includes(selectedAction.contextScope) &&
      allowedMutationOperations.includes(selectedAction.mutationOperation))
  const requestInProgress =
    session.state === "submitting" || session.state === "streaming"
  const instruction = isCustom || isAsk ? draft.trim() : ""
  const instructionTooLong =
    instruction.length > DEFAULT_REQUEST_LIMITS.maxInstructionLength
  const askBlockReason = getAskBlockReason({
    contextScope,
    editorReady: Boolean(editor && !editor.isDestroyed),
    hasSelection: selection.hasText,
    instruction,
    instructionTooLong,
    pendingProposal: session.pendingProposal !== null,
    requestInProgress,
  })
  const editBlockReason = getEditBlockReason({
    change,
    contextScope,
    editorReady: Boolean(editor && !editor.isDestroyed),
    hasSelection: selection.hasText,
    instruction,
    instructionTooLong,
    pendingProposal: session.pendingProposal !== null,
    policyAllowsAction: builtInAllowed,
    requestInProgress,
    selectedActionId,
    selectionCollapsed: selection.collapsed,
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0)
  }, [menuOpen, query])

  useLayoutEffect(() => {
    setEmendSelectionDecoration(
      editor,
      selectionDecorationActive && selection.hasText
        ? { from: selection.from, to: selection.to }
        : null
    )
  }, [
    editor,
    selection.from,
    selection.hasText,
    selection.to,
    selectionDecorationActive,
    session.editorState?.activeProposalId,
    session.editorState?.revisionCounter,
  ])

  useEffect(
    () => () => {
      setEmendSelectionDecoration(editor, null)
    },
    [editor]
  )

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    const minHeight = 64
    const maxHeight = 82
    input.style.height = "0px"
    const contentHeight = inputValue ? input.scrollHeight : minHeight
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden"
  }, [inputValue])

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (isInsideComposer(rootRef.current, event.target)) return
      setSelectionDecorationActive(false)
      if (!menuOpen) return
      setPlusOpen(false)
      setDismissed(true)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [menuOpen])

  function closeMenu() {
    setPlusOpen(false)
  }

  function clearAction() {
    setSelectedActionId(null)
    setDraft("")
    setDismissed(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function resetRequest() {
    setDraft("")
    setSelectedActionId(null)
    setChosenContext("document")
    setContextTouched(false)
    setChosenChange(null)
    setChangeTouched(false)
    setDismissed(false)
    closeMenu()
  }

  function pick(action: (typeof actions)[number]) {
    if (action.actionId === "custom") {
      if (token) setDraft(draft.slice(0, token.start).trimEnd())
    } else {
      setDraft("")
    }
    setSelectedActionId(action.actionId)
    setPlusOpen(false)
    setDismissed(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function runRequest() {
    if (selectedActionId === null) {
      if (askBlockReason || !contextScope) return
      void session.run("custom", {
        interactionMode: "ask",
        targetScope: contextScope,
        contextScope,
        mutationOperation: null,
        instruction,
      })
      resetRequest()
      return
    }

    if (editBlockReason || !selectedAction || !contextScope) return
    const actionChange =
      selectedAction.actionId === "custom" && change
        ? {
            targetScope: change.targetScope,
            mutationOperation: change.operation,
          }
        : selectedAction
    if (!actionChange?.targetScope || !actionChange.mutationOperation) return

    void session.run(
      selectedAction.actionId === "tone" ? "custom" : selectedAction.actionId,
      {
        interactionMode: "edit",
        targetScope: actionChange.targetScope,
        contextScope,
        mutationOperation: actionChange.mutationOperation,
        ...(selectedAction.actionId === "custom"
          ? { instruction }
          : selectedAction.actionId === "tone"
            ? {
                instruction: `Rewrite the selection in a ${tone} tone. Preserve its meaning.`,
              }
            : {}),
      }
    )
    resetRequest()
  }

  return (
    <div
      ref={rootRef}
      data-ai-composer
      onFocusCapture={() => setSelectionDecorationActive(true)}
      onBlurCapture={(event) => {
        if (!isInsideComposer(event.currentTarget, event.relatedTarget)) {
          setSelectionDecorationActive(false)
        }
      }}
      className={cn("w-full space-y-2", className)}
    >
      <div className="relative">
        {menuOpen && (
          <div
            id={menuId}
            role="listbox"
            aria-label="AI writing actions"
            className="relative z-20 mb-2 max-h-[min(240px,30dvh)] max-w-lg overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {rows.map((action, index) => {
              const actionAllowed =
                action.actionId === "custom"
                  ? allowedContextScopes.length > 0 &&
                    allowedMutationOperations.length > 0
                  : allowedContextScopes.includes(action.contextScope) &&
                    allowedMutationOperations.includes(action.mutationOperation)

              return (
                <Button
                  key={action.actionId}
                  id={`${menuId}-option-${action.actionId}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  variant="ghost"
                  disabled={!actionAllowed}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(action)}
                  className={cn(
                    "relative z-10 min-h-10 w-full justify-start gap-2.5 rounded-lg px-2 text-left font-normal active:translate-y-0",
                    index === active && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="flex size-5.5 shrink-0 items-center justify-center text-muted-foreground">
                    <HugeiconsIcon icon={action.icon} size={14} />
                  </span>
                  <span className="shrink-0 text-[12.5px] font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                    {actionAllowed
                      ? action.description
                      : "Unavailable under the Composer policy."}
                  </span>
                </Button>
              )
            })}
            {rows.length === 0 && (
              <div className="flex h-9 items-center px-2 text-[12px] text-muted-foreground">
                No actions match “{query}”
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "relative isolate flex max-w-lg flex-col gap-1.5 overflow-hidden rounded-3xl border border-border/60 bg-card p-1.5 text-card-foreground shadow-md focus-within:border-border",
            "max-w-none shadow-none",
            "rounded-2xl p-2.5"
          )}
        >
          <div className="grid grid-cols-[28px_minmax(0,1fr)_auto_28px] items-end gap-x-1 gap-y-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Choose an AI action"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => {
                setPlusOpen((current) => !current)
                setDismissed(false)
                inputRef.current?.focus()
              }}
              className={cn(
                "justify-self-start rounded-full text-muted-foreground",
                menuOpen && "bg-accent text-accent-foreground",
                "col-start-1 row-start-2"
              )}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
            </Button>

            {builtInSelected ? (
              <div
                className={cn(
                  "min-w-0 overflow-hidden",
                  "col-span-full col-start-1 row-start-1 flex flex-col items-start gap-1 px-1"
                )}
              >
                <Badge
                  variant="secondary"
                  className="h-6 max-w-full gap-1 pr-1 text-[12px]"
                >
                  <span data-icon="inline-start">
                    <HugeiconsIcon icon={selectedAction.icon} size={12} />
                  </span>
                  {selectedAction.label}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Clear ${selectedAction.label} action`}
                    title="Remove action"
                    onClick={clearAction}
                    className="-mr-0.5 size-4 rounded-full"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={10} />
                  </Button>
                </Badge>
                <span className="min-w-0 text-[12px] text-muted-foreground">
                  {selectedAction.description}
                </span>
              </div>
            ) : (
              <Textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                disabled={!editor || requestInProgress}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setDismissed(false)
                  setPlusOpen(false)
                }}
                onKeyDown={(event) => {
                  if (menuOpen && rows.length > 0) {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault()
                      setActive(
                        (current) =>
                          (current +
                            (event.key === "ArrowDown" ? 1 : rows.length - 1)) %
                          rows.length
                      )
                      return
                    }
                    if (
                      (event.key === "Enter" && !event.shiftKey) ||
                      event.key === "Tab"
                    ) {
                      event.preventDefault()
                      pick(rows[active]!)
                      return
                    }
                  }
                  if (event.key === "Escape" && menuOpen) {
                    event.stopPropagation()
                    setDismissed(true)
                    closeMenu()
                    return
                  }
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    runRequest()
                  }
                }}
                placeholder={
                  isCustom
                    ? "Tell Emend what to change…"
                    : "Ask Emend or choose an action…"
                }
                aria-label="AI instruction"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={menuId}
                aria-expanded={menuOpen}
                aria-activedescendant={activeOptionId}
                className={cn(
                  "min-h-7 min-w-0 resize-none border-0 bg-transparent px-1 py-1.25 text-[13px] leading-4.5 wrap-anywhere shadow-none focus-visible:ring-0 disabled:bg-transparent md:text-[13px] dark:bg-transparent dark:disabled:bg-transparent",
                  "col-span-full col-start-1 row-start-1"
                )}
              />
            )}

            <div
              className={cn(
                "col-start-3 flex min-w-0 flex-wrap items-center justify-end gap-1",
                "row-start-2"
              )}
            >
              {selectedActionId === "tone" && (
                <Select
                  value={tone}
                  onValueChange={(value) => value && setTone(value)}
                >
                  <SelectTrigger
                    aria-label="Writing tone"
                    size="sm"
                    className="max-w-48 border-0 text-xs shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-ai-composer-portal>
                    <SelectGroup>
                      <SelectItem value="warm and conversational">
                        Friendly
                      </SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="straightforward">
                        Straightforward
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              {showContextControl && (
                <Select
                  value={contextOverride}
                  disabled={!editor || requestInProgress}
                  onValueChange={(value) => {
                    if (!value) return
                    setChosenContext(value as EmendContextScope)
                    setContextTouched(true)
                  }}
                >
                  <SelectTrigger
                    aria-label="AI read context"
                    title={
                      contextScope
                        ? `Read context: ${scopeLabel(contextScope)}`
                        : "Choose AI read context"
                    }
                    size="sm"
                    className={cn(
                      "border-0 bg-transparent text-[11px] shadow-none hover:bg-accent data-[size=sm]:rounded-full dark:bg-transparent dark:hover:bg-accent",
                      contextOverride !== null
                        ? "max-w-32 px-2"
                        : "size-7 justify-center gap-0 p-0 [&>svg:last-child]:hidden"
                    )}
                  >
                    {contextOverride !== null ? (
                      <SelectValue>{scopeLabel(chosenContext)}</SelectValue>
                    ) : (
                      <HugeiconsIcon icon={BookOpenTextIcon} size={14} />
                    )}
                  </SelectTrigger>
                  <SelectContent
                    data-ai-composer-portal
                    align="end"
                    className="min-w-48"
                  >
                    <SelectGroup>
                      {allowedContextScopes.includes("selection") && (
                        <SelectItem
                          value="selection"
                          disabled={!selection.hasText}
                        >
                          <HugeiconsIcon icon={TextSelectionIcon} size={15} />
                          {selection.hasText
                            ? "Selection"
                            : "Selection (select text)"}
                        </SelectItem>
                      )}
                      {allowedContextScopes.includes("current-block") && (
                        <SelectItem value="current-block">
                          <HugeiconsIcon icon={TextAlignLeftIcon} size={15} />
                          Current block
                        </SelectItem>
                      )}
                      {allowedContextScopes.includes("document") && (
                        <SelectItem value="document">
                          <HugeiconsIcon icon={File01Icon} size={15} />
                          Document
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              {showChangeControl && (
                <Select
                  value={mutationOverride}
                  disabled={!editor || requestInProgress}
                  onValueChange={(value) => {
                    if (!value) return
                    setChosenChange(value as EmendMutationOperation)
                    setChangeTouched(true)
                  }}
                >
                  <SelectTrigger
                    aria-label="AI change target"
                    title={
                      change
                        ? `Change target: ${change.label}`
                        : "Choose AI change target"
                    }
                    size="sm"
                    className={cn(
                      "border-0 bg-transparent text-[11px] shadow-none hover:bg-accent data-[size=sm]:rounded-full dark:bg-transparent dark:hover:bg-accent",
                      mutationOverride !== null && change
                        ? "max-w-40 px-2"
                        : "size-7 justify-center gap-0 p-0 [&>svg:last-child]:hidden"
                    )}
                  >
                    {mutationOverride !== null && change ? (
                      <SelectValue>{change.label}</SelectValue>
                    ) : (
                      <HugeiconsIcon icon={Edit02Icon} size={14} />
                    )}
                  </SelectTrigger>
                  <SelectContent
                    data-ai-composer-portal
                    align="end"
                    className="min-w-52"
                  >
                    <SelectGroup>
                      {changes
                        .filter((candidate) =>
                          allowedMutationOperations.includes(
                            candidate.operation
                          )
                        )
                        .map((candidate) => (
                          <SelectItem
                            key={candidate.operation}
                            value={candidate.operation}
                            disabled={
                              (candidate.operation === "replace-selection" &&
                                !selection.hasText) ||
                              (candidate.operation === "insert-at-cursor" &&
                                !selection.collapsed)
                            }
                          >
                            <ChangeTargetIcon operation={candidate.operation} />
                            {candidate.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              type="button"
              size="icon-sm"
              aria-label={
                requestInProgress
                  ? "Stop"
                  : builtInSelected
                    ? `Create ${selectedAction.label} proposal`
                    : isCustom
                      ? "Create custom proposal"
                      : "Send Ask request"
              }
              title={
                requestInProgress
                  ? "Stop response"
                  : selectedActionId === null
                    ? (askBlockReason ?? "Ask without changing the document")
                    : (editBlockReason ?? "Create proposal")
              }
              disabled={
                !requestInProgress &&
                (selectedActionId === null
                  ? askBlockReason !== null
                  : editBlockReason !== null)
              }
              onClick={requestInProgress ? session.stop : runRequest}
              className="col-start-4 row-start-2 rounded-full"
            >
              <HugeiconsIcon
                icon={requestInProgress ? StopIcon : ArrowUp01Icon}
                size={16}
                strokeWidth={2.4}
              />
            </Button>
          </div>
        </div>
      </div>

      {suggestions && !menuOpen && !selectedActionId && !draft && (
        <div className="flex flex-col items-start gap-1.5 pt-3">
          {[quickActions.slice(0, 3), quickActions.slice(3)].map(
            (row, rowIndex) => (
              <div key={rowIndex} className="flex flex-wrap gap-1.5">
                {row.map((action) => {
                  const actionAllowed =
                    selection.hasText &&
                    allowedContextScopes.includes(action.contextScope) &&
                    allowedMutationOperations.includes(action.mutationOperation)

                  return (
                    <Button
                      key={action.actionId}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!actionAllowed}
                      title={
                        actionAllowed
                          ? action.description
                          : !selection.hasText
                            ? "Select text in the draft to use this action."
                            : "Unavailable under the current assistant policy."
                      }
                      onClick={() => pick(action)}
                      className="rounded-full font-normal"
                    >
                      <HugeiconsIcon icon={action.icon} size={14} />
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            )
          )}
          {!selection.hasText && (
            <p className="px-1 text-xs text-muted-foreground">
              Select text in your draft to use a writing action.
            </p>
          )}
        </div>
      )}
      {session.pendingProposal === null && (
        <ComposerHelp
          contextScope={contextScope}
          blockReason={
            selectedActionId === null ? askBlockReason : editBlockReason
          }
          hasRequest={isAsk || selectedActionId !== null}
          instructionLength={instruction.length}
          isCustom={isCustom}
        />
      )}
    </div>
  )
}

function parseSlashToken(
  draft: string
): { readonly query: string; readonly start: number } | null {
  const match = /(^|\s)\/([\w-]*)$/.exec(draft)
  if (!match) return null
  return {
    query: match[2]!.toLowerCase(),
    start: match.index + match[1]!.length,
  }
}

function isInsideComposer(
  root: HTMLElement | null,
  target: EventTarget | null
) {
  if (!(target instanceof Node)) return false
  if (root?.contains(target)) return true
  return (
    target instanceof Element &&
    target.closest("[data-ai-composer-portal]") !== null
  )
}

function getAskBlockReason(input: {
  readonly contextScope: EmendContextScope | null
  readonly editorReady: boolean
  readonly hasSelection: boolean
  readonly instruction: string
  readonly instructionTooLong: boolean
  readonly pendingProposal: boolean
  readonly requestInProgress: boolean
}): string | null {
  if (!input.editorReady) return "The editor is still mounting."
  if (input.requestInProgress) return "Wait for the current request to finish."
  if (input.pendingProposal) return "Review the current proposal first."
  if (!input.instruction) return "Enter a prompt."
  if (input.instructionTooLong) return "The instruction is too long."
  if (!input.contextScope) return "Choose what Emend may read."
  if (input.contextScope === "selection" && !input.hasSelection) {
    return "Select text before using Selection context."
  }
  return null
}

function getEditBlockReason(input: {
  readonly change: ComposerChange | undefined
  readonly contextScope: EmendContextScope | null
  readonly editorReady: boolean
  readonly hasSelection: boolean
  readonly instruction: string
  readonly instructionTooLong: boolean
  readonly pendingProposal: boolean
  readonly policyAllowsAction: boolean
  readonly requestInProgress: boolean
  readonly selectedActionId: ComposerActionId | null
  readonly selectionCollapsed: boolean
}): string | null {
  if (!input.editorReady) return "The editor is still mounting."
  if (input.requestInProgress) return "Wait for the current request to finish."
  if (input.pendingProposal) return "Review the current proposal first."
  if (!input.selectedActionId) return "Choose an action."
  if (!input.policyAllowsAction) {
    return "This action is unavailable under the Composer policy."
  }
  if (!input.contextScope) return "Choose what Emend may read."
  if (input.contextScope === "selection" && !input.hasSelection) {
    return "Select text before using Selection context."
  }
  if (input.selectedActionId === "custom") {
    if (!input.instruction) return "Enter a custom instruction."
    if (input.instructionTooLong) return "The instruction is too long."
  }
  if (!input.change) return "Choose how Emend should change the document."
  if (input.change.operation === "replace-selection" && !input.hasSelection) {
    return "Select text before replacing the Selection."
  }
  if (
    input.change.operation === "insert-at-cursor" &&
    !input.selectionCollapsed
  ) {
    return "Collapse the selection before inserting at the cursor."
  }
  return null
}

function ComposerHelp({
  contextScope,
  blockReason,
  hasRequest,
  instructionLength,
  isCustom,
}: {
  readonly contextScope: EmendContextScope | null
  readonly blockReason: string | null
  readonly hasRequest: boolean
  readonly instructionLength: number
  readonly isCustom: boolean
}) {
  if (!hasRequest) return null

  if (
    isCustom &&
    instructionLength > DEFAULT_REQUEST_LIMITS.maxInstructionLength
  ) {
    return (
      <p className="px-2 text-xs text-destructive" role="alert">
        Keep the instruction within{" "}
        {DEFAULT_REQUEST_LIMITS.maxInstructionLength} characters.
      </p>
    )
  }
  if (blockReason) {
    return <p className="px-2 text-xs text-muted-foreground">{blockReason}</p>
  }
  if (contextScope === "document") {
    return (
      <p className="px-2 text-xs text-muted-foreground">
        Uses your document as context.
      </p>
    )
  }
  return null
}

function scopeLabel(scope: EmendContextScope): string {
  if (scope === "current-block") return "Current block"
  return scope === "selection" ? "Selection" : "Document"
}

function ChangeTargetIcon({
  operation,
}: {
  readonly operation: EmendMutationOperation
}) {
  const icon =
    operation === "replace-selection"
      ? TextSelectionIcon
      : operation === "replace-current-block"
        ? TextAlignLeftIcon
        : operation === "replace-document"
          ? FileEditIcon
          : CursorTextIcon

  return <HugeiconsIcon icon={icon} size={15} />
}
