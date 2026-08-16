import type { Editor, JSONContent } from "@tiptap/core"
import type { EmendAiError } from "../protocol/errors.js"
import type { EmendRequestLimits } from "../protocol/types.js"

export type EmendMarkdownWarningCode =
  | "context-projected"
  | "raw-html"
  | "generated-image"
  | "unsafe-link"
  | "unsupported-markdown"
  | "plain-text-fallback"

export interface EmendMarkdownWarning {
  readonly code: EmendMarkdownWarningCode
  readonly message: string
}

export interface EmendSourceMarkdown {
  readonly targetMarkdown: string
  readonly contextMarkdown: string
  readonly warnings: readonly EmendMarkdownWarning[]
}

export type EmendSourceMarkdownResult =
  | { readonly ok: true; readonly source: EmendSourceMarkdown }
  | { readonly ok: false; readonly error: EmendAiError }

export interface SerializeSourceMarkdownOptions {
  readonly editor: Editor
  readonly target: JSONContent | null
  readonly context: JSONContent
  readonly contextProjection?: string
  readonly limits?: Partial<
    Pick<
      EmendRequestLimits,
      "maxTargetMarkdownLength" | "maxContextMarkdownLength"
    >
  >
  readonly linkProtocols?: readonly string[]
}

export interface PrepareProposalMarkdownOptions {
  readonly editor: Editor
  readonly markdown: string
  readonly textSafeTarget: boolean
  readonly linkProtocols?: readonly string[]
}

export type EmendPreparedProposal =
  | {
      readonly kind: "supported-markdown"
      readonly markdown: string
      readonly json: JSONContent
      readonly warnings: readonly EmendMarkdownWarning[]
    }
  | {
      readonly kind: "plain-text-fallback"
      readonly markdown: string
      readonly text: string
      readonly warnings: readonly EmendMarkdownWarning[]
    }
  | {
      readonly kind: "blocked"
      readonly markdown: string
      readonly error: EmendAiError
      readonly warnings: readonly EmendMarkdownWarning[]
    }
