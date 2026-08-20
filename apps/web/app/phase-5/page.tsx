import "./phase-5.css"

import { Phase5ExistingEditorDemo } from "@/components/phase-5-existing-editor-demo"

export default function Phase5Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1500px] flex-col gap-8 p-6 lg:p-10">
      <header className="max-w-4xl space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Temporary internal development harness
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Emend existing-editor review workflow
        </h1>
        <p className="text-muted-foreground">
          Mount a consumer-owned Tiptap editor, stream a deterministic proposal,
          review its Markdown, and verify preview, stale, Accept, Reject, Undo,
          and Ask behavior.
        </p>
      </header>

      <Phase5ExistingEditorDemo />
    </main>
  )
}
