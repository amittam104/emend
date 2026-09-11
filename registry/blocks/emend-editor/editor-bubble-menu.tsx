"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import {
  Link01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@hugeicons/core-free-icons"
import { EditorControl, updateLink } from "./editor-toolbar"

export function EditorBubbleMenu({ editor }: { readonly editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor.isActive("bold"),
      italic: currentEditor.isActive("italic"),
      underline: currentEditor.isActive("underline"),
      link: currentEditor.isActive("link"),
    }),
  })

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="emendEditorBubbleMenu"
      options={{ placement: "top", offset: 8, flip: true, shift: true }}
    >
      <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 shadow-lg">
        <EditorControl
          label="Bold"
          icon={TextBoldIcon}
          active={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <EditorControl
          label="Italic"
          icon={TextItalicIcon}
          active={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <EditorControl
          label="Underline"
          icon={TextUnderlineIcon}
          active={active.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <EditorControl
          label="Link"
          icon={Link01Icon}
          active={active.link}
          onClick={() => updateLink(editor)}
        />
      </div>
    </BubbleMenu>
  )
}
