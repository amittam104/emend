"use client"

import type { Editor } from "@tiptap/core"
import { Image02Icon, Upload04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type EditorImageUpload = (file: File) => Promise<string>

const imageTypes = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]
const maxEmbeddedImageSize = 2 * 1024 * 1024

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("Image failed to load"))
    image.src = src
  })
}

function normalizeImageUrl(value: string) {
  const text = value.trim()
  if (!text || /\s/.test(text)) return null
  if (text.startsWith("/") && !text.startsWith("//")) return text

  try {
    const url = new URL(text)
    return url.protocol === "https:" || url.protocol === "http:" ? text : null
  } catch {
    return null
  }
}

function validateFile(file: File, embedded: boolean) {
  if (!imageTypes.includes(file.type)) {
    return "Choose a PNG, JPEG, GIF, WebP or AVIF image"
  }
  if (embedded && file.size > maxEmbeddedImageSize) {
    return "Choose an image smaller than 2 MB"
  }
  return null
}

export function EditorImageControl({
  editor,
  trigger,
  strokeWidth,
  onUpload,
}: {
  readonly editor: Editor
  readonly trigger: (active: boolean) => ReactElement
  readonly strokeWidth?: number
  readonly onUpload?: EditorImageUpload
}) {
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const range = useRef({ from: 0, to: 0 })
  const doc = useRef(editor.state.doc)
  const request = useRef(0)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [alt, setAlt] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeOpen(nextOpen: boolean) {
    request.current += 1
    if (nextOpen) {
      const { from, to } = editor.state.selection
      range.current = { from, to }
      doc.current = editor.state.doc
      setFile(null)
      setUrl("")
      setAlt("")
      setError(null)
    }
    setPending(false)
    setOpen(nextOpen)
  }

  async function resolveSource() {
    if (file) {
      const fileError = validateFile(file, !onUpload)
      if (fileError) throw new Error(fileError)

      const src = onUpload
        ? await onUpload(file)
        : await readFileAsDataUrl(file)
      await loadImage(src).catch(() => {
        throw new Error("This image could not be read")
      })
      return src
    }

    const src = normalizeImageUrl(url)
    if (!src) {
      throw new Error("Enter an image URL, like https://example.com/image.png")
    }
    await loadImage(src).catch(() => {
      throw new Error("No image could be loaded from this URL")
    })
    return src
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!file && !url.trim()) {
      setError("Choose an image file or enter an image URL")
      return
    }

    const current = ++request.current
    setPending(true)
    setError(null)
    try {
      const src = await resolveSource()
      if (current !== request.current) return
      if (editor.state.doc !== doc.current) {
        throw new Error(
          "The document changed while the image was loading. Close this and choose where to insert it again."
        )
      }

      editor
        .chain()
        .focus()
        .insertContentAt(range.current, {
          type: "image",
          attrs: { src, alt: alt.trim() || null },
        })
        .run()
      changeOpen(false)
    } catch (reason) {
      if (current !== request.current) return
      setPending(false)
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "The image could not be added"
      )
    }
  }

  const errorId = `${id}-error`

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={trigger(false)}
              aria-label="Insert image"
              onMouseDown={(event) => event.preventDefault()}
            />
          }
        >
          <HugeiconsIcon icon={Image02Icon} strokeWidth={strokeWidth} />
        </TooltipTrigger>
        <TooltipContent>Insert image</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        aria-label="Insert image"
        className="w-80 max-w-[calc(100vw-1rem)]"
        finalFocus={(closeType) => {
          if (closeType === "keyboard") editor.commands.focus()
          return false
        }}
      >
        <form
          className="flex flex-col gap-2"
          aria-busy={pending}
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <input
            ref={fileInput}
            type="file"
            accept={imageTypes.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null
              event.target.value = ""
              if (!nextFile) return
              setFile(nextFile)
              setUrl("")
              setError(validateFile(nextFile, !onUpload))
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-w-0 justify-start"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            <HugeiconsIcon icon={Upload04Icon} />
            <span className="truncate">
              {file ? file.name : "Choose image file"}
            </span>
          </Button>
          <p className="text-center text-xs text-muted-foreground">or</p>
          <Input
            type="url"
            inputMode="url"
            aria-label="Image URL"
            placeholder="https://example.com/image.png"
            autoComplete="off"
            spellCheck={false}
            value={url}
            disabled={pending}
            aria-invalid={Boolean(error) && !file}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setUrl(event.target.value)
              setFile(null)
              setError(null)
            }}
          />
          <Input
            aria-label="Alt text"
            placeholder="Alt text (optional)"
            value={alt}
            disabled={pending}
            onChange={(event) => setAlt(event.target.value)}
          />
          {error && (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                changeOpen(false)
                editor.commands.focus()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending
                ? onUpload && file
                  ? "Uploading…"
                  : "Loading…"
                : "Insert image"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
