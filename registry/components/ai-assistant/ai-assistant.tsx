"use client"

import type {
  EmendActionId,
  EmendConversationMessage,
  EmendRunOptions,
} from "@emend/ai"
import type { UseEditorAiOptions, UseEditorAiResult } from "@emend/ai/react"
import { useEditorAi } from "@emend/ai/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import BubbleChatAddIcon from "@hugeicons/core-free-icons/BubbleChatAddIcon"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@/components/ui/message-scroller"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useEffect, useLayoutEffect, useState } from "react"
import {
  AiAssistantComposer,
  type AiAssistantPolicy,
} from "./ai-assistant-composer"
import { AiAssistantMessage } from "./ai-assistant-message"
import {
  useAssistantHistory,
  type AssistantThread,
} from "./use-assistant-history"

export interface AssistantMessage extends EmendConversationMessage {
  readonly id: string
  readonly requestId: string
}

export interface AiAssistantProps {
  readonly editor: UseEditorAiOptions["editor"]
  readonly transport: UseEditorAiOptions["transport"]
  readonly policy?: AiAssistantPolicy
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly defaultOpen?: boolean
  readonly storageKey?: string
  readonly inline?: boolean
  readonly className?: string
  readonly panelClassName?: string
}

export interface AiAssistantViewProps {
  readonly editor: UseEditorAiOptions["editor"]
  readonly session: UseEditorAiResult
  readonly policy?: AiAssistantPolicy
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly defaultOpen?: boolean
  readonly storageKey?: string
  readonly inline?: boolean
  readonly className?: string
  readonly panelClassName?: string
}

export function AiAssistant({
  editor,
  transport,
  policy,
  open,
  onOpenChange,
  defaultOpen,
  storageKey,
  inline,
  className,
  panelClassName,
}: AiAssistantProps) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  return (
    <AiAssistantView
      editor={editor}
      session={session}
      policy={policy}
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      storageKey={storageKey}
      inline={inline}
      className={className}
      panelClassName={panelClassName}
    />
  )
}

export function AiAssistantView(props: AiAssistantViewProps) {
  return <AiAssistantPanel key={props.storageKey} {...props} />
}

function AiAssistantPanel({
  editor,
  session,
  policy,
  open,
  onOpenChange,
  defaultOpen = false,
  storageKey = "emend:ai-assistant:v1",
  inline = false,
  className,
  panelClassName,
}: AiAssistantViewProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen)
  const isOpen = open ?? localOpen
  const [historyOpen, setHistoryOpen] = useState(false)
  const [threadId, setThreadId] = useState("")
  const { threads, saveThread, deleteThread, storageNotice } =
    useAssistantHistory(storageKey)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [hiddenRequestId, setHiddenRequestId] = useState<string | null>(
    session.activeRequest?.requestId ?? null
  )
  const request = session.activeRequest
  const showCurrentTurn =
    request !== null && request.requestId !== hiddenRequestId
  const requestLabel = request ? getRequestLabel(request) : ""
  const assistantContent = getAssistantContent(session)
  const currentRequestArchived =
    request !== null &&
    messages.some((message) => message.requestId === request.requestId)
  const lastMessage = messages[messages.length - 1]
  const currentUserStored =
    lastMessage?.role === "user" &&
    lastMessage.requestId.startsWith("local-") &&
    lastMessage.content === requestLabel
  const currentTurn =
    showCurrentTurn && request && !currentRequestArchived
      ? createTurn(request.requestId, requestLabel, assistantContent).slice(
          currentUserStored ? 1 : 0
        )
      : []
  const visibleMessages = [...messages, ...currentTurn]
  const detachedError =
    messages.length > 0 && (request === null || currentRequestArchived)
      ? (session.error ?? session.reviewError)
      : null

  const busy = session.state === "submitting" || session.state === "streaming"
  const snapshot = JSON.stringify(visibleMessages)
  useEffect(() => {
    if (!threadId || busy) return
    saveThread({
      id: threadId,
      messages: JSON.parse(snapshot) as AssistantMessage[],
    })
  }, [threadId, busy, snapshot, saveThread])

  function changeOpen(nextOpen: boolean) {
    setLocalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  function archiveCurrentTurn(nextMessage?: AssistantMessage) {
    if ((!request || currentTurn.length === 0) && !nextMessage) return
    setMessages((current) => {
      const archived =
        request &&
        currentTurn.length > 0 &&
        !current.some((message) => message.requestId === request.requestId)
          ? [...current, ...currentTurn]
          : current

      return nextMessage ? [...archived, nextMessage] : archived
    })
  }

  const chatSession: UseEditorAiResult = {
    ...session,
    run: (actionId, options) => {
      if (!threadId) setThreadId(crypto.randomUUID())
      const userMessage = createUserMessage(
        getMessageLabel(actionId, options?.instruction)
      )
      const history = visibleMessages.map(({ role, content }) => ({
        role,
        content,
      }))
      archiveCurrentTurn(userMessage)
      return session.run(actionId, {
        ...options,
        messages: [
          ...history,
          {
            role: "user",
            content: userMessage.content,
          },
        ],
      })
    },
    regenerate: () => {
      archiveCurrentTurn()
      return session.regenerate()
    },
    accept: (confirmDocumentReplacement) => {
      archiveCurrentTurn()
      return session.accept(confirmDocumentReplacement)
    },
    reject: () => {
      archiveCurrentTurn()
      return session.reject()
    },
  }

  function startNewChat(thread?: AssistantThread) {
    if (threadId) saveThread({ id: threadId, messages: visibleMessages })
    setMessages(thread?.messages ?? [])
    setThreadId(thread?.id ?? crypto.randomUUID())
    setHistoryOpen(false)
    if (request) setHiddenRequestId(request.requestId)
    if (session.state === "submitting" || session.state === "streaming") {
      session.stop()
    } else if (session.pendingProposal) {
      session.reject()
    } else if (request?.interactionMode === "ask") {
      session.dismissInformationalResult()
    }
  }

  function deleteChat(thread: AssistantThread) {
    if (thread.id === threadId) {
      setMessages([])
      setThreadId(crypto.randomUUID())
      if (request) setHiddenRequestId(request.requestId)
      setHistoryOpen(true)

      if (busy) {
        session.stop()
      } else if (session.pendingProposal) {
        session.reject()
      } else if (request?.interactionMode === "ask") {
        session.dismissInformationalResult()
      }
    }
    deleteThread(thread.id)
  }

  const title = historyOpen
    ? "Chat history"
    : visibleMessages.length
      ? "AI Assistant"
      : "New chat"

  const content = (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        {inline ? (
          <h2 className="truncate text-sm font-medium">{title}</h2>
        ) : (
          <PopoverTitle className="truncate text-sm font-medium">
            {title}
          </PopoverTitle>
        )}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={historyOpen ? "Back to chat" : "Chat history"}
                  aria-pressed={historyOpen}
                  onClick={() => setHistoryOpen(!historyOpen)}
                />
              }
            >
              <HugeiconsIcon
                icon={historyOpen ? ArrowLeft01Icon : Clock01Icon}
                size={16}
              />
            </TooltipTrigger>
            <TooltipContent>
              {historyOpen ? "Back to chat" : "Chat history"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New chat"
                  onClick={() => startNewChat()}
                />
              }
            >
              <HugeiconsIcon icon={BubbleChatAddIcon} size={16} />
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI Assistant"
            onClick={() => changeOpen(false)}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </Button>
        </div>
      </div>
      {storageNotice && (
        <p
          role="status"
          className="border-b px-4 py-2 text-xs text-muted-foreground"
        >
          {storageNotice}
        </p>
      )}
      {historyOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Your latest 20 chats, saved in this browser.
          </p>
          {threads.length === 0 && (
            <p className="px-2 py-8 text-sm text-muted-foreground">
              Your conversations will appear here.
            </p>
          )}
          {threads.map((thread) => {
            const title =
              thread.messages.find((message) => message.role === "user")
                ?.content ?? "New chat"

            return (
              <div
                key={thread.id}
                className="flex items-center gap-1 rounded-lg pr-1 hover:bg-muted"
              >
                <button
                  type="button"
                  onClick={() => startNewChat(thread)}
                  className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring"
                  aria-current={thread.id === threadId ? "true" : undefined}
                >
                  <span className="line-clamp-1 text-sm font-medium">
                    {title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(thread.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {thread.messages.length} messages
                  </span>
                </button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Delete chat: ${title}`}
                  title={`Delete chat: ${title}`}
                  onClick={() => deleteChat(thread)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </Button>
              </div>
            )
          })}
        </div>
      ) : visibleMessages.length === 0 && !detachedError ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center-safe overflow-y-auto px-4 py-6">
          <div className="mb-6 space-y-2 px-1">
            <h3 className="text-xl font-medium tracking-tight">
              How can I help you today?
            </h3>
            <p className="text-sm text-muted-foreground">
              Select text to edit, or chat without a selection.
            </p>
          </div>
          <AiAssistantComposer
            key={threadId}
            editor={editor}
            session={chatSession}
            policy={policy}
            suggestions
          />
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <MessageScrollerProvider
              key={threadId}
              autoScroll
              defaultScrollPosition="last-anchor"
            >
              <AssistantStreamScroll
                content={session.streamedMarkdown}
                active={busy}
              />
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={
                      session.state === "submitting" ||
                      session.state === "streaming"
                    }
                    className="gap-4 p-4"
                  >
                    {visibleMessages.map((message) => {
                      const currentAssistant =
                        showCurrentTurn &&
                        !currentRequestArchived &&
                        message.role === "assistant" &&
                        message.requestId === request?.requestId

                      return (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={message.role === "user"}
                          style={
                            currentAssistant
                              ? { contentVisibility: "visible" }
                              : undefined
                          }
                        >
                          {message.role === "user" ? (
                            <div className="flex justify-end">
                              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                                {message.content}
                              </div>
                            </div>
                          ) : currentAssistant ? (
                            <AiAssistantMessage
                              editor={editor}
                              session={chatSession}
                            />
                          ) : (
                            <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-3 text-sm text-foreground">
                              <p className="leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          )}
                        </MessageScrollerItem>
                      )
                    })}

                    {detachedError && (
                      <MessageScrollerItem
                        messageId={`error-${detachedError.code}`}
                      >
                        <p
                          className="max-w-[92%] rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
                          role="alert"
                        >
                          {detachedError.message}
                        </p>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          </div>

          <div className="shrink-0 border-t p-3">
            <AiAssistantComposer
              key={threadId}
              editor={editor}
              session={chatSession}
              policy={policy}
            />
          </div>
        </>
      )}
    </>
  )

  if (inline) {
    if (!isOpen) return null

    return (
      <aside
        aria-label="AI Assistant"
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-popover text-sm [overflow-wrap:anywhere] text-popover-foreground",
          panelClassName
        )}
      >
        {content}
      </aside>
    )
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen, details) => {
        if (
          details.reason === "outside-press" ||
          details.reason === "focus-out"
        ) {
          details.cancel()
          return
        }
        changeOpen(nextOpen)
      }}
      modal={false}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon"
            aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
            className={cn(
              "fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-lg",
              className
            )}
          />
        }
      >
        <HugeiconsIcon
          icon={isOpen ? ArrowDown01Icon : AiChat02Icon}
          size={22}
          className="transition-transform duration-200 motion-reduce:transition-none"
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        initialFocus={false}
        aria-label="AI Assistant"
        className={cn(
          "flex h-[min(600px,calc(100dvh-100px))] max-h-(--available-height) w-[min(400px,calc(100vw-24px))] flex-col gap-0 overflow-hidden rounded-2xl p-0 [overflow-wrap:anywhere] shadow-xl duration-200 motion-reduce:animate-none",
          panelClassName
        )}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

function AssistantStreamScroll({
  content,
  active,
}: {
  content: string
  active: boolean
}) {
  const { scrollToEnd } = useMessageScroller()
  const { end: awayFromEnd } = useMessageScrollerScrollable()

  useLayoutEffect(() => {
    if (active && !awayFromEnd) scrollToEnd({ behavior: "auto" })
  }, [active, awayFromEnd, content, scrollToEnd])

  return null
}

function getRequestLabel(
  request: NonNullable<UseEditorAiResult["activeRequest"]>
) {
  return getMessageLabel(request.actionId, request.instruction)
}

function createTurn(
  requestId: string,
  requestLabel: string,
  assistantContent: string
): AssistantMessage[] {
  return [
    {
      id: `user-${requestId}`,
      requestId,
      role: "user",
      content: requestLabel,
    },
    {
      id: `assistant-${requestId}`,
      requestId,
      role: "assistant",
      content: assistantContent,
    },
  ]
}

function createUserMessage(content: string): AssistantMessage {
  const requestId = `local-${crypto.randomUUID()}`

  return {
    id: `user-${requestId}`,
    requestId,
    role: "user",
    content,
  }
}

function getMessageLabel(
  actionId: EmendActionId,
  instruction?: EmendRunOptions["instruction"]
) {
  if (instruction) return instruction

  const labels: Record<string, string> = {
    improve: "Improve the selected writing",
    shorten: "Shorten the selected writing",
    expand: "Make the selected writing longer",
    "fix-grammar": "Fix grammar and spelling",
  }

  return labels[actionId] ?? actionId.replaceAll("-", " ")
}

function getAssistantContent(session: UseEditorAiResult) {
  const error = session.error?.message ?? session.reviewError?.message

  if (session.activeRequest?.interactionMode === "ask") {
    return (
      session.informationalMarkdown ||
      session.streamedMarkdown ||
      error ||
      "No response was received."
    )
  }

  return (
    session.proposalMarkdown ||
    session.pendingProposal?.content.value ||
    session.streamedMarkdown ||
    error ||
    "No response was received."
  )
}
