import type { EmendAiRequest, EmendActionId } from "../protocol/types.js"

export type EmendProposalContent = {
  readonly format: "markdown"
  readonly value: string
}

export interface EmendProposal {
  readonly id: string
  readonly actionId: EmendActionId
  readonly request: EmendAiRequest
  readonly content: EmendProposalContent
  readonly userModified: boolean
}

export function createProposal(
  input: Omit<EmendProposal, "userModified"> & {
    readonly userModified?: boolean
  }
): EmendProposal {
  const request = freezeRequest(input.request)
  const content = Object.freeze({ ...input.content })

  return Object.freeze({
    id: input.id,
    actionId: input.actionId,
    request,
    content,
    userModified: input.userModified ?? false,
  })
}

function freezeRequest(request: EmendAiRequest): EmendAiRequest {
  return Object.freeze({
    ...request,
    targetRange: request.targetRange
      ? Object.freeze({ ...request.targetRange })
      : null,
    sourceRevision: Object.freeze({ ...request.sourceRevision }),
    schemaCapabilities: Object.freeze({
      ...request.schemaCapabilities,
      nodes: Object.freeze([...request.schemaCapabilities.nodes]),
      marks: Object.freeze([...request.schemaCapabilities.marks]),
    }),
  })
}
