"use client"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type SyntheticEvent,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import CornerDownRightIcon from "@hugeicons/core-free-icons/CornerDownRightIcon"
import File02Icon from "@hugeicons/core-free-icons/File02Icon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import Refresh01Icon from "@hugeicons/core-free-icons/Refresh01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import StopIcon from "@hugeicons/core-free-icons/StopIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useChat, type UseChatHelpers } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  type Tool,
  type UIMessage,
  type UIToolInvocation,
} from "ai"
import { Markdown } from "../markdown"

export type ChatUIMessage = UIMessage<
  never,
  {
    client: {
      location: string
    }
  }
>

export type SearchTool = Tool<{ query: string; limit: number }>

const Context = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  chat: UseChatHelpers<ChatUIMessage>
} | null>(null)

const suggestions = [
  "How do I add emend to an existing Tiptap editor?",
  "Can I review AI edits before applying them?",
  "What's the difference between AI Composer and AI Assistant?",
]

const fadeUp =
  "motion-safe:animate-[ai-fade-up_400ms_cubic-bezier(0.23,1,0.32,1)_both]"

function IconButton({
  label,
  icon,
  className,
  ...props
}: ComponentProps<"button"> & { label: string; icon: IconSvgElement }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className={cn(
              "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-fd-ring flex size-7 items-center justify-center rounded-lg transition-[background-color,color,scale] duration-150 focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-[0.94]",
              className
            )}
            {...props}
          />
        }
      >
        <HugeiconsIcon icon={icon} aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AISearchPanelHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  const { setOpen, chat } = useAISearchContext()

  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-2 border-b ps-4 pe-2",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        <HugeiconsIcon
          icon={AiArtIcon}
          aria-hidden="true"
          className="text-fd-muted-foreground size-4 shrink-0"
        />
        <p className="truncate text-sm font-medium">Ask AI</p>
      </div>

      <div className="flex items-center gap-0.5">
        {chat.messages.length > 0 && (
          <IconButton
            label="New chat"
            icon={PencilEdit02Icon}
            onClick={() => {
              void chat.stop()
              chat.setMessages([])
              chat.clearError()
            }}
          />
        )}
        <IconButton
          label="Close"
          icon={Cancel01Icon}
          onClick={() => setOpen(false)}
        />
      </div>
    </div>
  )
}

function useSendMessage() {
  const { sendMessage } = useChatContext()

  return (text: string) =>
    sendMessage({
      role: "user",
      parts: [
        {
          type: "data-client",
          data: {
            location: location.pathname,
          },
        },
        {
          type: "text",
          text,
        },
      ],
    })
}

const StorageKeyInput = "__ai_search_input"
export function AISearchInput({ className, ...props }: ComponentProps<"form">) {
  const { status, stop } = useChatContext()
  const send = useSendMessage()
  const [input, setInput] = useState(
    () => localStorage.getItem(StorageKeyInput) ?? ""
  )
  const isLoading = status === "streaming" || status === "submitted"
  const canSend = input.trim().length > 0 && !isLoading

  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault()
    const message = input.trim()
    if (message.length === 0 || isLoading) return

    void send(message)
    setInput("")
    localStorage.removeItem(StorageKeyInput)
  }

  return (
    <form
      {...props}
      className={cn(
        "bg-fd-popover shadow-elevation-1 focus-within:border-fd-foreground/20 focus-within:shadow-elevation-2 flex cursor-text items-end gap-1 rounded-2xl border p-1.5 transition-[border-color,box-shadow] duration-150",
        className
      )}
      onSubmit={onStart}
      onClick={() => document.getElementById("nd-ai-input")?.focus()}
    >
      <Input
        value={input}
        aria-label="Ask a question"
        placeholder="Ask a question about emend…"
        autoFocus
        className="px-2 py-1.5 text-sm leading-5"
        onChange={(e) => {
          setInput(e.target.value)
          localStorage.setItem(StorageKeyInput, e.target.value)
        }}
        onKeyDown={(event) => {
          // keyCode 229: Safari fires `compositionend` before this keydown, `isComposing` is already false
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (!event.shiftKey && event.key === "Enter") {
            onStart(event)
          }
        }}
      />
      {isLoading ? (
        <button
          key="stop"
          type="button"
          aria-label="Stop answer"
          className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85 focus-visible:ring-fd-ring flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,scale] duration-150 focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-[0.94]"
          onClick={(e) => {
            e.stopPropagation()
            void stop()
          }}
        >
          <HugeiconsIcon
            icon={StopIcon}
            aria-hidden="true"
            className="size-3.5 fill-current"
          />
        </button>
      ) : (
        <button
          key="send"
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className={cn(
            "focus-visible:ring-fd-ring flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-200 focus-visible:ring-2 focus-visible:outline-none motion-safe:enabled:active:scale-[0.94]",
            canSend
              ? "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85"
              : "bg-fd-secondary text-fd-muted-foreground"
          )}
        >
          <HugeiconsIcon
            icon={ArrowUp02Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2.2}
          />
        </button>
      )}
    </form>
  )
}

function List({
  scrollKey,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "dir"> & { scrollKey: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const observer = new ResizeObserver(() => {
      if (stickToBottom.current)
        container.scrollTo({ top: container.scrollHeight, behavior: "instant" })
    })
    observer.observe(content)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    stickToBottom.current = true
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "instant",
    })
  }, [scrollKey])

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn("fd-scroll-container min-w-0 overflow-y-auto", className)}
      onScroll={(e) => {
        const el = e.currentTarget
        stickToBottom.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < 48
      }}
    >
      <div ref={contentRef} className="flex min-h-full flex-col">
        {children}
      </div>
    </div>
  )
}

function Input(props: ComponentProps<"textarea">) {
  const shared = cn("col-start-1 row-start-1", props.className)

  return (
    <div className="grid max-h-40 min-w-0 flex-1 overflow-y-auto">
      <textarea
        id="nd-ai-input"
        rows={1}
        {...props}
        className={cn(
          "placeholder:text-fd-muted-foreground resize-none overflow-hidden bg-transparent [overflow-wrap:anywhere] focus-visible:outline-none",
          shared
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          shared,
          "invisible [overflow-wrap:anywhere] whitespace-pre-wrap"
        )}
      >
        {`${props.value?.toString() ?? ""}\n`}
      </div>
    </div>
  )
}

function Shimmer({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <span className={cn("ai-shimmer", className)}>{children}</span>
}

const pixelDelays = [90, 180, 270, 0, 90, 180, 90, 180, 270]

function Loader({ label }: { label: string }) {
  const [start] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed(performance.now() - start), 100)
    return () => clearInterval(id)
  }, [start])

  return (
    <div role="status" className="flex w-fit items-center gap-2.5 py-1">
      <span
        aria-hidden="true"
        className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]"
      >
        {pixelDelays.map((delay, i) => (
          <span
            key={i}
            className="ai-pixel bg-fd-foreground size-1 rounded-[1px]"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <Shimmer className="text-[13px] font-medium">{label}</Shimmer>
      <span className="text-fd-muted-foreground font-mono text-xs tabular-nums">
        {(elapsed / 1000).toFixed(1)}s
      </span>
    </div>
  )
}

function Collapsible({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <HugeiconsIcon
      icon={ArrowDown01Icon}
      aria-hidden="true"
      className={cn(
        "text-fd-muted-foreground size-3.5 transition-transform duration-300",
        open && "rotate-180"
      )}
      strokeWidth={2.2}
    />
  )
}

function pluralize(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

interface Source {
  url: string
  title: string
}

function getSources(output: unknown): Source[] {
  if (!Array.isArray(output)) return []

  return output.flatMap((item: { doc?: Partial<Source> } | null) => {
    const doc = item?.doc
    if (!doc || typeof doc.url !== "string") return []
    return [{ url: doc.url, title: doc.title ?? doc.url }]
  })
}

function SearchTrace({
  calls,
  running,
}: {
  calls: UIToolInvocation<SearchTool>[]
  running: boolean
}) {
  const [open, setOpen] = useState(false)
  const count = calls.length

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        className="hover:bg-fd-accent -mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-100"
        onClick={() => setOpen(!open)}
      >
        <HugeiconsIcon
          icon={Search01Icon}
          aria-hidden="true"
          className="text-fd-muted-foreground size-3.5"
          strokeWidth={2}
        />
        {running ? (
          <span role="status">
            <Shimmer className="text-[13px] font-medium">
              Searching the docs
            </Shimmer>
          </span>
        ) : (
          <span className="text-fd-muted-foreground text-[13px]">
            <span className="text-fd-foreground font-medium">
              Searched the docs
            </span>{" "}
            · {pluralize(count, "query", "queries")}
          </span>
        )}
        <Chevron open={open} />
      </button>

      <Collapsible open={open}>
        <div className="relative ms-[7px] mt-1 ps-4">
          <span
            aria-hidden="true"
            className="bg-fd-border absolute inset-y-1 start-0 w-px"
          />
          <ul className="flex flex-col gap-1 py-0.5">
            {calls.map((call) => {
              const failed =
                call.state === "output-error" || call.state === "output-denied"
              const done = call.state === "output-available"

              return (
                <li
                  key={call.toolCallId}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-fd-muted-foreground min-w-0 truncate">
                    {call.input?.query ? `“${call.input.query}”` : "Searching…"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[11px] tabular-nums",
                      failed ? "text-fd-error" : "text-fd-muted-foreground"
                    )}
                  >
                    {failed
                      ? "failed"
                      : done
                        ? pluralize(getSources(call.output).length, "result")
                        : "…"}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </Collapsible>
    </div>
  )
}

function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)
  const { setOpen: setPanelOpen } = useAISearchContext()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        className="hover:bg-fd-accent ms-1 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors duration-150"
        onClick={() => setOpen(!open)}
      >
        <HugeiconsIcon
          icon={File02Icon}
          aria-hidden="true"
          className="text-fd-muted-foreground size-3.5"
        />
        <span className="text-fd-muted-foreground text-xs tabular-nums">
          {pluralize(sources.length, "source")}
        </span>
        <Chevron open={open} />
      </button>

      <div className="basis-full">
        <Collapsible open={open}>
          <ul className="bg-fd-card mt-1.5 flex flex-col rounded-xl border p-1">
            {sources.map((source) => (
              <li key={source.url}>
                <Link
                  href={source.url}
                  className="group/source text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors duration-150"
                  onClick={() => {
                    if (!window.matchMedia("(min-width: 64rem)").matches)
                      setPanelOpen(false)
                  }}
                >
                  <HugeiconsIcon
                    icon={File02Icon}
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                  <span className="text-fd-foreground truncate font-medium">
                    {source.title}
                  </span>
                  <span className="ms-auto truncate ps-2 font-mono text-[10.5px]">
                    {source.url}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>
    </>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <IconButton
      label={copied ? "Copied" : "Copy answer"}
      icon={copied ? Tick02Icon : Copy01Icon}
      className="size-6 rounded-md"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true))
      }}
    />
  )
}

function UserMessage({ message }: { message: ChatUIMessage }) {
  const text = message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")

  return (
    <div className={cn("flex justify-end ps-10", fadeUp)}>
      <p className="bg-fd-secondary text-fd-foreground rounded-2xl rounded-ee-md border px-3.5 py-2 text-[13.5px] leading-[1.45] break-words whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}

function AssistantMessage({
  message,
  isLast,
  busy,
}: {
  message: ChatUIMessage
  isLast: boolean
  busy: boolean
}) {
  const { regenerate } = useChatContext()
  let markdown = ""
  const searchCalls: UIToolInvocation<SearchTool>[] = []

  for (const part of message.parts ?? []) {
    if (part.type === "text") {
      markdown += `${markdown ? "\n\n" : ""}${part.text}`
      continue
    }

    if (part.type.startsWith("tool-")) {
      const toolName = part.type.slice("tool-".length)
      const p = part as UIToolInvocation<Tool>

      if (toolName !== "search" || !p.toolCallId) continue
      searchCalls.push(p)
    }
  }

  const sources = [
    ...new Map(
      [
        ...searchCalls.flatMap((call) => getSources(call.output)),
        ...Array.from(
          markdown.matchAll(/\[([^\]]+)\]\((\/docs(?:[/#][^\s)]*)?)\)/g),
          ([, title, url]) => ({ title: title!.replace(/`/g, ""), url: url! })
        ),
      ].map((source) => [source.url, source])
    ).values(),
  ].slice(0, 6)
  const searching =
    busy &&
    (markdown.length === 0 ||
      searchCalls.some(
        (call) =>
          call.state === "input-streaming" || call.state === "input-available"
      ))

  return (
    <div className={cn("flex flex-col gap-2", fadeUp)}>
      {searchCalls.length > 0 && (
        <SearchTrace calls={searchCalls} running={searching} />
      )}

      {markdown.length > 0 ? (
        <div className="ai-chat-prose prose">
          <Markdown text={markdown} />
        </div>
      ) : (
        busy && searchCalls.length === 0 && <Loader label="Thinking" />
      )}

      {!busy && markdown.length > 0 && (
        <div
          className={cn(
            "-ms-1 flex flex-wrap items-center gap-0.5",
            "motion-safe:animate-[ai-fade-up_300ms_ease-out_both]"
          )}
        >
          <CopyButton text={markdown} />
          {isLast && (
            <IconButton
              label="Regenerate"
              icon={Refresh01Icon}
              className="size-6 rounded-md"
              onClick={() => void regenerate()}
            />
          )}
          {sources.length > 0 && <SourceList sources={sources} />}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const send = useSendMessage()

  return (
    <div className={cn("mt-auto flex flex-col gap-6 pt-6", fadeUp)}>
      <div className="flex flex-col gap-1.5">
        <span className="bg-fd-popover shadow-elevation-1 mb-2 flex size-9 items-center justify-center rounded-xl border">
          <HugeiconsIcon
            icon={AiArtIcon}
            aria-hidden="true"
            className="size-[18px]"
          />
        </span>
        <p className="text-[15px] font-medium">Ask anything about emend</p>
        <p className="text-fd-muted-foreground text-[13px] leading-relaxed text-pretty">
          Answers are grounded in these docs and link to the pages they come
          from.
        </p>
      </div>

      <div>
        <p className="text-fd-muted-foreground mb-1 text-xs font-medium">
          Try asking
        </p>
        <ul className="flex flex-col">
          {suggestions.map((suggestion) => (
            <li key={suggestion} className="border-b last:border-0">
              <button
                type="button"
                className="hover:bg-fd-accent -mx-1.5 flex w-[calc(100%+--spacing(3))] items-center gap-2 rounded-lg px-1.5 py-2 text-start text-[13px] transition-colors duration-100"
                onClick={() => void send(suggestion)}
              >
                <HugeiconsIcon
                  icon={CornerDownRightIcon}
                  aria-hidden="true"
                  className="text-fd-muted-foreground size-3.5 shrink-0"
                />
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ErrorNotice({ error }: { error: Error }) {
  const { regenerate, clearError } = useChatContext()

  return (
    <div
      role="alert"
      className={cn(
        "border-fd-error/25 bg-fd-error/5 flex items-start gap-2.5 rounded-xl border p-3",
        fadeUp
      )}
    >
      <HugeiconsIcon
        icon={AlertCircleIcon}
        aria-hidden="true"
        className="text-fd-error mt-px size-4 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[13px] font-medium">Couldn’t get an answer</p>
        <p className="text-fd-muted-foreground text-xs break-words">
          {error.message || "The request failed. Try again in a moment."}
        </p>
        <button
          type="button"
          className="bg-fd-popover hover:bg-fd-accent shadow-elevation-1 mt-1.5 flex w-fit items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors duration-150"
          onClick={() => {
            clearError()
            void regenerate()
          }}
        >
          <HugeiconsIcon
            icon={Refresh01Icon}
            aria-hidden="true"
            className="size-3.5"
          />
          Try again
        </button>
      </div>
    </div>
  )
}

export function AISearch({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const chat = useChat<ChatUIMessage>({
    id: "search",
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  return (
    <Context value={useMemo(() => ({ chat, open, setOpen }), [chat, open])}>
      {children}
    </Context>
  )
}

export function AISearchTrigger({
  position = "default",
  className,
  ...props
}: ComponentProps<"button"> & { position?: "default" | "float" }) {
  const { open, setOpen } = useAISearchContext()

  return (
    <button
      data-state={open ? "open" : "closed"}
      className={cn(
        position === "float" && [
          "inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] fixed bottom-4 z-20 transition-[translate,opacity]",
          open && "pointer-events-none translate-y-10 opacity-0",
        ],
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {props.children}
    </button>
  )
}

export function AISearchPanel() {
  const { open, setOpen } = useAISearchContext()
  const [actualOpen, setActualOpen] = useState(open)
  useHotKey()

  if (open && !actualOpen) setActualOpen(open)

  return (
    <>
      <style>
        {`
        @keyframes ask-ai-open {
          from {
            translate: 100% 0;
          }
          to {
            translate: 0 0;
          }
        }
        @keyframes ask-ai-close {
          from {
            width: var(--ai-chat-width);
          }
          to {
            width: 0px;
          }
        }`}
      </style>
      {actualOpen && (
        <div
          className={cn(
            "bg-fd-overlay fixed inset-0 z-30 backdrop-blur-xs lg:hidden",
            open ? "animate-fd-fade-in" : "animate-fd-fade-out"
          )}
          onClick={() => setOpen(false)}
          onAnimationEnd={() => {
            if (!open) flushSync(() => setActualOpen(false))
          }}
        />
      )}
      {actualOpen && (
        <div
          role="dialog"
          aria-label="Ask AI"
          className={cn(
            "bg-fd-background text-fd-foreground z-30 overflow-hidden [--ai-chat-width:400px] 2xl:[--ai-chat-width:440px]",
            "max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:rounded-2xl max-lg:border max-lg:shadow-xl",
            "lg:shadow-elevation-3 lg:fixed lg:inset-y-0 lg:end-0 lg:h-dvh lg:border-s",
            open
              ? "animate-fd-dialog-in lg:animate-[ask-ai-open_200ms]"
              : "animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]"
          )}
          onAnimationEnd={() => {
            if (!open) flushSync(() => setActualOpen(false))
          }}
        >
          <div className="flex size-full flex-col lg:w-(--ai-chat-width)">
            <AISearchPanelHeader />
            <AISearchPanelList className="flex-1" />
            <div className="shrink-0 px-3 pb-3">
              <AISearchInput />
              <p className="text-fd-muted-foreground mt-2 text-center text-[11px]">
                AI can make mistakes. Check important answers.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function AISearchPanelList({
  className,
  style,
  ...props
}: ComponentProps<"div">) {
  const chat = useChatContext()
  const messages = chat.messages.filter((msg) => msg.role !== "system")
  const isLoading = chat.status === "streaming" || chat.status === "submitted"
  const last = messages.at(-1)
  const userMessageCount = messages.filter((msg) => msg.role === "user").length

  return (
    <List
      scrollKey={userMessageCount}
      className={cn("overscroll-contain", className)}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, white 0.75rem, white calc(100% - 1rem), transparent 100%)",
        ...style,
      }}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((item) =>
              item.role === "user" ? (
                <UserMessage key={item.id} message={item} />
              ) : (
                <AssistantMessage
                  key={item.id}
                  message={item}
                  isLast={item === last}
                  busy={isLoading && item === last}
                />
              )
            )}
            {isLoading && last?.role === "user" && <Loader label="Thinking" />}
            {chat.error && <ErrorNotice error={chat.error} />}
          </>
        )}
      </div>
    </List>
  )
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext()

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false)
      e.preventDefault()
    }

    if (e.key === "/" && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true)
      e.preventDefault()
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", onKeyPress)
    return () => window.removeEventListener("keydown", onKeyPress)
  }, [])
}

export function useAISearchContext() {
  return use(Context)!
}

function useChatContext() {
  return use(Context)!.chat
}
