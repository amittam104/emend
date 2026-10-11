import type { Extensions } from "@tiptap/core"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"

export function createEmendEditorExtensions(
  placeholder = "Start writing…"
): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false, enableClickSelection: true },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit,
    Image.configure({ allowBase64: true }),
    TextStyleKit.configure({
      fontFamily: false,
      fontSize: false,
      lineHeight: false,
    }),
    Markdown.configure({ markedOptions: { gfm: true } }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ]
}
