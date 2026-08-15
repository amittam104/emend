"use client"

import type { ChangeEvent } from "react"
import { useCallback, useState, useSyncExternalStore } from "react"
import {
  EmendAiController,
  type EmendAiControllerListener,
  type EmendCaptureOptions,
  type EmendCaptureResult,
  type EmendTransport,
} from "@emend/ai"
import { createFetchTransport } from "@emend/ai/transport"
import { Button } from "@workspace/ui/components/button"

type HarnessAction = "improve" | "summarize"
type MockMode = "normal" | "delayed" | "failing"

interface HarnessSource {
  readonly markdown: string
  readonly revision: number
}

interface HarnessRuntime {
  readonly controller: EmendAiController
  readonly updateSource: (markdown: string) => HarnessSource
  readonly setMockMode: (mode: MockMode) => void
}

const initialSource: HarnessSource = {
  markdown:
    "Emend makes AI edits reviewable before they reach the document. This harness captures the text as a static selection.",
  revision: 1,
}

export function Phase2ControllerHarness() {
  const [runtime] = useState(createHarnessRuntime)
  const controller = runtime.controller
  const [source, setSource] = useState(initialSource)
  const [action, setAction] = useState<HarnessAction>("improve")
  const [mockMode, setMockMode] = useState<MockMode>("normal")
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const subscribe = useCallback(
    (listener: EmendAiControllerListener) => controller.subscribe(listener),
    [controller]
  )
  const getSnapshot = useCallback(() => controller.getSnapshot(), [controller])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const running =
    snapshot.state === "submitting" || snapshot.state === "streaming"
  const captured = snapshot.activeRequest
  const interactionMode = action === "summarize" ? "ask" : "edit"
  const hasCopyableOutput = Boolean(
    snapshot.pendingProposal ||
    snapshot.informationalMarkdown ||
    snapshot.streamedMarkdown
  )

  function handleSourceChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setSource(runtime.updateSource(event.target.value))
    setCopyStatus(null)
  }

  function handleMockModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMode = event.target.value as MockMode
    runtime.setMockMode(nextMode)
    setMockMode(nextMode)
  }

  function handleRun() {
    setCopyStatus(null)

    if (action === "summarize") {
      void controller.run("summarize", {
        interactionMode: "ask",
        targetScope: "document",
        contextScope: "document",
        mutationOperation: null,
      })
      return
    }

    void controller.run("improve", {
      interactionMode: "edit",
      targetScope: "selection",
      contextScope: "document",
      mutationOperation: "replace-selection",
    })
  }

  async function handleCopy() {
    const value = controller.copy()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus("Copied")
    } catch {
      setCopyStatus("Copy failed")
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="font-heading text-lg font-semibold">Request setup</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Changing the source increments its revision without mutating an
            existing captured request.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Source Markdown
          <textarea
            className="min-h-36 resize-y rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            value={source.markdown}
            onChange={handleSourceChange}
          />
          <span className="font-mono text-xs font-normal text-muted-foreground">
            Current revision: {source.revision} ({createFingerprint(source)})
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Action
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={action}
              onChange={(event) =>
                setAction(event.target.value as HarnessAction)
              }
            >
              <option value="improve">Improve</option>
              <option value="summarize">Summarize</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Interaction mode
            <output className="flex h-9 items-center rounded-lg border border-input bg-muted px-3 text-sm capitalize">
              {interactionMode}
            </output>
          </label>

          <label className="grid gap-2 text-sm font-medium sm:col-span-2">
            Mock stream
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={mockMode}
              onChange={handleMockModeChange}
            >
              <option value="normal">Normal</option>
              <option value="delayed">Delayed (300 ms per delta)</option>
              <option value="failing">Fail after three deltas</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRun} disabled={running || !source.markdown}>
            Run {action === "summarize" ? "Ask" : "Edit"}
          </Button>
          {running && (
            <Button variant="outline" onClick={() => controller.cancel()}>
              Cancel
            </Button>
          )}
          {(snapshot.state === "error" || snapshot.state === "aborted") && (
            <Button
              variant="outline"
              onClick={() => {
                setCopyStatus(null)
                void controller.retry()
              }}
            >
              Retry
            </Button>
          )}
          {captured && snapshot.state !== "idle" && (
            <Button
              variant="outline"
              onClick={() => {
                setCopyStatus(null)
                void controller.regenerate()
              }}
            >
              Regenerate
            </Button>
          )}
          {snapshot.pendingProposal && (
            <Button variant="destructive" onClick={() => controller.reject()}>
              Reject
            </Button>
          )}
          {hasCopyableOutput && (
            <Button variant="secondary" onClick={() => void handleCopy()}>
              Copy
            </Button>
          )}
          {copyStatus && (
            <span className="self-center text-xs text-muted-foreground">
              {copyStatus}
            </span>
          )}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Controller snapshot
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live state emitted by the framework-neutral controller.
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-medium">
              {snapshot.state}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Request ID</dt>
              <dd className="mt-1 font-mono text-xs break-all">
                {captured?.requestId ?? "No request captured"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stream completed</dt>
              <dd className="mt-1">
                {snapshot.streamCompleted ? "Yes" : "No"}
              </dd>
            </div>
          </dl>

          {snapshot.error && (
            <div
              className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              aria-live="polite"
            >
              <p className="font-mono text-xs font-semibold">
                {snapshot.error.code}
              </p>
              <p className="mt-1">{snapshot.error.message}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-lg font-semibold">
            Captured request
          </h2>
          {captured ? (
            <div className="mt-4 space-y-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Action / mode</dt>
                  <dd className="mt-1">
                    {captured.actionId} / {captured.interactionMode}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target scope</dt>
                  <dd className="mt-1">{captured.targetScope}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Context scope</dt>
                  <dd className="mt-1">{captured.contextScope}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Operation</dt>
                  <dd className="mt-1">
                    {captured.mutationOperation ?? "none"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target range</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {captured.targetRange
                      ? `${captured.targetRange.from}–${captured.targetRange.to}`
                      : "none"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source revision</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {captured.sourceRevision.counter} /{" "}
                    {captured.sourceRevision.fingerprint}
                  </dd>
                </div>
              </dl>

              <OutputCard
                title="Target Markdown"
                value={captured.targetMarkdown}
              />
              <OutputCard
                title="Context Markdown"
                value={captured.contextMarkdown}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Run an action to capture the static source.
            </p>
          )}
        </section>

        {running && (
          <OutputCard
            title="Streamed Markdown"
            value={snapshot.streamedMarkdown || "Waiting for the first delta…"}
          />
        )}
        {(snapshot.state === "error" || snapshot.state === "aborted") &&
          snapshot.streamedMarkdown && (
            <OutputCard
              title="Partial Markdown"
              value={snapshot.streamedMarkdown}
            />
          )}
        {snapshot.pendingProposal && (
          <OutputCard
            title="Pending Edit proposal"
            value={snapshot.pendingProposal.content.value}
          />
        )}
        {snapshot.informationalMarkdown && (
          <OutputCard
            title="Informational Ask output"
            value={snapshot.informationalMarkdown}
          />
        )}
      </div>
    </div>
  )
}

function createHarnessRuntime(): HarnessRuntime {
  let source = initialSource
  let mockMode: MockMode = "normal"

  const controller = new EmendAiController({
    transport: createHarnessTransport(() => mockMode),
    capture: (options) => captureSource(source, options),
    isSourceRevisionCurrent: (revision) =>
      revision.counter === source.revision &&
      revision.fingerprint === createFingerprint(source),
  })

  return {
    controller,
    updateSource(markdown) {
      source = { markdown, revision: source.revision + 1 }
      return source
    },
    setMockMode(mode) {
      mockMode = mode
    },
  }
}

function createHarnessTransport(getMockMode: () => MockMode): EmendTransport {
  return {
    run(request, signal) {
      const mode = getMockMode()
      const url =
        mode === "normal" ? "/api/phase-2" : `/api/phase-2?mode=${mode}`
      return createFetchTransport({ url }).run(request, signal)
    },
  }
}

function captureSource(
  source: HarnessSource,
  options: EmendCaptureOptions
): EmendCaptureResult {
  return {
    targetRange:
      options.mutationOperation === null
        ? null
        : { from: 0, to: source.markdown.length },
    targetScope: options.targetScope,
    contextScope: options.contextScope,
    mutationOperation: options.mutationOperation,
    targetMarkdown: source.markdown,
    contextMarkdown: `# Harness document\n\n${source.markdown}`,
    sourceRevision: {
      counter: source.revision,
      fingerprint: createFingerprint(source),
    },
    schemaCapabilities: {
      nodes: ["doc", "paragraph", "text"],
      marks: ["bold", "italic"],
      markdown: true,
    },
  }
}

function createFingerprint(source: HarnessSource): string {
  return `harness-${source.revision}`
}

function OutputCard({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {value}
      </pre>
    </section>
  )
}
