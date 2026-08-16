import { Phase3ContentHarness } from "@/components/phase-3-content-harness"

export default function Phase3Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-6 lg:p-10">
      <header className="max-w-3xl space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Temporary internal development harness
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Emend Markdown content boundary
        </h1>
        <p className="text-muted-foreground">
          Exercise separate source serialization and completed-proposal
          preparation against a real headless Tiptap schema without mutating an
          editor document.
        </p>
      </header>

      <Phase3ContentHarness />
    </main>
  )
}
