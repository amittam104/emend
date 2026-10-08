import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

const { readFileSync } = await import("node:fs")
const { createRequire } = await import("node:module")
const { dirname, join } = await import("node:path")
const { Editor } = await import("@tiptap/core")
const { default: StarterKit } = await import("@tiptap/starter-kit")
const { Markdown } = await import("@tiptap/markdown")
const { TableKit } = await import("@tiptap/extension-table")
const { EmendAi, createEmendTiptapAdapter } = await import("@emend/ai/tiptap")
const { EmendAiController, PROTOCOL_VERSION } =
  await import("@emend/ai/protocol")
const { createMockTransport } = await import("@emend/ai/transport")

const coreEntry = createRequire(import.meta.url).resolve("@tiptap/core")
const tiptapVersion = JSON.parse(
  readFileSync(join(dirname(coreEntry), "..", "package.json"), "utf8")
).version

function check(condition, message) {
  if (!condition) throw new Error(`Tiptap ${tiptapVersion}: ${message}`)
  console.log(`  ok  ${message}`)
}

const original = "Select this sentence and improve it."
const inlineAnswer =
  "A **clearer** sentence with a [link](https://example.com)."
const blockAnswer = [
  "A rewritten paragraph.",
  "",
  "- first point",
  "- second point",
  "",
  "| Name | Value |",
  "| ---- | ----- |",
  "| a    | 1     |",
].join("\n")

let answer = inlineAnswer

const transport = {
  async *run(request) {
    for (const delta of answer.match(/\S+\s*|\s+/g)) {
      yield {
        protocolVersion: PROTOCOL_VERSION,
        type: "text-delta",
        requestId: request.requestId,
        delta,
      }
    }
    yield {
      protocolVersion: PROTOCOL_VERSION,
      type: "done",
      requestId: request.requestId,
    }
  },
}

const editor = new Editor({
  element: document.createElement("div"),
  extensions: [StarterKit, TableKit, Markdown, EmendAi],
  content: `<p>${original}</p><p>Keep this paragraph.</p>`,
})
const adapter = createEmendTiptapAdapter(editor)
const controller = new EmendAiController({
  transport,
  capture: adapter.capture,
  isSourceRevisionCurrent: adapter.isSourceRevisionCurrent,
})

async function propose(actionId, options) {
  editor.commands.setTextSelection({ from: 1, to: original.length + 1 })
  await controller.run(actionId, options)
  const snapshot = controller.getSnapshot()
  if (snapshot.error) throw new Error(snapshot.error.code)
  const proposal = snapshot.pendingProposal
  const preparation = adapter.prepare(proposal)
  return { proposal, preparation }
}

function finish(proposal) {
  controller.clearPendingProposal(proposal.id)
}

console.log(`Tiptap ${tiptapVersion}`)

check(editor.getMarkdown().includes(original), "the editor serializes Markdown")

{
  const { proposal, preparation } = await propose("improve")
  check(
    proposal.content.value === inlineAnswer,
    "the streamed answer becomes a proposal"
  )
  check(
    preparation.kind === "supported-markdown",
    `the answer is supported Markdown (got ${preparation.kind})`
  )
  check(
    adapter.show(proposal, preparation, { inlinePreview: true }).ok,
    "the preview is shown"
  )
  check(
    !editor.getHTML().includes("clearer"),
    "the preview does not change the document"
  )
  const accepted = adapter.accept(proposal, preparation, {
    confirmDocumentReplacement: false,
  })
  check(
    accepted.ok,
    `Accept succeeds${accepted.ok ? "" : ` (${accepted.error.code})`}`
  )
  finish(proposal)
  const html = editor.getHTML()
  check(
    html.includes("<strong>clearer</strong>") &&
      html.includes('href="https://example.com"'),
    "Accept applies bold text and a link"
  )
  check(
    html.includes("Keep this paragraph."),
    "Accept keeps the other paragraph"
  )
  editor.commands.undo()
  check(editor.getHTML().includes(original), "Undo restores the original text")
}

{
  answer = blockAnswer
  const { proposal, preparation } = await propose("custom", {
    interactionMode: "edit",
    targetScope: "current-block",
    mutationOperation: "replace-current-block",
    instruction: "Rewrite this as a list and a table.",
  })
  check(
    preparation.kind === "supported-markdown",
    `a list and a table are supported Markdown (got ${preparation.kind})`
  )
  adapter.show(proposal, preparation, { inlinePreview: true })
  const accepted = adapter.accept(proposal, preparation, {
    confirmDocumentReplacement: false,
  })
  check(
    accepted.ok,
    `Accept replaces the block${accepted.ok ? "" : ` (${accepted.error.code})`}`
  )
  finish(proposal)
  const html = editor.getHTML()
  check(
    html.includes("<ul>") && html.includes("<table"),
    "Accept applies a list and a table"
  )
  editor.commands.undo()
  check(editor.getHTML().includes(original), "Undo restores the block")
}

{
  answer = inlineAnswer
  const { proposal, preparation } = await propose("improve")
  adapter.show(proposal, preparation, { inlinePreview: true })
  check(adapter.reject(proposal.id).ok, "Reject succeeds")
  finish(proposal)
  check(
    editor.getHTML().includes(original),
    "Reject leaves the document unchanged"
  )
}

{
  const { proposal, preparation } = await propose("improve")
  adapter.show(proposal, preparation, { inlinePreview: true })
  editor.commands.insertContentAt(editor.state.doc.content.size - 1, " Edited.")
  const stale = adapter.accept(proposal, preparation, {
    confirmDocumentReplacement: false,
  })
  check(
    !stale.ok && stale.error.code === "stale_revision",
    "an out-of-date suggestion cannot be accepted"
  )
  adapter.reject(proposal.id)
  finish(proposal)
}

{
  const ask = new EmendAiController({
    transport: createMockTransport(),
    capture: adapter.capture,
    isSourceRevisionCurrent: adapter.isSourceRevisionCurrent,
  })
  await ask.run("custom", {
    interactionMode: "ask",
    targetScope: "document",
    instruction: "What is this about?",
  })
  const snapshot = ask.getSnapshot()
  check(
    snapshot.error === null && snapshot.informationalMarkdown.length > 0,
    `an Ask request returns an answer${snapshot.error ? ` (${snapshot.error.code})` : ""}`
  )
}

editor.destroy()
console.log(`Tiptap ${tiptapVersion}: all checks passed`)
