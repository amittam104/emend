import "./phase-4.css"

import { Phase4TiptapHarness } from "@/components/phase-4-tiptap-harness"

export default function Phase4Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1500px] flex-col gap-8 p-6 lg:p-10">
      <header className="max-w-4xl space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Temporary internal development harness
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Emend Tiptap integration
        </h1>
        <p className="text-muted-foreground">
          Capture a real editor target, stream a proposal, prepare a safe
          preview, and verify exact-range Accept, Reject, Undo, Redo, and stale
          revision behavior.
        </p>
      </header>

      <Phase4TiptapHarness />
    </main>
  )
}
