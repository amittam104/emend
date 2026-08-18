import type { Editor, JSONContent } from "@tiptap/core"
import {
  Fragment,
  type Mark,
  type Node as ProseMirrorNode,
  type NodeType,
  Slice,
} from "@tiptap/pm/model"
import type { EmendCapturedTarget } from "./types.js"

export function createSupportedTiptapSlice(
  editor: Editor,
  target: EmendCapturedTarget,
  json: JSONContent
): Slice | null {
  const document = parseDocument(editor, json)
  if (!document) return null
  if (
    hasTable(document) &&
    (target.placement !== "block" ||
      target.slice.openStart !== 0 ||
      target.slice.openEnd !== 0)
  ) {
    return null
  }

  const paragraph = getNeutralParagraph(document)

  if (target.placement === "inline") {
    if (!paragraph) return null

    const parent = getInlineParent(editor, target)
    if (!parent) return null

    const content = addSourceMarks(paragraph.content, target.sourceMarks)
    return parent.type.validContent(content) ? new Slice(content, 0, 0) : null
  }

  if (
    target.mutationOperation === "replace-current-block" &&
    target.sourceNode?.isTextblock &&
    paragraph
  ) {
    const block = createTextBlock(
      target.sourceNode.type,
      target.sourceNode.attrs,
      target.sourceNode.marks,
      paragraph.content
    )
    if (block) return new Slice(Fragment.from(block), 0, 0)
  }

  return createBlockSlice(document.content, target)
}

export function createPlainTextTiptapSlice(
  editor: Editor,
  target: EmendCapturedTarget,
  text: string
): Slice | null {
  if (target.placement === "inline") {
    const parent = getInlineParent(editor, target)
    if (!parent) return null

    const content = createTextContent(
      editor,
      parent.type,
      text,
      target.sourceMarks
    )
    return content ? new Slice(content, 0, 0) : null
  }

  const sourceNode =
    target.mutationOperation === "replace-current-block" &&
    target.sourceNode?.isTextblock
      ? target.sourceNode
      : null
  const blockType = sourceNode?.type ?? editor.schema.nodes.paragraph
  if (!blockType?.isTextblock) return null

  const content = createTextContent(editor, blockType, text, [])
  if (!content) return null

  const block = createTextBlock(
    blockType,
    sourceNode?.attrs ?? null,
    sourceNode?.marks ?? [],
    content
  )
  return block ? createBlockSlice(Fragment.from(block), target) : null
}

export function canReplaceTiptapRange(
  editor: Editor,
  target: EmendCapturedTarget,
  slice: Slice
): boolean {
  try {
    const transaction = editor.state.tr.replace(
      target.range.from,
      target.range.to,
      slice
    )
    transaction.doc.check()

    if (transaction.steps.length !== 1) return false

    let exactRange = false
    transaction.mapping.maps[0]?.forEach((oldStart, oldEnd) => {
      if (oldStart === target.range.from && oldEnd === target.range.to) {
        exactRange = true
      }
    })
    return exactRange
  } catch {
    return false
  }
}

function parseDocument(
  editor: Editor,
  json: JSONContent
): ProseMirrorNode | null {
  try {
    const document = editor.schema.nodeFromJSON(json)
    document.check()
    return document.type === editor.schema.topNodeType ? document : null
  } catch {
    return null
  }
}

function getNeutralParagraph(
  document: ProseMirrorNode
): ProseMirrorNode | null {
  if (document.childCount !== 1) return null

  const paragraph = document.firstChild
  return paragraph?.type.name === "paragraph" &&
    paragraph.hasMarkup(paragraph.type)
    ? paragraph
    : null
}

function hasTable(document: ProseMirrorNode): boolean {
  let found = false
  document.descendants((node) => {
    if (node.type.name === "table") found = true
    return !found
  })
  return found
}

function getInlineParent(
  editor: Editor,
  target: EmendCapturedTarget
): ProseMirrorNode | null {
  try {
    const from = editor.state.doc.resolve(target.range.from)
    const to = editor.state.doc.resolve(target.range.to)
    return from.sameParent(to) &&
      from.parent.isTextblock &&
      from.parent.type.name === target.parentNodeType
      ? from.parent
      : null
  } catch {
    return null
  }
}

function addSourceMarks(
  content: Fragment,
  sourceMarks: readonly Mark[]
): Fragment {
  if (sourceMarks.length === 0) return content

  const children: ProseMirrorNode[] = []
  content.forEach((node) => {
    children.push(
      node.isText ? node.mark(mergeMarks(node.marks, sourceMarks)) : node
    )
  })
  return Fragment.fromArray(children)
}

function mergeMarks(
  proposalMarks: readonly Mark[],
  sourceMarks: readonly Mark[]
): readonly Mark[] {
  let merged = proposalMarks

  for (const sourceMark of sourceMarks) {
    if (merged.some((mark) => mark.type === sourceMark.type)) continue

    const next = sourceMark.addToSet(merged)
    if (merged.every((mark) => next.some((candidate) => candidate.eq(mark)))) {
      merged = next
    }
  }

  return merged
}

function createTextContent(
  editor: Editor,
  parentType: NodeType,
  text: string,
  marks: readonly Mark[]
): Fragment | null {
  try {
    let content: Fragment

    if (!text.includes("\n") || parentType.whitespace === "pre") {
      content = text
        ? Fragment.from(editor.schema.text(text, marks))
        : Fragment.empty
    } else {
      const hardBreak = editor.schema.linebreakReplacement
      if (hardBreak?.name !== "hardBreak") return null

      const nodes: ProseMirrorNode[] = []
      const lines = text.split("\n")
      lines.forEach((line, index) => {
        if (line) nodes.push(editor.schema.text(line, marks))
        if (index < lines.length - 1) nodes.push(hardBreak.create())
      })
      content = Fragment.fromArray(nodes)
    }

    return parentType.validContent(content) ? content : null
  } catch {
    return null
  }
}

function createTextBlock(
  type: NodeType,
  attributes: Readonly<Record<string, unknown>> | null,
  marks: readonly Mark[],
  content: Fragment
): ProseMirrorNode | null {
  try {
    const block = type.createChecked(attributes, content, marks)
    block.check()
    return block
  } catch {
    return null
  }
}

function createBlockSlice(
  content: Fragment,
  target: EmendCapturedTarget
): Slice | null {
  const maximum = Slice.maxOpen(content)
  const { openStart, openEnd } = target.slice

  return openStart <= maximum.openStart && openEnd <= maximum.openEnd
    ? new Slice(content, openStart, openEnd)
    : null
}
