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
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EditorColorControl } from "./editor-color-control"
import {
  EditorImageControl,
  type EditorImageUpload,
} from "./editor-image-control"
import { EditorLinkControl } from "./editor-link-control"
import { EditorToolbarScroller } from "./editor-toolbar-scroller"

const headingLevels = [1, 2, 3, 4, 5, 6] as const

export type EditorToolbarVariant = "compact" | "classic"

type ControlSize = "icon" | "icon-xs"

export function EditorToolbar({
  editor,
  variant = "compact",
  onSave,
  onAssistantToggle,
  onImageUpload,
  saveDisabled,
  saveStatus,
  assistantOpen,
  toolbarActions,
}: {
  readonly editor: Editor
  readonly variant?: EditorToolbarVariant
  readonly onSave?: () => Promise<void>
  readonly onAssistantToggle?: () => void
  readonly onImageUpload?: EditorImageUpload
  readonly saveDisabled: boolean
  readonly saveStatus: "idle" | "saving" | "success" | "error"
  readonly assistantOpen?: boolean
  readonly toolbarActions?: ReactNode
}) {
  const compact = variant === "compact"
  const size: ControlSize = compact ? "icon-xs" : "icon"
  const strokeWidth = compact ? 2 : undefined
  const trigger = (active: boolean) => controlTrigger(active, size)
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
        textColor: currentEditor.getAttributes("textStyle").color ?? null,
        backgroundColor:
          currentEditor.getAttributes("textStyle").backgroundColor ?? null,
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
  const controlProps = { size, strokeWidth }

  return (
    <div
      className="emend-editor__toolbar"
      data-variant={variant}
      role="toolbar"
      aria-label="Editor formatting"
    >
      <EditorToolbarScroller size={size}>
        <ControlGroup
          label="History"
          controls={historyControls}
          {...controlProps}
        />
        <Separator orientation="vertical" className="emend-editor__separator" />

        <div className="emend-editor__toolbar-section">
          <Select value={state.block} onValueChange={setBlock}>
            <SelectTrigger
              size="sm"
              className={cn(
                "emend-editor__block-type",
                compact && "h-6! px-2! text-xs [&_svg]:size-3!"
              )}
              aria-label={`Block type: ${blockLabel}`}
            >
              <HugeiconsIcon icon={HeadingIcon} strokeWidth={strokeWidth} />
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

        <ControlGroup
          label="Text formatting"
          controls={inlineControls}
          {...controlProps}
        >
          <EditorLinkControl
            editor={editor}
            trigger={trigger}
            strokeWidth={strokeWidth}
          />
          <EditorColorControl
            editor={editor}
            type="text"
            color={state.textColor}
            trigger={trigger}
            strokeWidth={strokeWidth}
          />
          <EditorColorControl
            editor={editor}
            type="background"
            color={state.backgroundColor}
            trigger={trigger}
            strokeWidth={strokeWidth}
          />
        </ControlGroup>

        <Separator orientation="vertical" className="emend-editor__separator" />

        <ControlGroup
          label="Lists and blocks"
          controls={blockControls}
          {...controlProps}
        />

        <Separator orientation="vertical" className="emend-editor__separator" />

        <ControlGroup
          label={state.inTable ? "Table" : "Insert"}
          controls={insertControls}
          {...controlProps}
        >
          {!state.inTable && (
            <EditorImageControl
              editor={editor}
              trigger={trigger}
              strokeWidth={strokeWidth}
              onUpload={onImageUpload}
            />
          )}
        </ControlGroup>
      </EditorToolbarScroller>

      {(toolbarActions || onAssistantToggle || onSave) && (
        <div className="emend-editor__toolbar-actions">
          {toolbarActions}
          {onAssistantToggle && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size={size}
                    aria-label="AI Assistant"
                    aria-expanded={assistantOpen}
                    onClick={onAssistantToggle}
                  />
                }
              >
                <HugeiconsIcon icon={AiChat02Icon} strokeWidth={strokeWidth} />
              </TooltipTrigger>
              <TooltipContent>AI Assistant</TooltipContent>
            </Tooltip>
          )}
          {onSave && (
            <Button
              type="button"
              size={compact ? "xs" : "default"}
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
  readonly size?: ControlSize
  readonly strokeWidth?: number
  readonly onClick: () => void
}

function ControlGroup({
  label,
  controls,
  children,
  size,
  strokeWidth,
}: {
  readonly label: string
  readonly controls: readonly EditorControlProps[]
  readonly children?: ReactNode
  readonly size: ControlSize
  readonly strokeWidth?: number
}) {
  return (
    <div
      className="emend-editor__toolbar-group"
      role="group"
      aria-label={label}
    >
      {controls.map((control) => (
        <EditorControl
          key={control.label}
          size={size}
          strokeWidth={strokeWidth}
          {...control}
        />
      ))}
      {children}
    </div>
  )
}

export function controlTrigger(active: boolean, size: ControlSize = "icon") {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("relative", active && "bg-muted text-foreground")}
    />
  )
}

export function EditorControl({
  label,
  icon,
  active,
  disabled,
  size = "icon",
  strokeWidth,
  onClick,
}: EditorControlProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={size}
            className={cn(active && "bg-muted text-foreground")}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
          >
            <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
