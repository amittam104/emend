export { captureTiptapContent } from "./capture.js"
export {
  acceptTiptapProposal,
  clearTiptapProposal,
  EMEND_AI_TRANSACTION_META,
  showTiptapProposal,
  type EmendAiTransactionMeta,
  type EmendTiptapShowOptions,
} from "./apply.js"
export {
  createEmendTiptapAdapter,
  type EmendTiptapAdapter,
  type EmendTiptapAdapterOptions,
} from "./adapter.js"
export { EmendAi, getEmendAiEditorState } from "./extension.js"
export { prepareTiptapProposal } from "./prepare.js"
export {
  getTiptapSourceRevision,
  isTiptapSourceRevisionCurrent,
  sameTiptapSourceRevision,
} from "./revision.js"
export * from "./types.js"
