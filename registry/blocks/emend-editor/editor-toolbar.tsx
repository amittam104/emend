"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import {
  AiChat02Icon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  CheckListIcon,
  CodeSimpleIcon,
  Delete02Icon,
  DeleteColumnIcon,
  DeleteRowIcon,
  GridTableIcon,
  HeadingIcon,
  InsertColumnRightIcon,
  InsertRowDownIcon,
  LeftToRightBlockQuoteIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link01Icon,
  MoreHorizontalIcon,
  RedoIcon,
  SeparatorHorizontalIcon,
  SourceCodeIcon,
  TableRowsSplitIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  UndoIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useState } from "react"
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

const headingLevels = [1, 2, 3, 4, 5, 6] as const

export function EditorToolbar({
  editor,
  onSave,
  onSideChatToggle,
  saveDisabled,
  saveStatus,
  sideChatOpen,
}: {
  readonly editor: Editor
  readonly onSave?: () => Promise<void>
  readonly onSideChatToggle?: () => void
  readonly saveDisabled: boolean
  readonly saveStatus: "idle" | "saving" | "success" | "error"
  readonly sideChatOpen?: boolean
}) {
  const [moreOpen, setMoreOpen] = useState(false)
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
        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        underline: currentEditor.isActive("underline"),
        strike: currentEditor.isActive("strike"),
        code: currentEditor.isActive("code"),
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
  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "success"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Save"

  function setBlock(value: string | null) {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run()
      return
    }

    const level = headingLevels.find((level) => value === `heading-${level}`)
    if (level) editor.chain().focus().setHeading({ level }).run()
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
  const commonControls = [
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
  ]
  const inlineControls = [
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
      ]

  return (
    <div
      className="emend-editor__toolbar"
      role="toolbar"
      aria-label="Editor formatting"
    >
      <ControlGroup label="History" controls={historyControls} />

      <Separator orientation="vertical" className="emend-editor__separator" />

      <div className="emend-editor__toolbar-section">
        <Select value={state.block} onValueChange={setBlock}>
          <SelectTrigger
            size="sm"
            className="emend-editor__block-type"
            aria-label={`Block type: ${blockLabel}`}
          >
            <HugeiconsIcon icon={HeadingIcon} />
            <SelectValue>{blockLabel}</SelectValue>
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
      </div>

      <Separator orientation="vertical" className="emend-editor__separator" />

      <ControlGroup label="Common formatting" controls={commonControls} />

      <div
        className="emend-editor__more"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMoreOpen(false)
            event.currentTarget
              .querySelector<HTMLElement>("[aria-expanded]")
              ?.focus()
          }
        }}
        onBlur={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setMoreOpen(false)
          }
        }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="emend-editor__more-trigger"
                aria-label="More formatting"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <TooltipContent>More formatting</TooltipContent>
        </Tooltip>

        <div className="emend-editor__more-content" data-open={moreOpen}>
          <Separator
            orientation="vertical"
            className="emend-editor__separator"
          />
          <ControlGroup label="Inline formatting" controls={inlineControls} />

          <Separator
            orientation="vertical"
            className="emend-editor__separator"
          />

          <ControlGroup label="Lists and blocks" controls={blockControls} />

          <Separator
            orientation="vertical"
            className="emend-editor__separator"
          />

          <ControlGroup
            label={state.inTable ? "Table" : "Insert"}
            controls={insertControls}
          />
        </div>
      </div>

      {(onSideChatToggle || onSave) && (
        <div className="emend-editor__toolbar-actions">
          {onSideChatToggle && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="AI Chat"
                    aria-expanded={sideChatOpen}
                    onClick={onSideChatToggle}
                  />
                }
              >
                <HugeiconsIcon icon={AiChat02Icon} />
              </TooltipTrigger>
              <TooltipContent>AI Chat</TooltipContent>
            </Tooltip>
          )}
          {onSave && (
            <Button
              type="button"
              disabled={saveDisabled}
              aria-live="polite"
              aria-busy={saveStatus === "saving"}
              onClick={() => void onSave()}
            >
              {saveLabel}
            </Button>
          )}
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
}: {
  readonly label: string
  readonly controls: readonly EditorControlProps[]
}) {
  return (
    <div
      className="emend-editor__toolbar-group"
      role="group"
      aria-label={label}
    >
      {controls.map((control) => (
        <EditorControl key={control.label} {...control} />
      ))}
    </div>
  )
}

export function EditorControl({
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
            variant="ghost"
            size="icon"
            className={cn(active && "bg-muted text-foreground")}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
          >
            <HugeiconsIcon icon={icon} />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function updateLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run()
    return
  }

  const href = window.prompt("Link URL", "https://")?.trim()
  if (href) editor.chain().focus().setLink({ href }).run()
}
