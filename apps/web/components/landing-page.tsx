"use client"

import { createFetchTransport } from "@emend/ai/transport"
import {
  BookOpen02Icon,
  Copy01Icon,
  Edit02Icon,
  Github01Icon,
  Moon02Icon,
  SparklesIcon,
  Sun01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Node, type Editor, type JSONContent } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useState } from "react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { LandingEditor } from "./landing-editor"

const transport = createFetchTransport({ url: "/api/editor-ai" })
const installCommand = "pnpm install emend"

const initialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        { type: "text", text: "Open Source, AI Powered " },
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Rich Text Editor",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "emend is an open-source rich text editor with plug-and-play AI components and recipes, built on Tiptap. Add it to your existing Tiptap editor or start with the Emend Editor.",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        listItem("Composer", "a simple, agent-style writing experience"),
        listItem("Bubble menu", "rewrite selected text in place"),
        listItem("AI Assistant", "a floating assistant for your document"),
        listItem("Editor starter", "a complete editor with the AI Bubble Menu"),
      ],
    },
    {
      type: "heroCta",
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Choose your starting point." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Use Emend in one of two ways:",
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        listItem(
          "I already use Tiptap",
          "add the AI Bubble Menu, Composer, or AI Assistant without replacing your editor"
        ),
        listItem(
          "I need an editor",
          "start with the complete Emend Editor and choose the AI experience your product needs"
        ),
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "What Emend gives you." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Emend has two layers: an AI editing runtime and UI components whose source is copied into your app.",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        listItem(
          "AI editing runtime",
          "provider-neutral code that connects your editor to a model, previews proposed changes, and applies only accepted edits"
        ),
        listItem(
          "AI components",
          "a Composer, selection Bubble Menu, and document-aware AI Assistant"
        ),
        listItem(
          "Editor starters",
          "a complete Tiptap editor with formatting, tables, save boundaries, and your choice of AI surface"
        ),
        listItem(
          "Server recipe",
          "a starting point for connecting your own model provider while keeping credentials on your server"
        ),
        listItem(
          "Full ownership",
          "your editor source, AI components, provider route, documents, and deployment stay in your app"
        ),
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "The problem it solves." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Adding AI to an editor takes more than sending a prompt to a model. You need to capture the right text, keep generated changes out of the live document until review, handle streaming, reject stale edits, and make Accept, Reject, and Undo predictable.",
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Emend provides that missing layer, so you can add reviewable AI editing without rebuilding your editor.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "How Emend is different." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Tiptap, BlockNote, and Emend solve different parts of the editor stack.",
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        listItem(
          "Tiptap",
          "the MIT-licensed, headless editor foundation. Choose it when you want to build the editor UI yourself. Managed AI, collaboration, and conversion are Tiptap Platform features"
        ),
        listItem(
          "BlockNote",
          "a ready-made, block-based editor built on Tiptap. Its core uses MPL 2.0. Its XL AI, multi-column, and export packages use GPL 3.0 for open-source projects or require a commercial license for closed-source apps"
        ),
        listItem(
          "Emend",
          "the MIT-licensed AI editing runtime, components, editor starters, and server recipe for Tiptap. Your source, provider route, credentials, and documents stay in your app"
        ),
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Emend is in active development. The public package is not available yet, so this demo calls our own Emend route backed by OpenRouter's free models.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Try the editor." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This page is the editor. Change the copy, use the toolbar, or select a sentence to try the AI Bubble Menu.",
        },
      ],
    },
  ],
}

function listItem(label: string, detail: string): JSONContent {
  return {
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: label },
          { type: "text", text: ` — ${detail}` },
        ],
      },
    ],
  }
}

const HeroCta = Node.create({
  name: "heroCta",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-hero-cta]" }],
  renderHTML: () => ["div", { "data-hero-cta": "" }],
  addNodeView: () => ReactNodeViewRenderer(HeroCtaView),
})

const landingExtensions = [HeroCta]

function HeroCtaView() {
  const [copied, setCopied] = useState(false)

  async function copyInstall() {
    const didCopy = await navigator.clipboard
      .writeText(installCommand)
      .then(() => true)
      .catch(() => false)
    if (!didCopy) return

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <NodeViewWrapper className="flex flex-wrap items-center gap-3">
      <Link
        data-slot="button"
        href="/docs"
        className={cn(
          buttonVariants({
            variant: "default",
            size: "lg",
            className:
              "!text-primary-foreground !no-underline transition-[background-color,color,scale] duration-100 active:translate-y-0 motion-safe:active:scale-96",
          })
        )}
      >
        <HugeiconsIcon icon={BookOpen02Icon} />
        Read docs
      </Link>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={copyInstall}
        aria-label={`Copy install command: ${installCommand}`}
        title={`Copy ${installCommand}`}
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} />
        <code className="font-mono text-[13px]">
          <span className="text-muted-foreground">$ </span>
          {installCommand}
        </code>
      </Button>
    </NodeViewWrapper>
  )
}

interface DocumentStats {
  readonly characters: number
  readonly column: number
  readonly line: number
  readonly words: number
}

function LandingThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      className="transition-[background-color,color,scale] duration-100 active:not-aria-[haspopup]:translate-y-0 motion-safe:active:not-aria-[haspopup]:scale-96"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <HugeiconsIcon icon={Sun01Icon} className="dark:hidden" />
      <HugeiconsIcon icon={Moon02Icon} className="hidden dark:block" />
    </Button>
  )
}

export function LandingPage() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [stats, setStats] = useState<DocumentStats>({
    characters: 0,
    column: 1,
    line: 1,
    words: 0,
  })
  const onEditorReady = useCallback((nextEditor: Editor) => {
    setEditor(nextEditor)
  }, [])

  useEffect(() => {
    if (!editor) return

    const updateStats = () => {
      const documentText = editor.getText()
      const text = documentText.trim()
      const beforeCursor = editor.state.doc.textBetween(
        0,
        editor.state.selection.from,
        "\n",
        "\n"
      )
      const lines = beforeCursor.split("\n")

      setStats({
        characters: documentText.length,
        line: lines.length,
        column: (lines.at(-1)?.length ?? 0) + 1,
        words: text ? text.split(/\s+/).length : 0,
      })
    }

    updateStats()
    editor.on("update", updateStats)
    editor.on("selectionUpdate", updateStats)

    return () => {
      editor.off("update", updateStats)
      editor.off("selectionUpdate", updateStats)
    }
  }, [editor])

  return (
    <main className="landing-page min-h-svh overflow-hidden bg-background font-sans text-foreground">
      <div className="h-svh pb-[30px]">
        <LandingEditor
          extensions={landingExtensions}
          initialContent={initialContent}
          onEditorReady={onEditorReady}
          actions={
            <>
              <a
                data-slot="button"
                href="https://github.com/amittam104/emend"
                rel="noreferrer"
                target="_blank"
                className={cn(
                  buttonVariants({
                    variant: "secondary",
                    size: "icon-xs",
                    className:
                      "border-border transition-[background-color,color,scale] duration-100 active:translate-y-0 motion-safe:active:scale-96",
                  })
                )}
                aria-label="View Emend on GitHub"
                title="View Emend on GitHub"
              >
                <HugeiconsIcon icon={Github01Icon} className="size-3.5" />
              </a>
              <LandingThemeSwitch />
            </>
          }
          transport={transport}
        />
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-60 flex h-[30px] items-center justify-between border-t border-border bg-secondary px-3.5 font-sans text-xs leading-4 whitespace-nowrap text-secondary-foreground/70">
        <div className="flex items-center gap-4">
          <span>{editor ? "Ready" : "Loading…"}</span>
          <span>
            Ln {stats.line}, Col {stats.column}
          </span>
          <span className="flex items-center gap-1.5 max-md:hidden">
            <HugeiconsIcon icon={Edit02Icon} className="size-3 opacity-70" />
            Editable demo
          </span>
          <span>{stats.words} words</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="max-sm:hidden">{stats.characters} characters</span>
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={SparklesIcon} className="size-3" />
            <span className="max-md:hidden">Select text for AI</span>
          </span>
        </div>
      </footer>
    </main>
  )
}
