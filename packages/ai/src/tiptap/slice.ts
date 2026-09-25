import type { Editor, JSONContent } from "@tiptap/core"
import {
  Fragment,
  type Mark,
  type Node as ProseMirrorNode,
  type NodeType,
  type ResolvedPos,
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
  if (hasTable(document) && target.placement !== "block") return null

  const paragraph = getNeutralParagraph(document)

  if (target.placement === "inline") {
    const parent = getInlineParent(editor, target)
    if (!parent) return null

    // Text inside a heading is captured as that heading, so accept it back.
    const block = document.childCount === 1 ? document.firstChild : null
    const source =
      paragraph ?? (block?.hasMarkup(parent.type, parent.attrs) ? block : null)
    if (!source) return null

    const content = addSourceMarks(source.content, target.sourceMarks)
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

      // Blank lines are dropped: consecutive hard breaks do not survive the
      // Markdown round trip, so the next AI edit of this text would fail.
      const nodes: ProseMirrorNode[] = []
      const lines = text.split("\n").filter((line) => line.trim())
      lines.forEach((line, index) => {
        nodes.push(editor.schema.text(line, marks))
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

/**
 * Wraps content from a range in the fewest shared ancestors that make a valid
 * document. The wrappers are the ancestors from `depth` to the shared depth.
 */
export function wrapInDocument(
  from: ResolvedPos,
  to: number,
  content: Fragment
): { readonly document: ProseMirrorNode; readonly depth: number } | null {
  let depth = from.sharedDepth(to) + 1
  if (content.size === 0) {
    const document = from.doc.type.createAndFill()
    return document ? { document, depth } : null
  }

  for (;;) {
    try {
      const document = from.doc.type.createChecked(null, content)
      document.check()
      return { document, depth }
    } catch {
      depth -= 1
      if (depth === 0) return null
      content = Fragment.from(from.node(depth).copy(content))
    }
  }
}

function createBlockSlice(
  content: Fragment,
  target: EmendCapturedTarget
): Slice | null {
  // Capture wrapped the slice in the ancestors it needed, so the proposal
  // arrives wrapped the same way. Unwrap exactly those ancestors.
  const from = target.range.fromResolved
  const sharedDepth = from.sharedDepth(target.range.to)
  const wrapped = wrapInDocument(from, target.range.to, target.slice.content)
  let depth = wrapped?.depth ?? sharedDepth + 1
  for (; depth <= sharedDepth; depth += 1) {
    const wrapper = content.childCount === 1 ? content.firstChild : null
    if (wrapper?.type !== from.node(depth).type) break
    content = wrapper.content
  }

  // A list answered as another list type (bullets to numbers) can replace
  // whole items only; retyping part of an item's text has no sensible result.
  const { openStart, openEnd } = target.slice
  if (depth <= sharedDepth && retypes(content.firstChild, from.node(depth))) {
    return openStart || openEnd ? null : new Slice(content, 0, 0)
  }

  // A flat answer for whole list items goes back into a list item.
  const wrappers =
    content.firstChild &&
    from
      .node(sharedDepth)
      .contentMatchAt(from.index(sharedDepth))
      .findWrapping(content.firstChild.type)
  for (const type of [...(wrappers ?? [])].reverse()) {
    content = Fragment.from(type.create(null, content))
  }

  // Tables are isolating, so an open edge never merges into one. An open edge
  // that retypes a list stays closed too, or the old type would win or spread.
  const maximum = Slice.maxOpen(content, false)
  const edgeNode = ($pos: ResolvedPos) =>
    $pos.depth > sharedDepth ? $pos.node(sharedDepth + 1) : null

  return new Slice(
    content,
    retypes(content.firstChild, edgeNode(from))
      ? 0
      : Math.min(openStart, maximum.openStart),
    retypes(content.lastChild, edgeNode(target.range.toResolved))
      ? 0
      : Math.min(openEnd, maximum.openEnd)
  )
}

function retypes(
  node: ProseMirrorNode | null,
  existing: ProseMirrorNode | null
): boolean {
  return (
    !!node &&
    !!existing &&
    !node.isTextblock &&
    node.type !== existing.type &&
    node.type.compatibleContent(existing.type)
  )
}
