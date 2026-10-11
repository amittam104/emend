import type { Extensions } from "@tiptap/core"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { Markdown } from "@tiptap/markdown"
import StarterKit from "@tiptap/starter-kit"
import {
  createEditorMention,
  editorMentionItems,
  type EditorMentionItem,
} from "./editor-mention"

export function createEmendEditorExtensions(
  placeholder = "Start writing…",
  mentionItems: readonly EditorMentionItem[] = editorMentionItems
): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false, enableClickSelection: true },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit,
    Image.configure({ allowBase64: true }),
    TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
    FindAndReplace.configure({ injectCSS: false, searchDebounceMs: 0 }),
    Markdown.configure({ markedOptions: { gfm: true } }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    ...(mentionItems.length > 0 ? [createEditorMention(mentionItems)] : []),
  ]
}
