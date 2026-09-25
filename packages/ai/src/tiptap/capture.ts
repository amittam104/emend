import type { Editor, JSONContent } from "@tiptap/core"
import type { EditorState } from "@tiptap/pm/state"
import { NodeSelection, Selection } from "@tiptap/pm/state"
import type {
  Mark,
  Node as ProseMirrorNode,
  ResolvedPos,
  Slice,
} from "@tiptap/pm/model"
import { getMarkdownManager } from "../content/inspect.js"
import { wrapInDocument } from "./slice.js"
import { serializeSourceMarkdown } from "../content/source.js"
import {
  createEmendError,
  type EmendAiError,
  type EmendErrorCode,
} from "../protocol/errors.js"
import type {
  EmendContextScope,
  EmendMutationOperation,
  EmendSelectionRange,
  EmendTargetScope,
} from "../protocol/types.js"
import {
  getEmendAiPluginState,
  getTiptapSourceRevision,
} from "./revision.js"
import type {
  EmendCapturedContent,
  EmendCapturedTarget,
  EmendTiptapCapture,
  EmendTiptapCaptureOptions,
  EmendTiptapCaptureResult,
} from "./types.js"

const contextScopes: readonly EmendContextScope[] = [
  "selection",
  "current-block",
  "document",
]

const targetScopes: readonly EmendTargetScope[] = [
  "selection",
  "current-block",
  "document",
]

const mutationOperations: readonly EmendMutationOperation[] = [
  "replace-selection",
  "replace-current-block",
  "replace-document",
  "insert-at-cursor",
]

interface ResolvedRange {
  readonly from: number
  readonly to: number
  readonly fromResolved: ResolvedPos
  readonly toResolved: ResolvedPos
  readonly node?: ProseMirrorNode
}

interface ResolvedBlock extends ResolvedRange {
  readonly node: ProseMirrorNode
}

export function captureTiptapContent(
  editor: Editor | null | undefined,
  options: EmendTiptapCaptureOptions
): EmendTiptapCaptureResult {
  if (!editor || editor.isDestroyed) return failure("editor_not_configured")

  const state = editor.state
  if (!getEmendAiPluginState(state)) return failure("editor_not_configured")
  if (!getMarkdownManager(editor)) return failure("markdown_unavailable")

  const optionsError = validateOptions(options)
  if (optionsError) return failure(optionsError)

  const sourceRevision = getTiptapSourceRevision(editor)
  if (!sourceRevision.ok) return failure(sourceRevision.error)

  const selection = state.selection
  const documentSize = state.doc.content.size
  if (
    !isValidPosition(selection.from, documentSize) ||
    !isValidPosition(selection.to, documentSize) ||
    selection.from > selection.to
  ) {
    return failure("invalid_request")
  }

  const mutationOperation = options.mutationOperation
  const targetResolution = mutationOperation
    ? resolveMutationTarget(state, selection, mutationOperation)
    : null
  if (isError(targetResolution)) return failure(targetResolution)

  const contextResolution = resolveContextRange(
    state,
    selection,
    options.contextScope
  )
  if (isError(contextResolution)) return failure(contextResolution)

  const target = targetResolution && mutationOperation !== null
    ? captureTarget(state, selection, targetResolution, mutationOperation)
    : null
  if (isError(target)) return failure(target)

  const context = captureContent(state, contextResolution)
  if (isError(context)) return failure(context)

  const serialized = serializeSourceMarkdown({
    editor,
    target:
      target && options.mutationOperation !== "insert-at-cursor"
        ? target.json
        : null,
    context: context.json,
    contextProjection:
      options.contextScope === "selection" && selection.empty
        ? ""
        : options.contextProjection,
    limits: options.limits,
    linkProtocols: options.linkProtocols,
  })
  if (!serialized.ok) return failure(serialized.error)

  const source =
    options.contextScope === "selection" && selection.empty
      ? {
          ...serialized.source,
          contextMarkdown: "",
          warnings: serialized.source.warnings.filter(
            (warning) => warning.code !== "context-projected"
          ),
        }
      : serialized.source

  const capabilities = createSchemaCapabilities(state)
  const protocol = Object.freeze({
    targetRange: target ? toSelectionRange(target.range) : null,
    targetScope: options.targetScope,
    contextScope: options.contextScope,
    mutationOperation: options.mutationOperation,
    targetMarkdown: source.targetMarkdown,
    contextMarkdown: source.contextMarkdown,
    sourceRevision: sourceRevision.revision,
    schemaCapabilities: capabilities,
  })
  const warnings = freezeWarnings(source.warnings)

  const capture: EmendTiptapCapture = Object.freeze({
    protocol,
    target,
    context,
    warnings,
  })

  return Object.freeze({ ok: true, capture })
}

function validateOptions(
  options: EmendTiptapCaptureOptions
): EmendAiError | null {
  if (!isRecord(options)) return createEmendError("invalid_request")
  if (!isOneOf(options.targetScope, targetScopes)) {
    return createEmendError("invalid_request")
  }
  if (!isOneOf(options.contextScope, contextScopes)) {
    return createEmendError("invalid_request")
  }
  if (
    options.mutationOperation !== null &&
    !isOneOf(options.mutationOperation, mutationOperations)
  ) {
    return createEmendError("invalid_request")
  }

  switch (options.mutationOperation) {
    case "replace-selection":
    case "insert-at-cursor":
      return options.targetScope === "selection"
        ? null
        : createEmendError("invalid_request")
    case "replace-current-block":
      return options.targetScope === "current-block"
        ? null
        : createEmendError("invalid_request")
    case "replace-document":
      return options.targetScope === "document"
        ? null
        : createEmendError("invalid_request")
    case null:
      return null
  }
}

function resolveMutationTarget(
  state: EditorState,
  selection: Selection,
  operation: EmendMutationOperation
): ResolvedRange | EmendAiError {
  switch (operation) {
    case "replace-selection": {
      const [from, to] = selection.empty
        ? [0, 0]
        : trimSelection(state, selection)
      return from < to
        ? resolveRange(state, from, to)
        : createEmendError("selection_required")
    }
    case "insert-at-cursor":
      return selection.empty
        ? resolveRange(state, selection.from, selection.from)
        : createEmendError("invalid_request")
    case "replace-document":
      return resolveRange(state, 0, state.doc.content.size)
    case "replace-current-block":
      return resolveCurrentBlock(state, selection)
  }
}

function trimSelection(
  state: EditorState,
  selection: Selection
): [number, number] {
  let { from, to, $from, $to } = selection

  // A drag that stops at the edge of the next block selects none of its text,
  // and that empty block cannot round-trip through Markdown. Leave it out.
  if ($to.parent.isTextblock && $to.parentOffset === 0 && from < $to.start()) {
    to = Selection.findFrom(state.doc.resolve($to.before()), -1, true)?.to ?? to
  }
  if (
    $from.parent.isTextblock &&
    $from.parentOffset === $from.parent.content.size &&
    to > $from.end()
  ) {
    from =
      Selection.findFrom(state.doc.resolve($from.after()), 1, true)?.from ??
      from
  }

  // Markdown drops whitespace at block edges, so leave it out of the target.
  while (from < to && /\s/.test(state.doc.textBetween(from, from + 1))) {
    from += 1
  }
  while (from < to && /\s/.test(state.doc.textBetween(to - 1, to))) to -= 1

  // An edge that covers whole list items or lists moves outside them, so the
  // answer replaces those nodes and can retype them (bullets to numbers).
  $from = state.doc.resolve(from)
  $to = state.doc.resolve(to)
  if (!$from.sameParent($to)) {
    const depth = Math.max(1, $from.sharedDepth(to))
    $from = state.doc.resolve((from = outerEdge($from, -1, depth)))
    $to = state.doc.resolve((to = outerEdge($to, 1, depth)))
  }

  // An edge that cuts through a table, or leaves a block invalid on its own
  // (a list item that starts with a nested list), cannot round-trip through
  // Markdown, so the selection grows to the whole blocks it touches.
  const shared = $from.sharedDepth(to)
  let widen = false
  for (let depth = shared + 1; depth <= $from.depth; depth += 1) {
    const node = $from.node(depth)
    widen ||=
      !!node.type.spec.tableRole || !node.canReplace(0, $from.index(depth))
  }
  for (let depth = shared + 1; depth <= $to.depth; depth += 1) {
    const node = $to.node(depth)
    widen ||=
      !!node.type.spec.tableRole ||
      !node.canReplace($to.indexAfter(depth), node.childCount)
  }
  const range = widen
    ? $from.blockRange($to, (node) => !node.type.spec.tableRole)
    : null
  return range ? [range.start, range.end] : [from, to]
}

/**
 * Returns the position outside the outermost container, from `minDepth` down
 * and not a table part, whose start (side -1) or end (side 1) the position
 * sits at, or the position itself.
 */
function outerEdge($pos: ResolvedPos, side: -1 | 1, minDepth: number): number {
  const atEdge = (depth: number) =>
    side < 0
      ? $pos.index(depth) === 0
      : $pos.indexAfter(depth) === $pos.node(depth).childCount
  const atTextEdge =
    $pos.parentOffset === (side < 0 ? 0 : $pos.parent.content.size)

  for (let depth = minDepth; depth < $pos.depth; depth += 1) {
    if ($pos.node(depth).type.spec.tableRole) continue
    let covered = atTextEdge
    for (let inner = depth; covered && inner < $pos.depth; inner += 1) {
      covered = atEdge(inner)
    }
    if (covered) return side < 0 ? $pos.before(depth) : $pos.after(depth)
  }
  return $pos.pos
}

function resolveContextRange(
  state: EditorState,
  selection: Selection,
  scope: EmendContextScope
): ResolvedRange | EmendAiError {
  switch (scope) {
    case "selection": {
      // Read the same range the edit targets, so it round-trips the same way.
      const [from, to] = selection.empty
        ? [selection.from, selection.to]
        : trimSelection(state, selection)
      return resolveRange(state, from, Math.max(from, to))
    }
    case "current-block": {
      // A selection across several blocks reads the blocks it spans.
      const block = resolveCurrentBlock(state, selection)
      const spanned = selection.$from.blockRange(selection.$to)
      return isError(block) && spanned
        ? resolveRange(state, spanned.start, spanned.end)
        : block
    }
    case "document":
      return resolveRange(state, 0, state.doc.content.size)
  }
}

function resolveCurrentBlock(
  state: EditorState,
  selection: Selection
): ResolvedBlock | EmendAiError {
  if (
    selection instanceof NodeSelection &&
    isEditableBlock(selection.node)
  ) {
    const range = resolveRange(state, selection.from, selection.to)
    return isError(range)
      ? range
      : { ...range, node: selection.node }
  }

  const from = selection.$from
  const to = selection.$to
  const maxDepth = Math.min(from.depth, to.depth)

  for (let depth = maxDepth; depth > 0; depth -= 1) {
    const node = from.node(depth)
    if (!isEditableBlock(node) || to.node(depth) !== node) continue

    const start = from.before(depth)
    const end = from.after(depth)
    if (selection.from < start || selection.to > end) continue

    const range = resolveRange(state, start, end)
    return isError(range) ? range : { ...range, node }
  }

  return createEmendError("invalid_request")
}

function captureTarget(
  state: EditorState,
  selection: Selection,
  range: ResolvedRange,
  operation: EmendMutationOperation
): EmendCapturedTarget | EmendAiError {
  const content = captureContent(state, range)
  if (isError(content)) return content

  const parent = sharedParent(range)
  const placement = getPlacement(range, operation)
  const sourceNode =
    operation === "replace-current-block"
      ? range.node ?? getNodeAtRangeStart(state, range)
      : null
  const sourceMarks = getSourceMarks(state, selection, placement)

  return Object.freeze({
    ...content,
    mutationOperation: operation,
    parentNodeType: parent.type.name,
    parentAttributes: freezeRecord({ ...parent.attrs }),
    sourceNode,
    sourceMarks: Object.freeze([...sourceMarks]),
    placement,
    textSafe: isTextSafe(content.slice),
  })
}

function captureContent(
  state: EditorState,
  range: ResolvedRange
): EmendCapturedContent | EmendAiError {
  const slice = state.doc.slice(range.from, range.to)
  const json = sliceToDocumentJson(state, range, slice)
  if (!json) return createEmendError("schema_unsupported")

  return Object.freeze({
    range: Object.freeze({
      from: range.from,
      to: range.to,
      fromResolved: range.fromResolved,
      toResolved: range.toResolved,
    }),
    slice,
    json,
  })
}

function resolveRange(
  state: EditorState,
  from: number,
  to: number
): ResolvedRange | EmendAiError {
  const size = state.doc.content.size
  if (
    !isValidPosition(from, size) ||
    !isValidPosition(to, size) ||
    from > to
  ) {
    return createEmendError("invalid_request")
  }

  try {
    return {
      from,
      to,
      fromResolved: state.doc.resolve(from),
      toResolved: state.doc.resolve(to),
    }
  } catch {
    return createEmendError("invalid_request")
  }
}

function sliceToDocumentJson(
  state: EditorState,
  range: ResolvedRange,
  slice: Slice
): JSONContent | null {
  const wrapped = wrapInDocument(range.fromResolved, range.to, slice.content)
  return wrapped ? freezeJson(wrapped.document.toJSON()) : null
}

function sharedParent(range: ResolvedRange): ProseMirrorNode {
  const depth = range.fromResolved.sharedDepth(range.to)
  return range.fromResolved.node(depth)
}

function getPlacement(
  range: ResolvedRange,
  operation: EmendMutationOperation
): "inline" | "block" {
  if (
    operation === "replace-current-block" ||
    operation === "replace-document"
  ) {
    return "block"
  }

  return range.fromResolved.parent.isTextblock &&
    range.fromResolved.sameParent(range.toResolved)
    ? "inline"
    : "block"
}

function getNodeAtRangeStart(
  state: EditorState,
  range: ResolvedRange
): ProseMirrorNode | null {
  return state.doc.nodeAt(range.from) ?? null
}

function getSourceMarks(
  state: EditorState,
  selection: Selection,
  placement: "inline" | "block"
): readonly Mark[] {
  if (placement !== "inline") return []
  if (selection.empty) {
    return state.storedMarks ?? selection.$from.marks()
  }
  if (!selection.$from.sameParent(selection.$to)) return []

  // Only marks on all of the selected text carry over to the proposal.
  let marks: readonly Mark[] | null = null
  state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.isText) {
      marks = marks?.filter((mark) => mark.isInSet(node.marks)) ?? node.marks
    }
  })
  return marks ?? []
}

function isTextSafe(slice: Slice): boolean {
  let safe = true
  slice.content.forEach((node) => {
    if (!node.isInline && !node.isTextblock) safe = false
  })
  return safe
}

function isEditableBlock(node: ProseMirrorNode): boolean {
  // A table row or cell has no Markdown form on its own; the table does.
  const tableRole = node.type.spec.tableRole
  return (
    node.isBlock &&
    node.type !== node.type.schema.topNodeType &&
    !node.isLeaf &&
    !node.isAtom &&
    (!tableRole || tableRole === "table")
  )
}

function createSchemaCapabilities(state: EditorState) {
  const nodes = Object.freeze(
    [...new Set(Object.keys(state.schema.nodes))].sort()
  )
  const marks = Object.freeze(
    [...new Set(Object.keys(state.schema.marks))].sort()
  )

  return Object.freeze({ nodes, marks, markdown: true as const })
}

function toSelectionRange(range: ResolvedRange): EmendSelectionRange {
  return Object.freeze({ from: range.from, to: range.to })
}

function freezeWarnings(
  warnings: readonly EmendTiptapCapture["warnings"][number][]
): EmendTiptapCapture["warnings"] {
  return Object.freeze(warnings.map((warning) => Object.freeze({ ...warning })))
}

function freezeJson<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((child) => freezeJson(child))
    return Object.freeze(value) as T
  }
  if (isRecord(value)) {
    Object.values(value).forEach((child) => freezeJson(child))
    return Object.freeze(value) as T
  }
  return value
}

function freezeRecord(
  value: Record<string, unknown>
): Readonly<Record<string, unknown>> {
  return freezeJson(value)
}

function failure(
  error: EmendAiError | EmendErrorCode
): EmendTiptapCaptureResult {
  const resolved =
    typeof error === "string" ? createEmendError(error) : error
  return Object.freeze({
    ok: false,
    error: Object.freeze({ ...resolved }),
  })
}

function isError(value: unknown): value is EmendAiError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  )
}

function isValidPosition(value: number, documentSize: number): boolean {
  return (
    Number.isInteger(value) && value >= 0 && value <= documentSize
  )
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === "string" && allowed.includes(value as T)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
