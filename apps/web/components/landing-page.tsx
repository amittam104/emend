"use client"

import { createFetchTransport } from "@emend/ai/transport"
import {
  BookOpen02Icon,
  Edit02Icon,
  Moon02Icon,
  SparklesIcon,
  Sun01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Node, type Editor, type JSONContent } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import Lenis from "lenis"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  createElement,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { GitHubLogo, githubRepositoryUrl } from "./github-logo"
import { LandingEditor } from "./landing-editor"
import { ComponentShowcase, showcaseItems } from "./landing-showcase"

const transport = createFetchTransport({ url: "/api/editor-ai" })
const ctaClasses =
  "!no-underline transition-[background-color,color,scale] duration-200 ease-out active:translate-y-0 active:duration-100 motion-safe:active:scale-96"

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
          text: "emend is an open-source rich text editor with plug-and-play AI components and recipes, built on Tiptap. Add it to your existing Tiptap editor or start with the emend editor.",
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
      content: [{ type: "text", text: "See the components." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Each one runs on the same AI editing runtime, and you can try all of them on this page.",
        },
      ],
    },
    {
      type: "componentShowcase",
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
          text: "Use emend in one of two ways:",
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        listItem(
          "I already use Tiptap",
          "add the AI Bubble Menu, Composer, or AI Assistant without replacing your Tiptap editor"
        ),
        listItem(
          "I need an editor",
          "start with the complete emend editor and choose the AI experience your product needs"
        ),
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "What emend gives you." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "emend has two layers: an AI editing runtime and UI components whose source is copied into your app.",
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
              text: "emend provides that missing layer, so you can add reviewable AI editing without rebuilding your editor.",
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "How emend is different." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Tiptap, BlockNote, and emend solve different parts of the editor stack.",
        },
      ],
    },
    {
      type: "orderedList",
      content: [
        listItem(
          "Tiptap",
          "the MIT-licensed, headless editor foundation. Choose it when you want to build the editor UI yourself. Managed AI, collaboration, and conversion are paid Tiptap Platform features"
        ),
        listItem(
          "BlockNote",
          "a ready-made, block-based editor built on Tiptap. Its core uses MPL 2.0. Its XL AI, multi-column, and export packages use GPL 3.0 for open-source projects or require a commercial license for closed-source apps"
        ),
        listItem(
          "emend",
          "the MIT-licensed AI editing runtime, components, editor starters, and server recipe for Tiptap. Your source, provider route, credentials, and documents stay in your app"
        ),
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "emend is in active development and available on npm as @emend/ai, with editable components from our Shadcn registry. This demo calls our own emend route backed by OpenRouter's free models.",
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
          text: "Everything on this page is editable. Change the copy, format it with the toolbar, select a sentence to open the AI Bubble Menu, or use the AI Assistant and AI Composer buttons in the toolbar.",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When you're ready to add emend to your own app, read the docs to install it and set up your editor.",
        },
      ],
    },
    {
      type: "docsCta",
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
          { type: "text", text: ` - ${detail}` },
        ],
      },
    ],
  }
}

function renderLandingContent(node: JSONContent, index = 0): ReactNode {
  if (node.type === "doc") return node.content?.map(renderLandingContent)
  if (node.type === "componentShowcase") {
    return (
      <ul key={index}>
        {showcaseItems.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.name}</a> — {item.description}
          </li>
        ))}
      </ul>
    )
  }
  if (node.type === "text") {
    return node.marks?.some((mark) => mark.type === "bold") ? (
      <strong key={index}>{node.text}</strong>
    ) : (
      node.text
    )
  }
  if (node.type === "heroCta" || node.type === "docsCta") {
    return (
      <div key={index} className="flex flex-wrap gap-3">
        <ReadDocsLink />
        {node.type === "heroCta" && (
          <a href={githubRepositoryUrl}>GitHub repo</a>
        )}
      </div>
    )
  }
  const tags: Record<string, string> = {
    heading: node.attrs?.level === 1 ? "h1" : "h2",
    paragraph: "p",
    bulletList: "ul",
    orderedList: "ol",
    listItem: "li",
    blockquote: "blockquote",
  }
  const tag = tags[node.type ?? ""]
  return tag
    ? createElement(
        tag,
        { key: index },
        node.content?.map(renderLandingContent)
      )
    : null
}

const HeroCta = Node.create({
  name: "heroCta",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-hero-cta]" }],
  renderHTML: () => ["div", { "data-hero-cta": "" }],
  addNodeView: () => ReactNodeViewRenderer(HeroCtaView),
})

const DocsCta = Node.create({
  name: "docsCta",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-docs-cta]" }],
  renderHTML: () => ["div", { "data-docs-cta": "" }],
  addNodeView: () => ReactNodeViewRenderer(DocsCtaView),
})

const landingExtensions = [HeroCta, DocsCta, ComponentShowcase]

function ReadDocsLink() {
  return (
    <Link
      data-slot="button"
      href="/docs"
      className={cn(
        buttonVariants({
          variant: "default",
          size: "lg",
          className: cn("!text-primary-foreground", ctaClasses),
        })
      )}
    >
      <HugeiconsIcon icon={BookOpen02Icon} />
      Read docs
    </Link>
  )
}

function HeroCtaView() {
  return (
    <NodeViewWrapper className="flex flex-wrap items-center gap-3">
      <ReadDocsLink />
      <a
        data-slot="button"
        href={githubRepositoryUrl}
        rel="noreferrer"
        target="_blank"
        className={cn(
          buttonVariants({
            variant: "secondary",
            size: "lg",
            className: cn("!text-secondary-foreground", ctaClasses),
          })
        )}
      >
        <GitHubLogo />
        GitHub repo
      </a>
    </NodeViewWrapper>
  )
}

function DocsCtaView() {
  return (
    <NodeViewWrapper className="flex flex-wrap items-center gap-3">
      <ReadDocsLink />
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
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.9,
      allowNestedScroll: true,
      autoRaf: true,
    })
    return () => lenis.destroy()
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
    <main className="landing-page overflow-x-clip bg-background font-sans text-foreground">
      <LandingEditor
        extensions={landingExtensions}
        initialContent={initialContent}
        fallback={
          <div className="ProseMirror">
            {renderLandingContent(initialContent)}
          </div>
        }
        onEditorReady={onEditorReady}
        actions={
          <>
            <a
              data-slot="button"
              href={githubRepositoryUrl}
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
              aria-label="GitHub repo"
              title="GitHub repo"
            >
              <GitHubLogo className="size-3.5" />
            </a>
            <LandingThemeSwitch />
          </>
        }
        transport={transport}
      />

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
