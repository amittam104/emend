import { Phase9EditorDemo } from "@/components/phase-9-editor-demo"

export default function Phase9Page() {
  return (
    <main className="h-svh overflow-hidden bg-muted/30 p-3 sm:p-6 lg:p-8">
      <div className="mx-auto h-full w-full max-w-6xl">
        <Phase9EditorDemo />
      </div>
    </main>
  )
}
