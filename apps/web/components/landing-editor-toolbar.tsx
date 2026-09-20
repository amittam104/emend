"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import {
  AiChat02Icon,
  ALargeSmallIcon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AtIcon,
  CheckListIcon,
  CodeSimpleIcon,
  Delete02Icon,
  DeleteColumnIcon,
  DeleteRowIcon,
  GridTableIcon,
  HeadingIcon,
  HighlighterIcon,
  Image02Icon,
  InsertColumnRightIcon,
  InsertRowDownIcon,
  LeftToRightBlockQuoteIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  MagicWand01Icon,
  PaintBucketIcon,
  RedoIcon,
  SeparatorHorizontalIcon,
  SourceCodeIcon,
  TableRowsSplitIcon,
  TextBoldIcon,
  TextClearIcon,
  TextColorIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  UndoIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { useRef, type ReactNode } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { LandingFindReplace } from "./landing-find-replace"

const headingLevels = [1, 2, 3, 4, 5, 6] as const
const fontSizeOptions = ["12", "14", "16", "18", "24", "32"] as const
const highlightColor = "color-mix(in oklch, var(--chart-1) 45%, transparent)"
const toolbarSeparatorClasses = "h-3! self-center!"

const landingEditorControlClasses =
  "transition-[background-color,color,scale] duration-100 active:not-aria-[haspopup]:translate-y-0 motion-safe:active:not-aria-[haspopup]:scale-96"

export function LandingEditorToolbar({
  editor,
  actions,
  sideChatOpen,
  composerOpen,
  onToggleSideChat,
  onToggleComposer,
}: {
  readonly editor: Editor
  readonly actions?: ReactNode
  readonly sideChatOpen: boolean
  readonly composerOpen: boolean
  readonly onToggleSideChat: () => void
  readonly onToggleComposer: () => void
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const heading = headingLevels.find((level) =>
        currentEditor.isActive("heading", { level })
      )
      const cell = currentEditor.isActive("tableHeader")
        ? "tableHeader"
        : "tableCell"

      return {
        block: heading ? `heading-${heading}` : "paragraph",
        fontSize: currentEditor.getAttributes("textStyle").fontSize ?? null,
        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        underline: currentEditor.isActive("underline"),
        strike: currentEditor.isActive("strike"),
        code: currentEditor.isActive("code"),
        highlight: Boolean(
          currentEditor.getAttributes("textStyle").backgroundColor
        ),
        textColor: Boolean(currentEditor.getAttributes("textStyle").color),
        link: currentEditor.isActive("link"),
        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        taskList: currentEditor.isActive("taskList"),
        blockquote: currentEditor.isActive("blockquote"),
        codeBlock: currentEditor.isActive("codeBlock"),
        inTable: currentEditor.isActive("table"),
        headerRow: currentEditor.isActive("tableHeader"),
        cellAlign: currentEditor.getAttributes(cell).align ?? "left",
        canUndo: currentEditor.can().undo(),
        canRedo: currentEditor.can().redo(),
      }
    },
  })
  const blockLabel =
    state.block === "paragraph"
      ? "Paragraph"
      : `Heading ${state.block.slice(-1)}`
  const blockShortLabel =
    state.block === "paragraph" ? "Text" : `H${state.block.slice(-1)}`
  const parsedFontSize = state.fontSize
    ? String(Number.parseInt(state.fontSize, 10))
    : null
  const fontSize =
    parsedFontSize && fontSizeOptions.some((size) => size === parsedFontSize)
      ? parsedFontSize
      : "auto"

  function setBlock(value: string | null) {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run()
      return
    }

    const level = headingLevels.find((level) => value === `heading-${level}`)
    if (level) editor.chain().focus().setHeading({ level }).run()
  }

  function setFontSize(value: string | null) {
    if (!value || value === "auto") {
      editor.chain().focus().unsetFontSize().run()
      return
    }

    editor.chain().focus().setFontSize(`${value}px`).run()
  }

  const historyControls = [
    {
      label: "Undo",
      icon: UndoIcon,
      disabled: !state.canUndo,
      onClick: () => editor.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: RedoIcon,
      disabled: !state.canRedo,
      onClick: () => editor.chain().focus().redo().run(),
    },
  ]
  const inlineControls = [
    {
      label: "Bold",
      icon: TextBoldIcon,
      active: state.bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: TextItalicIcon,
      active: state.italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: TextUnderlineIcon,
      active: state.underline,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: TextStrikethroughIcon,
      active: state.strike,
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Inline code",
      icon: CodeSimpleIcon,
      active: state.code,
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: "Link",
      icon: Link01Icon,
      active: state.link,
      onClick: () => updateLink(editor),
    },
  ]
  const colorControls = [
    {
      label: "Highlight",
      icon: HighlighterIcon,
      active: state.highlight,
      onClick: () => {
        const chain = editor.chain().focus()
        if (state.highlight) chain.unsetBackgroundColor().run()
        else chain.setBackgroundColor(highlightColor).run()
      },
    },
    {
      label: "Clear formatting",
      icon: TextClearIcon,
      onClick: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    },
  ]
  const blockControls = [
    {
      label: "Bullet list",
      icon: LeftToRightListBulletIcon,
      active: state.bulletList,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: LeftToRightListNumberIcon,
      active: state.orderedList,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Task list",
      icon: CheckListIcon,
      active: state.taskList,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Blockquote",
      icon: LeftToRightBlockQuoteIcon,
      active: state.blockquote,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: SourceCodeIcon,
      active: state.codeBlock,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ]
  const insertControls = state.inTable
    ? [
        {
          label: "Add row below",
          icon: InsertRowDownIcon,
          onClick: () => editor.chain().focus().addRowAfter().run(),
        },
        {
          label: "Delete row",
          icon: DeleteRowIcon,
          onClick: () => editor.chain().focus().deleteRow().run(),
        },
        {
          label: "Add column right",
          icon: InsertColumnRightIcon,
          onClick: () => editor.chain().focus().addColumnAfter().run(),
        },
        {
          label: "Delete column",
          icon: DeleteColumnIcon,
          onClick: () => editor.chain().focus().deleteColumn().run(),
        },
        {
          label: "Toggle header row",
          icon: TableRowsSplitIcon,
          active: state.headerRow,
          onClick: () => editor.chain().focus().toggleHeaderRow().run(),
        },
        {
          label: "Align left",
          icon: AlignLeftIcon,
          active: state.cellAlign === "left",
          onClick: () =>
            editor.chain().focus().setCellAttribute("align", "left").run(),
        },
        {
          label: "Align center",
          icon: AlignHorizontalCenterIcon,
          active: state.cellAlign === "center",
          onClick: () =>
            editor.chain().focus().setCellAttribute("align", "center").run(),
        },
        {
          label: "Align right",
          icon: AlignRightIcon,
          active: state.cellAlign === "right",
          onClick: () =>
            editor.chain().focus().setCellAttribute("align", "right").run(),
        },
        {
          label: "Delete table",
          icon: Delete02Icon,
          onClick: () => editor.chain().focus().deleteTable().run(),
        },
      ]
    : [
        {
          label: "Horizontal rule",
          icon: SeparatorHorizontalIcon,
          onClick: () => editor.chain().focus().setHorizontalRule().run(),
        },
        {
          label: "Insert table",
          icon: GridTableIcon,
          onClick: () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
        },
        {
          label: "Insert image",
          icon: Image02Icon,
          onClick: () => insertImage(editor),
        },
        {
          label: "Mention a component",
          icon: AtIcon,
          onClick: () => editor.chain().focus().insertContent("@").run(),
        },
      ]

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-10 items-center border-b border-border bg-secondary px-1.5"
      role="toolbar"
      aria-label="Editor formatting"
    >
      <Link
        href="/"
        className="mx-2 flex shrink-0 items-center gap-1.5 rounded-md pr-1.5 text-sm font-bold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Emend home"
      >
        <Image src="/emend-logo.svg" alt="" width={18} height={18} priority />
        <span className="max-sm:sr-only">emend</span>
      </Link>

      <Separator orientation="vertical" className={toolbarSeparatorClasses} />

      <div className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ControlGroup label="History" controls={historyControls} />
        <Separator orientation="vertical" className={toolbarSeparatorClasses} />

        <div
          className="mx-2 flex shrink-0 items-center gap-1 px-0.5"
          role="group"
          aria-label="Text style"
        >
          <Select value={state.block} onValueChange={setBlock}>
            <SelectTrigger
              size="sm"
              className="h-6! w-[88px] border-border bg-background px-2! text-xs font-medium shadow-none hover:bg-muted dark:bg-input/30 [&_svg]:size-3!"
              aria-label={`Block type: ${blockLabel}`}
            >
              <HugeiconsIcon icon={HeadingIcon} className="size-3!" />
              <SelectValue>{blockShortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                {headingLevels.map((level) => (
                  <SelectItem key={level} value={`heading-${level}`}>
                    Heading {level}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger
              size="sm"
              className="h-6! w-[80px] border-border bg-background px-2! text-xs font-medium shadow-none hover:bg-muted dark:bg-input/30 [&_svg]:size-3!"
              aria-label={
                fontSize === "auto"
                  ? "Font size: Automatic"
                  : `Font size: ${fontSize} pixels`
              }
            >
              <HugeiconsIcon icon={ALargeSmallIcon} className="size-3!" />
              <SelectValue>
                {fontSize === "auto" ? "Auto" : fontSize}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value="auto">Auto</SelectItem>
                {fontSizeOptions.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} px
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className={toolbarSeparatorClasses} />
        <ControlGroup label="Inline formatting" controls={inlineControls} />
        <ControlGroup label="Colors and cleanup" controls={colorControls}>
          <ColorControl editor={editor} active={state.textColor} type="text" />
          <ColorControl
            editor={editor}
            active={state.highlight}
            type="background"
          />
        </ControlGroup>
        <Separator orientation="vertical" className={toolbarSeparatorClasses} />
        <ControlGroup
          label="Lists and blocks"
          controls={blockControls}
          className="mx-2"
        />
        <Separator orientation="vertical" className={toolbarSeparatorClasses} />
        <ControlGroup
          label={state.inTable ? "Table" : "Insert"}
          controls={insertControls}
        />
        <Separator orientation="vertical" className={toolbarSeparatorClasses} />
        <div className="mx-2 flex shrink-0 items-center px-0.5">
          <LandingFindReplace editor={editor} />
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 px-0.5"
          role="group"
          aria-label="AI surfaces"
        >
          <ToolbarToggle
            label="AI Side Chat"
            icon={AiChat02Icon}
            pressed={sideChatOpen}
            onClick={onToggleSideChat}
          />
          <ToolbarToggle
            label="AI Composer"
            icon={MagicWand01Icon}
            pressed={composerOpen}
            onClick={onToggleComposer}
          />
        </div>
      </div>

      {actions && (
        <div className="mr-2 ml-1 flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  )
}

interface EditorControlProps {
  readonly label: string
  readonly icon: IconSvgElement
  readonly active?: boolean
  readonly disabled?: boolean
  readonly onClick: () => void
}

function ControlGroup({
  label,
  controls,
  children,
  className,
}: {
  readonly label: string
  readonly controls: readonly EditorControlProps[]
  readonly children?: ReactNode
  readonly className?: string
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-0.5 px-0.5", className)}
      role="group"
      aria-label={label}
    >
      {children}
      {controls.map((control) => (
        <EditorControl key={control.label} {...control} />
      ))}
    </div>
  )
}

function EditorControl({
  label,
  icon,
  active,
  disabled,
  onClick,
}: EditorControlProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "outline" : "ghost"}
            size="icon-xs"
            className={cn(
              landingEditorControlClasses,
              active ? "hover:bg-muted" : "hover:bg-foreground/8"
            )}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
          >
            <HugeiconsIcon icon={icon} strokeWidth={2} />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function updateLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run()
    return
  }

  const href = promptForValue("Link URL", "https://")
  if (href) editor.chain().focus().setLink({ href }).run()
}

function insertImage(editor: Editor) {
  const src =
    promptForValue("Image URL", "/emend-logo.svg") ?? "/emend-logo.svg"
  if (src) editor.chain().focus().setImage({ src }).run()
}

/**
 * Embedded browsers reject native prompts, so a dismissed prompt and an
 * unavailable prompt both read as "no value".
 */
function promptForValue(message: string, fallback: string): string | null {
  try {
    return window.prompt(message, fallback)?.trim() ?? null
  } catch {
    return null
  }
}

function ToolbarToggle({
  label,
  icon,
  pressed,
  onClick,
}: {
  readonly label: string
  readonly icon: IconSvgElement
  readonly pressed: boolean
  readonly onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={pressed ? "outline" : "ghost"}
            size="xs"
            className={cn(
              "border-border",
              landingEditorControlClasses,
              pressed ? "hover:bg-muted" : "hover:bg-foreground/8"
            )}
            aria-label={`${pressed ? "Hide" : "Show"} ${label}`}
            aria-pressed={pressed}
            onClick={onClick}
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} />
        <span className="max-sm:hidden">{label.replace("AI ", "")}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ColorControl({
  editor,
  active,
  type,
}: {
  readonly editor: Editor
  readonly active: boolean
  readonly type: "text" | "background"
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const label = type === "text" ? "Text color" : "Background color"

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={active ? "outline" : "ghost"}
              size="icon-xs"
              className={cn(
                landingEditorControlClasses,
                active ? "hover:bg-muted" : "hover:bg-foreground/8"
              )}
              aria-label={label}
              aria-pressed={active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => inputRef.current?.click()}
            />
          }
        >
          <HugeiconsIcon
            icon={type === "text" ? TextColorIcon : PaintBucketIcon}
            strokeWidth={2}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <input
        ref={inputRef}
        type="color"
        tabIndex={-1}
        className="sr-only"
        aria-label={`Choose ${label.toLowerCase()}`}
        onChange={(event) => {
          const chain = editor.chain().focus()
          if (type === "text") chain.setColor(event.target.value).run()
          else chain.setBackgroundColor(event.target.value).run()
        }}
      />
    </>
  )
}
