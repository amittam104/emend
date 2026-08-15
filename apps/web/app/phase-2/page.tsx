import { Phase2ControllerHarness } from "@/components/phase-2-controller-harness"

export default function Phase2Page() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-6 lg:p-10">
      <header className="max-w-3xl space-y-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Internal development harness
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Emend AI controller
        </h1>
        <p className="text-muted-foreground">
          Exercise the provider-neutral request, streaming, proposal, and error
          lifecycle without an editor or provider key.
        </p>
      </header>

      <Phase2ControllerHarness />
    </main>
  )
}
