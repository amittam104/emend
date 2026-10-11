"use client"

import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import {
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@hugeicons/core-free-icons"
import { EditorLinkControl } from "./editor-link-control"
import { controlTrigger, EditorControl } from "./editor-toolbar"

const bubbleMenuOptions = {
  placement: "top" as const,
  offset: 8,
  flip: true,
  shift: true,
}

export function EditorBubbleMenu({ editor }: { readonly editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor.isActive("bold"),
      italic: currentEditor.isActive("italic"),
      underline: currentEditor.isActive("underline"),
    }),
  })

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="emendEditorBubbleMenu"
      options={bubbleMenuOptions}
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
        <EditorLinkControl
          editor={editor}
          trigger={(linkActive) => controlTrigger(linkActive)}
        />
      </div>
    </BubbleMenu>
  )
}
