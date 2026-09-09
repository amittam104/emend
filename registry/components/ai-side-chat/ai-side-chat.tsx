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
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useState } from "react"
import {
  AiComposerView,
  type AiComposerPolicy,
} from "../ai-composer/ai-composer"
import { AiSideChatMessage } from "./ai-side-chat-message"

interface SideChatMessage extends EmendConversationMessage {
  readonly id: string
  readonly requestId: string
}

export interface AiSideChatProps {
  readonly editor: UseEditorAiOptions["editor"]
  readonly transport: UseEditorAiOptions["transport"]
  readonly policy?: AiComposerPolicy
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly defaultOpen?: boolean
  readonly inline?: boolean
  readonly className?: string
  readonly panelClassName?: string
}

export interface AiSideChatViewProps {
  readonly editor: UseEditorAiOptions["editor"]
  readonly session: UseEditorAiResult
  readonly policy?: AiComposerPolicy
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly defaultOpen?: boolean
  readonly inline?: boolean
  readonly className?: string
  readonly panelClassName?: string
}

export function AiSideChat({
  editor,
  transport,
  policy,
  open,
  onOpenChange,
  defaultOpen,
  inline,
  className,
  panelClassName,
}: AiSideChatProps) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  return (
    <AiSideChatView
      editor={editor}
      session={session}
      policy={policy}
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      inline={inline}
      className={className}
      panelClassName={panelClassName}
    />
  )
}

export function AiSideChatView({
  editor,
  session,
  policy,
  open,
  onOpenChange,
  defaultOpen = false,
  inline = false,
  className,
  panelClassName,
}: AiSideChatViewProps) {
  const [messages, setMessages] = useState<SideChatMessage[]>([])
  const [hiddenRequestId, setHiddenRequestId] = useState<string | null>(null)
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
    request === null || currentRequestArchived
      ? (session.error ?? session.reviewError)
      : null

  function archiveCurrentTurn(nextMessage?: SideChatMessage) {
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

  function startNewChat() {
    setMessages([])
    if (request) setHiddenRequestId(request.requestId)
    if (session.state === "submitting" || session.state === "streaming") {
      session.stop()
    } else if (session.pendingProposal) {
      session.reject()
    } else if (request?.interactionMode === "ask") {
      session.dismissInformationalResult()
    }
  }

  const content = (
    <>
      <SheetHeader className={cn("border-b border-border", !inline && "pr-14")}>
        <div className="flex items-center justify-between gap-3">
          {inline ? (
            <h2 className="font-heading text-sm font-medium text-foreground">
              AI Chat
            </h2>
          ) : (
            <SheetTitle className="text-sm">AI Chat</SheetTitle>
          )}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="New chat"
                    onClick={startNewChat}
                  />
                }
              >
                <HugeiconsIcon icon={BubbleChatAddIcon} size={16} />
              </TooltipTrigger>
              <TooltipContent>New chat</TooltipContent>
            </Tooltip>
            {inline && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close AI Side Chat"
                      onClick={() => onOpenChange?.(false)}
                    />
                  }
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent
                aria-busy={
                  session.state === "submitting" ||
                  session.state === "streaming"
                }
                className="justify-end gap-4 p-4"
              >
                {visibleMessages.length === 0 && !detachedError && (
                  <MessageScrollerItem messageId="welcome">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-3 text-sm leading-relaxed">
                      <p className="text-muted-foreground">
                        Ask about this draft, or select text and choose a
                        writing action below.
                      </p>
                    </div>
                  </MessageScrollerItem>
                )}

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
                      scrollAnchor={
                        showCurrentTurn &&
                        message.role === "user" &&
                        (message.requestId === request?.requestId ||
                          (currentUserStored && message.id === lastMessage?.id))
                      }
                    >
                      {message.role === "user" ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                            {message.content}
                          </div>
                        </div>
                      ) : currentAssistant ? (
                        <AiSideChatMessage
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

      <div className="p-2">
        <AiComposerView
          editor={editor}
          session={chatSession}
          policy={policy}
          showReview={false}
          variant="side-chat"
        />
      </div>
    </>
  )

  if (inline) {
    if (!(open ?? defaultOpen)) return null

    return (
      <aside
        aria-label="AI Side Chat"
        className={cn(
          "flex h-full min-h-0 flex-col bg-popover text-sm text-popover-foreground",
          panelClassName
        )}
      >
        {content}
      </aside>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      modal={false}
      disablePointerDismissal
    >
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("gap-2 bg-background shadow-sm", className)}
          />
        }
      >
        <HugeiconsIcon icon={AiChat02Icon} size={16} />
        AI Chat
      </SheetTrigger>

      <SheetContent
        showOverlay={false}
        initialFocus={false}
        className="w-full! gap-0 p-0 sm:max-w-md!"
      >
        {content}
      </SheetContent>
    </Sheet>
  )
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
): SideChatMessage[] {
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

function createUserMessage(content: string): SideChatMessage {
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
