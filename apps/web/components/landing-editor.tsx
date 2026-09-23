"use client"

import type { EmendTransport } from "@emend/ai"
import { useEditorAi } from "@emend/ai/react"
import { EmendAi } from "@emend/ai/tiptap"
import type { Editor, Extensions, JSONContent } from "@tiptap/core"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TableKit } from "@tiptap/extension-table"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useMemo, useState, type ReactNode } from "react"

import { AiBubbleMenuView } from "@/components/emend/ai-bubble-menu"
import {
  AiComposerView,
  type AiComposerPolicy,
} from "@/components/emend/ai-composer"
import { AiSideChatView } from "@/components/emend/ai-side-chat"

import { LandingEditorToolbar } from "./landing-editor-toolbar"
import { landingMention } from "./landing-mention"

/**
 * The landing document holds a custom call-to-action node and a hero line
 * break, neither of which survives the AI runtime's Markdown round trip.
 * Reading the block around the cursor is the scope that works for the copy.
 */
const composerPolicy = {
  allowedContextScopes: ["current-block", "selection"],
  defaultContextScope: "current-block",
} satisfies AiComposerPolicy

const editorContentClasses = [
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
  "[&_.ProseMirror]:mx-auto [&_.ProseMirror]:min-h-full [&_.ProseMirror]:max-w-[720px] [&_.ProseMirror]:px-0 [&_.ProseMirror]:pt-32 [&_.ProseMirror]:pb-40",
  "[&_.ProseMirror]:font-sans [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-[1.6] [&_.ProseMirror]:text-foreground [&_.ProseMirror]:outline-none",
  "max-md:[&_.ProseMirror]:px-6 max-md:[&_.ProseMirror]:pt-16 max-md:[&_.ProseMirror]:pb-32 max-md:[&_.ProseMirror]:text-base",
  "[&_.ProseMirror]:before:mb-6 [&_.ProseMirror]:before:block [&_.ProseMirror]:before:size-11",
  "[&_.ProseMirror]:before:bg-[url('/emend-logo.svg')] [&_.ProseMirror]:before:bg-center [&_.ProseMirror]:before:bg-no-repeat [&_.ProseMirror]:before:content-['']",
  "[&_.ProseMirror>*+*]:mt-4",
  "[&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-[clamp(2.25rem,_4vw,_2.5rem)] [&_.ProseMirror_h1]:leading-[1.12] [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:tracking-[-0.01em] [&_.ProseMirror_h1]:text-balance",
  "max-md:[&_.ProseMirror_h1]:text-3xl",
  "[&_.ProseMirror_h1_strong]:rounded-sm [&_.ProseMirror_h1_strong]:bg-primary/15 [&_.ProseMirror_h1_strong]:font-semibold",
  "[&_.ProseMirror_h2]:mt-28 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:leading-[1.2] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:tracking-[-0.01em] [&_.ProseMirror_h2]:text-balance",
  "max-md:[&_.ProseMirror_h2]:mt-24 max-md:[&_.ProseMirror_h2]:text-xl",
  "[&_.ProseMirror_h2_strong]:bg-chart-1/50 [&_.ProseMirror_h2_strong]:font-semibold",
  "[&_.ProseMirror_h3]:mt-12 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold",
  "[&_.ProseMirror_h4]:mt-10 [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:font-semibold",
  "[&_.ProseMirror_h5]:mt-8 [&_.ProseMirror_h5]:text-base [&_.ProseMirror_h5]:font-semibold",
  "[&_.ProseMirror_h6]:mt-8 [&_.ProseMirror_h6]:text-sm [&_.ProseMirror_h6]:font-semibold",
  "[&_.ProseMirror_p]:text-pretty",
  "[&_.ProseMirror_ul]:mt-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-[1.4rem]",
  "[&_.ProseMirror_ol]:mt-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-[1.4rem] [&_.ProseMirror_li+li]:mt-1",
  "[&_.ProseMirror_ul[data-type=taskList]]:mt-4 [&_.ProseMirror_ul[data-type=taskList]]:flex [&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:flex-col [&_.ProseMirror_ul[data-type=taskList]]:gap-1.5 [&_.ProseMirror_ul[data-type=taskList]]:pl-0",
  "[&_.ProseMirror_ul[data-type=taskList]>li]:flex [&_.ProseMirror_ul[data-type=taskList]>li]:items-baseline [&_.ProseMirror_ul[data-type=taskList]>li]:gap-2 [&_.ProseMirror_ul[data-type=taskList]>li+li]:mt-0 [&_.ProseMirror_ul[data-type=taskList]>li>div]:flex-1",
  "[&_.ProseMirror_input[type=checkbox]]:accent-primary",
  "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:decoration-1 [&_.ProseMirror_a]:underline-offset-3",
  "[&_.ProseMirror_code]:rounded-sm [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-[0.9em]",
  "[&_.ProseMirror_hr]:my-24 [&_.ProseMirror_hr]:border-border",
  "[&_.ProseMirror_pre]:mt-6 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-border [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-6 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-[13px] [&_.ProseMirror_pre]:leading-[1.7]",
  "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0",
  "[&_.ProseMirror_blockquote]:mt-6 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-5 [&_.ProseMirror_blockquote]:text-muted-foreground",
  "[&_.ProseMirror_img]:mt-6 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
  "[&_.ProseMirror_img.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_img.ProseMirror-selectednode]:outline-offset-2 [&_.ProseMirror_img.ProseMirror-selectednode]:outline-ring",
  "[&_.ProseMirror_.tableWrapper]:overflow-x-auto [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse",
  "[&_.ProseMirror_th]:min-w-28 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:text-left",
  "[&_.ProseMirror_td]:min-w-28 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_td]:align-top",
  "[&_.ProseMirror>.react-renderer]:mt-6",
].join(" ")

export function LandingEditor({
  actions,
  extensions,
  initialContent,
  onEditorReady,
  transport,
}: {
  readonly actions?: ReactNode
  readonly extensions?: Extensions
  readonly initialContent: JSONContent
  readonly onEditorReady?: (editor: Editor) => void
  readonly transport: EmendTransport
}) {
  const [sideChatOpen, setSideChatOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const configuredExtensions = useMemo(
    () => [
      StarterKit.configure({ link: { openOnClick: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
      Image,
      FindAndReplace.configure({ injectCSS: false, searchDebounceMs: 0 }),
      landingMention,
      Markdown.configure({ markedOptions: { gfm: true } }),
      EmendAi,
      ...(extensions ?? []),
    ],
    [extensions]
  )
  const editor = useEditor({
    content: initialContent,
    extensions: configuredExtensions,
    immediatelyRender: false,
    onCreate: ({ editor: currentEditor }) => onEditorReady?.(currentEditor),
  })

  return (
    <section className="emend-landing-editor flex h-full w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      {editor && (
        <LandingEditorToolbar
          editor={editor}
          actions={actions}
          composerOpen={composerOpen}
          sideChatOpen={sideChatOpen}
          onToggleComposer={() => setComposerOpen((open) => !open)}
          onToggleSideChat={() => setSideChatOpen((open) => !open)}
        />
      )}
      {editor && (
        <LandingAiWorkspace
          editor={editor}
          transport={transport}
          composerOpen={composerOpen}
          sideChatOpen={sideChatOpen}
          onCloseSideChat={() => setSideChatOpen(false)}
        />
      )}
    </section>
  )
}

function LandingAiWorkspace({
  editor,
  transport,
  composerOpen,
  sideChatOpen,
  onCloseSideChat,
}: {
  readonly editor: Editor
  readonly transport: EmendTransport
  readonly composerOpen: boolean
  readonly sideChatOpen: boolean
  readonly onCloseSideChat: () => void
}) {
  const session = useEditorAi({ editor, transport, previewMode: "inline" })

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <EditorContent editor={editor} className={editorContentClasses} />
        {composerOpen && (
          <div className="shrink-0 border-t border-border bg-muted/40 px-3 py-3">
            <div className="mx-auto w-full max-w-[720px]">
              <AiComposerView
                editor={editor}
                session={session}
                policy={composerPolicy}
              />
            </div>
          </div>
        )}
        <AiBubbleMenuView
          editor={editor}
          session={session}
          showReview={!composerOpen && !sideChatOpen}
        />
      </div>
      {sideChatOpen && (
        <AiSideChatView
          editor={editor}
          session={session}
          inline
          open
          onOpenChange={(open) => {
            if (!open) onCloseSideChat()
          }}
          panelClassName="w-[min(24rem,42vw)] shrink-0 border-l border-border pt-10 max-md:absolute max-md:inset-0 max-md:z-30 max-md:w-full max-md:border-l-0"
        />
      )}
    </div>
  )
}
