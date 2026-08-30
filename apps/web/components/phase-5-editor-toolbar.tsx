"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import { HugeiconsIcon } from "@hugeicons/react"
import CodeSimpleIcon from "@hugeicons/core-free-icons/CodeSimpleIcon"
import CornerDownLeftIcon from "@hugeicons/core-free-icons/CornerDownLeftIcon"
import LeftToRightBlockQuoteIcon from "@hugeicons/core-free-icons/LeftToRightBlockQuoteIcon"
import LeftToRightListBulletIcon from "@hugeicons/core-free-icons/LeftToRightListBulletIcon"
import LeftToRightListNumberIcon from "@hugeicons/core-free-icons/LeftToRightListNumberIcon"
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon"
import ParagraphIcon from "@hugeicons/core-free-icons/ParagraphIcon"
import RedoIcon from "@hugeicons/core-free-icons/RedoIcon"
import SeparatorHorizontalIcon from "@hugeicons/core-free-icons/SeparatorHorizontalIcon"
import SourceCodeIcon from "@hugeicons/core-free-icons/SourceCodeIcon"
import TextBoldIcon from "@hugeicons/core-free-icons/TextBoldIcon"
import TextItalicIcon from "@hugeicons/core-free-icons/TextItalicIcon"
import TextStrikethroughIcon from "@hugeicons/core-free-icons/TextStrikethroughIcon"
import TextUnderlineIcon from "@hugeicons/core-free-icons/TextUnderlineIcon"
import UndoIcon from "@hugeicons/core-free-icons/UndoIcon"
import type { ReactNode } from "react"

const headingLevels = [1, 2, 3, 4, 5, 6] as const

export function Phase5EditorToolbar({ editor }: { readonly editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      paragraph: currentEditor.isActive("paragraph"),
      headings: headingLevels.map((level) =>
        currentEditor.isActive("heading", { level })
      ),
      bold: currentEditor.isActive("bold"),
      italic: currentEditor.isActive("italic"),
      underline: currentEditor.isActive("underline"),
      strike: currentEditor.isActive("strike"),
      code: currentEditor.isActive("code"),
      link: currentEditor.isActive("link"),
      bulletList: currentEditor.isActive("bulletList"),
      orderedList: currentEditor.isActive("orderedList"),
      blockquote: currentEditor.isActive("blockquote"),
      codeBlock: currentEditor.isActive("codeBlock"),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    }),
  })

  function toggleLink() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run()
      return
    }

    const href = window.prompt("Link URL", "https://")?.trim()
    if (href) editor.chain().focus().setLink({ href }).run()
  }

  return (
    <div
      role="toolbar"
      aria-label="Editor formatting"
      className="flex w-full flex-nowrap items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 p-1"
    >
      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <HugeiconsIcon icon={UndoIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <HugeiconsIcon icon={RedoIcon} size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Paragraph"
        active={state.paragraph}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <HugeiconsIcon icon={ParagraphIcon} size={16} />
      </ToolbarButton>
      {headingLevels.map((level, index) => (
        <ToolbarButton
          key={level}
          label={`Heading ${level}`}
          active={state.headings[index]}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        >
          H{level}
        </ToolbarButton>
      ))}

      <ToolbarDivider />

      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <HugeiconsIcon icon={TextBoldIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <HugeiconsIcon icon={TextItalicIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <HugeiconsIcon icon={TextUnderlineIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <HugeiconsIcon icon={TextStrikethroughIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <HugeiconsIcon icon={CodeSimpleIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={toggleLink}>
        <HugeiconsIcon icon={Link01Icon} size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <HugeiconsIcon icon={LeftToRightListBulletIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <HugeiconsIcon icon={LeftToRightListNumberIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <HugeiconsIcon icon={LeftToRightBlockQuoteIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <HugeiconsIcon icon={SourceCodeIcon} size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <HugeiconsIcon icon={SeparatorHorizontalIcon} size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Hard break"
        onClick={() => editor.chain().focus().setHardBreak().run()}
      >
        <HugeiconsIcon icon={CornerDownLeftIcon} size={16} />
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  readonly label: string
  readonly active?: boolean
  readonly disabled?: boolean
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
        active ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
}
