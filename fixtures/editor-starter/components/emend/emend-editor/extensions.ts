import type { Extensions } from "@tiptap/core"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"

export function createEmendEditorExtensions(
  placeholder = "Start writing…"
): Extensions {
  return [
    StarterKit,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit,
    Markdown.configure({ markedOptions: { gfm: true } }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ]
}
