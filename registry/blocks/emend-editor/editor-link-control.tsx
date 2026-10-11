"use client"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import {
  getMarkRange,
  posToDOMRect,
  type Editor,
  type EditorEvents,
} from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import {
  Link01Icon,
  LinkSquare02Icon,
  Unlink02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LinkDraft {
  readonly from: number
  readonly to: number
  readonly selection: { readonly from: number; readonly to: number }
  readonly existing: boolean
  readonly doc: Editor["state"]["doc"]
}

function normalizeLinkUrl(value: string) {
  const text = value.trim()
  if (!text || /\s/.test(text)) return null
  if (/^[/#]/.test(text)) return text

  const href = /^(https?:\/\/|mailto:|tel:)/i.test(text)
    ? text
    : `https://${text}`
  try {
    const url = new URL(href)
    if (url.protocol === "mailto:" || url.protocol === "tel:") {
      return url.pathname ? href : null
    }
    return url.hostname.includes(".") || url.hostname === "localhost"
      ? href
      : null
  } catch {
    return null
  }
}

export function EditorLinkControl({
  editor,
  trigger,
  strokeWidth,
}: {
  readonly editor: Editor
  readonly trigger: (active: boolean) => ReactElement
  readonly strokeWidth?: number
}) {
  const id = useId()
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isActive("link"),
  })
  const [draft, setDraft] = useState<LinkDraft | null>(null)
  const [href, setHref] = useState("")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const isOpen = Boolean(draft)

  useEffect(() => {
    if (!isOpen) return
    const closeOnDocChange = ({
      transaction,
    }: EditorEvents["transaction"]) => {
      if (transaction.docChanged) setDraft(null)
    }
    editor.on("transaction", closeOnDocChange)
    return () => {
      editor.off("transaction", closeOnDocChange)
    }
  }, [editor, isOpen])

  function isStale() {
    if (draft && editor.state.doc === draft.doc) return false
    setDraft(null)
    return true
  }

  function openDraft() {
    const { selection, schema } = editor.state
    const { from, to, empty, $from } = selection
    const linkType = schema.marks.link
    const linkRange = empty && linkType ? getMarkRange($from, linkType) : null
    const range = linkRange ?? { from, to }

    setDraft({
      ...range,
      selection: { from, to },
      existing: editor.isActive("link"),
      doc: editor.state.doc,
    })
    setHref(editor.getAttributes("link").href ?? "")
    setText("")
    setError(null)
  }

  function close() {
    setDraft(null)
    editor.commands.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || isStale()) return

    const url = normalizeLinkUrl(href)
    if (!url) {
      setError("Enter a valid URL, like https://example.com")
      return
    }

    const applied =
      draft.from === draft.to
        ? editor
            .chain()
            .focus()
            .insertContentAt(draft.from, {
              type: "text",
              text: text.trim() || url,
              marks: [{ type: "link", attrs: { href: url } }],
            })
            .run()
        : editor
            .chain()
            .focus()
            .setTextSelection({ from: draft.from, to: draft.to })
            .setLink({ href: url })
            .setTextSelection(draft.selection)
            .run()

    if (!applied) {
      setError("This link is not allowed")
      return
    }
    setDraft(null)
  }

  function removeLink() {
    if (!draft || isStale()) return
    editor
      .chain()
      .focus()
      .setTextSelection({ from: draft.from, to: draft.to })
      .unsetLink()
      .setTextSelection(draft.selection)
      .run()
    setDraft(null)
  }

  const label = active ? "Edit link" : "Add link"
  const errorId = `${id}-error`
  const validHref = draft?.existing ? normalizeLinkUrl(href) : null

  return (
    <PopoverPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (open) openDraft()
        else setDraft(null)
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverPrimitive.Trigger
              render={trigger(active)}
              aria-label={label}
              onMouseDown={(event) => event.preventDefault()}
            />
          }
        >
          <HugeiconsIcon icon={Link01Icon} strokeWidth={strokeWidth} />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={() =>
            draft
              ? {
                  getBoundingClientRect: () => {
                    const size = editor.state.doc.content.size
                    return posToDOMRect(
                      editor.view,
                      Math.min(draft.from, size),
                      Math.min(draft.to, size)
                    )
                  },
                }
              : null
          }
          side="bottom"
          align="start"
          sideOffset={8}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            aria-label={label}
            className="z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden"
            finalFocus={(closeType) => {
              if (closeType === "keyboard") editor.commands.focus()
              return false
            }}
          >
            <form className="flex flex-col gap-2" onSubmit={submit} noValidate>
              {draft && draft.from === draft.to && (
                <Input
                  aria-label="Link text"
                  placeholder="Link text (optional)"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              )}
              <Input
                type="url"
                inputMode="url"
                aria-label="Link URL"
                placeholder="https://example.com"
                autoComplete="off"
                spellCheck={false}
                value={href}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setHref(event.target.value)
                  setError(null)
                }}
              />
              {error && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="flex items-center gap-1">
                {draft?.existing && (
                  <>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remove link"
                            onClick={removeLink}
                          >
                            <HugeiconsIcon icon={Unlink02Icon} />
                          </Button>
                        }
                      />
                      <TooltipContent>Remove link</TooltipContent>
                    </Tooltip>
                    {validHref && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Open link in new tab"
                              nativeButton={false}
                              render={
                                <a
                                  href={validHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <HugeiconsIcon icon={LinkSquare02Icon} />
                            </Button>
                          }
                        />
                        <TooltipContent>Open link in new tab</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={close}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {draft?.existing ? "Save" : "Add link"}
                </Button>
              </div>
            </form>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
