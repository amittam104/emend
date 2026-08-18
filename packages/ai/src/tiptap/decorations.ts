import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { DOMSerializer } from "@tiptap/pm/model"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"
import type {
  EmendTiptapPreviewPlacement,
  EmendTiptapShowProposalOptions,
} from "./types.js"

const targetClassName = "emend-ai-target"

export function createTiptapProposalDecorations(
  doc: ProseMirrorNode,
  options: EmendTiptapShowProposalOptions
): DecorationSet {
  const decorations = createTargetDecorations(doc, options)
  const preview = createPreviewDecoration(doc, options)

  if (preview) decorations.push(preview)

  try {
    return DecorationSet.create(doc, decorations)
  } catch {
    return DecorationSet.empty
  }
}

function createTargetDecorations(
  doc: ProseMirrorNode,
  options: EmendTiptapShowProposalOptions
): Decoration[] {
  const { from, to } = options.targetRange
  const attrs = {
    class: targetClassName,
    "data-emend-proposal-id": options.proposalId,
  }

  if (from === to) {
    return [
      Decoration.widget(
        from,
        (view) => createTargetMarker(view, options.proposalId),
        {
          key: `${options.proposalId}:target`,
          ignoreSelection: true,
        }
      ),
    ]
  }

  if (from === 0 && to === doc.content.size) {
    const decorations: Decoration[] = []
    doc.forEach((node, offset) => {
      decorations.push(Decoration.node(offset, offset + node.nodeSize, attrs))
    })
    return decorations
  }

  try {
    const fromResolved = doc.resolve(from)
    const toResolved = doc.resolve(to)

    if (
      fromResolved.sameParent(toResolved) &&
      fromResolved.parent.isTextblock
    ) {
      return [Decoration.inline(from, to, attrs)]
    }

    const node = doc.nodeAt(from)
    if (node && from + node.nodeSize === to) {
      return [Decoration.node(from, to, attrs)]
    }
  } catch {
    return []
  }

  return createMultiBlockDecorations(doc, from, to, attrs)
}

function createMultiBlockDecorations(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  attrs: Readonly<Record<string, string>>
): Decoration[] {
  const decorations: Decoration[] = []

  try {
    doc.nodesBetween(from, to, (node, position) => {
      if (!node.isTextblock) return true

      const contentFrom = position + 1
      const contentTo = position + node.nodeSize - 1
      const segmentFrom = Math.max(from, contentFrom)
      const segmentTo = Math.min(to, contentTo)

      if (segmentFrom < segmentTo) {
        decorations.push(Decoration.inline(segmentFrom, segmentTo, attrs))
      }

      return true
    })
  } catch {
    return []
  }

  return decorations
}

function createPreviewDecoration(
  doc: ProseMirrorNode,
  options: EmendTiptapShowProposalOptions
): Decoration | null {
  if (!options.preview) return null

  const placement = options.previewPlacement
  if (!placement) return null

  const position = resolvePreviewPosition(
    doc,
    options.targetRange.to,
    placement
  )
  if (position === null) return null
  let previewElement: HTMLElement | null = null

  return Decoration.widget(
    position,
    (view) => {
      previewElement = renderPreview(view, options, placement)
      return previewElement
    },
    {
      key: createPreviewKey(options, placement),
      side: 1,
      ignoreSelection: true,
      stopEvent: (event) =>
        previewElement !== null &&
        isInsideElement(event.target, previewElement),
      destroy: () => {
        previewElement = null
      },
    }
  )
}

function resolvePreviewPosition(
  doc: ProseMirrorNode,
  position: number,
  placement: EmendTiptapPreviewPlacement
): number | null {
  if (position < 0 || position > doc.content.size) return null
  if (placement === "inline") return position

  const resolved = doc.resolve(position)
  return resolved.parent.isTextblock ? resolved.after() : position
}

function createTargetMarker(view: EditorView, proposalId: string): HTMLElement {
  const element = view.dom.ownerDocument.createElement("span")
  element.className = targetClassName
  element.setAttribute("data-emend-proposal-id", proposalId)
  element.setAttribute("data-emend-target", "cursor")
  element.setAttribute("aria-hidden", "true")
  return element
}

function renderPreview(
  view: EditorView,
  options: EmendTiptapShowProposalOptions,
  placement: EmendTiptapPreviewPlacement
): HTMLElement {
  const ownerDocument = view.dom.ownerDocument
  const element = ownerDocument.createElement(
    placement === "inline" ? "span" : "div"
  )

  element.setAttribute("contenteditable", "false")
  element.setAttribute("data-emend-preview", "true")
  element.setAttribute("data-emend-proposal-id", options.proposalId)
  element.setAttribute(
    "data-emend-preview-kind",
    options.previewKind ?? "supported-markdown"
  )

  if (options.previewKind === "plain-text-fallback") {
    element.setAttribute("data-emend-preview-fallback", "plain-text")
  }

  try {
    DOMSerializer.fromSchema(view.state.schema).serializeFragment(
      options.preview!,
      { document: ownerDocument },
      element
    )
  } catch {
    // A high-level preparation is schema-checked before it reaches this path.
    // If a direct caller supplies a foreign fragment, keep the preview empty.
  }

  return element
}

function createPreviewKey(
  options: EmendTiptapShowProposalOptions,
  placement: EmendTiptapPreviewPlacement
): string {
  let content = ""

  try {
    content = JSON.stringify(options.preview?.toJSON())
  } catch {
    content = options.preview?.toString() ?? ""
  }

  return `${options.proposalId}:preview:${options.previewKind ?? "supported-markdown"}:${placement}:${content}`
}

function isInsideElement(
  target: EventTarget | null,
  element: HTMLElement
): boolean {
  if (!isDomNode(target)) return false
  return element.contains(target)
}

function isDomNode(value: EventTarget | null): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodeType" in value &&
    typeof value.nodeType === "number"
  )
}
