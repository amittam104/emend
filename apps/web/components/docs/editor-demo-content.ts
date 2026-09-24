import type { JSONContent } from "@tiptap/core"

type Inline = string | JSONContent

const text = (value: string, marks?: string[]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks ? { marks: marks.map((type) => ({ type })) } : {}),
})

const bold = (value: string) => text(value, ["bold"])
const italic = (value: string) => text(value, ["italic"])
const code = (value: string) => text(value, ["code"])

const inline = (parts: Inline[]): JSONContent[] =>
  parts.map((part) => (typeof part === "string" ? text(part) : part))

const heading = (level: 1 | 2 | 3, value: string): JSONContent => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
})

const paragraph = (...parts: Inline[]): JSONContent => ({
  type: "paragraph",
  content: inline(parts),
})

const bulletList = (...items: Inline[][]): JSONContent => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [paragraph(...item)],
  })),
})

const orderedList = (...items: Inline[][]): JSONContent => ({
  type: "orderedList",
  content: items.map((item) => ({
    type: "listItem",
    content: [paragraph(...item)],
  })),
})

const taskList = (...items: [boolean, string][]): JSONContent => ({
  type: "taskList",
  content: items.map(([checked, value]) => ({
    type: "taskItem",
    attrs: { checked },
    content: [paragraph(value)],
  })),
})

const blockquote = (...parts: Inline[]): JSONContent => ({
  type: "blockquote",
  content: [paragraph(...parts)],
})

const codeBlock = (value: string): JSONContent => ({
  type: "codeBlock",
  attrs: { language: "tsx" },
  content: [text(value)],
})

const table = (header: string[], ...rows: string[][]): JSONContent => ({
  type: "table",
  content: [
    {
      type: "tableRow",
      content: header.map((cell) => ({
        type: "tableHeader",
        content: [paragraph(cell)],
      })),
    },
    ...rows.map((row) => ({
      type: "tableRow",
      content: row.map((cell) => ({
        type: "tableCell",
        content: [paragraph(cell)],
      })),
    })),
  ],
})

const horizontalRule: JSONContent = { type: "horizontalRule" }

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
})

export const bubbleContent = doc(
  heading(1, "AI Bubble Menu"),
  paragraph(
    "The AI Bubble Menu appears when you select text. It keeps AI edits beside the words you are already working on, so you never leave the page to rewrite a sentence."
  ),
  blockquote(
    italic("Try it: "),
    "select this sentence and choose ",
    bold("Improve"),
    ". The proposal appears inline, with Keep and Discard right beside it."
  ),
  heading(2, "What it does"),
  bulletList(
    [
      bold("Selection-aware: "),
      "every action targets only the selected text. The rest of the document is untouched.",
    ],
    [
      bold("Inline review: "),
      "a completed proposal shows in place. ",
      bold("Keep"),
      " applies it as one undoable change; ",
      bold("Discard"),
      " removes it.",
    ],
    [
      bold("Custom instructions: "),
      "describe your own edit in the bar, such as “make this sound more confident”.",
    ],
    [
      bold("Stale protection: "),
      "if the document changes while a proposal is open, that proposal can no longer be kept.",
    ]
  ),
  heading(2, "Quick actions"),
  table(
    ["Action", "What it changes"],
    ["Improve", "Clarity, rhythm, and word choice"],
    ["Shorten", "Removes filler while keeping the meaning"],
    ["Expand", "Adds supporting detail to thin sentences"],
    ["Tone", "Rewrites in a friendlier or more formal voice"],
    ["Grammar", "Fixes spelling, punctuation, and agreement"]
  ),
  paragraph(
    "On narrow screens the compact bar moves extra actions behind the arrow. Expand it to see the full list."
  ),
  heading(2, "Practice on this paragraph"),
  paragraph(
    "Our team have been working really hard on the new release and we think that it is going to be very good for users because it has alot of improvements that they was asking for over the last few months."
  ),
  paragraph(
    "Select the paragraph above and choose ",
    bold("Grammar"),
    ", then try ",
    bold("Shorten"),
    " on the result. Use ",
    code("⌘Z"),
    " to undo any change you keep."
  ),
  heading(2, "Things to try"),
  taskList(
    [false, "Select a sentence and run a quick action"],
    [false, "Write a custom instruction in the bar"],
    [false, "Edit the document while a proposal is open to see it go stale"],
    [false, "Keep one proposal, then undo it"]
  )
)

export const baseContent = doc(
  heading(1, "Emend Editor"),
  paragraph(
    "This is the editor foundation with no AI attached: a Tiptap editor, a responsive toolbar, rich formatting, and a save boundary. Every AI starter builds on exactly this surface."
  ),
  heading(2, "Formatting you can use"),
  paragraph(
    "Text can be ",
    bold("bold"),
    ", ",
    italic("italic"),
    ", or ",
    code("inline code"),
    ". Select any word to open the formatting bubble, or use the toolbar above."
  ),
  bulletList(
    ["Headings, paragraphs, and horizontal rules"],
    ["Bulleted, numbered, and task lists"],
    ["Blockquotes and code blocks"],
    ["Tables with header rows"]
  ),
  blockquote(
    "Markdown shortcuts work too. Type ",
    code("## "),
    " for a heading or ",
    code("- [ ] "),
    " for a task."
  ),
  heading(2, "Included extensions"),
  table(
    ["Extension", "Adds"],
    ["StarterKit", "Core nodes, marks, history, and links"],
    ["TaskList", "Nested checklists"],
    ["TableKit", "Tables, headers, and cells"],
    ["Markdown", "GFM input and output"],
    ["CharacterCount", "The count in the footer"]
  ),
  heading(2, "Access the Tiptap editor"),
  codeBlock(
    `<EmendEditorBase\n  onEditorReady={(editor) => editor.commands.focus()}\n  onSave={(editor) => save(editor.getJSON())}\n/>`
  ),
  horizontalRule,
  taskList(
    [true, "Copy the editor into your app"],
    [false, "Connect onSave to your storage"],
    [false, "Add an AI surface when you are ready"]
  )
)

export const composerContent = doc(
  heading(1, "AI Composer"),
  paragraph(
    "AI Composer sits below the document as a persistent prompt and review surface. It answers questions, runs writing actions, and gives you explicit control over what the model may read and what an edit may replace."
  ),
  blockquote(
    italic("Try it: "),
    "type ",
    bold("“What is this document about?”"),
    " in the composer below. A plain prompt is an Ask. It returns an answer and never changes the text."
  ),
  heading(2, "Ask and Edit"),
  table(
    ["Request", "Reads", "Changes the document"],
    ["Ask", "Selection or document", "Never"],
    ["Built-in Edit", "Selection", "After you accept"],
    ["Custom Edit", "Chosen context", "After you accept"]
  ),
  heading(2, "Context and Change"),
  bulletList(
    [
      bold("Context"),
      " is read-only input: the selection, the current block, or the whole document.",
    ],
    [
      bold("Change"),
      " is the exact target an accepted proposal may replace, or an insertion at the cursor.",
    ],
    [
      "A ",
      code("policy"),
      " prop restricts which contexts and changes people can pick.",
    ]
  ),
  heading(2, "Practice on this paragraph"),
  paragraph(
    "Honestly the meeting could of been an email, but we did decide some things, mainly that the launch is moving to next month and design needs more time and also marketing wants a new landing page which nobody had budgeted for."
  ),
  orderedList(
    ["Select the paragraph above."],
    [
      "Open the ",
      code("/"),
      " or ",
      code("+"),
      " menu in the composer and choose an action.",
    ],
    [
      "Review the proposal, then choose ",
      bold("Accept"),
      " or ",
      bold("Reject"),
      ".",
    ]
  ),
  paragraph(
    "Accept stays unavailable while a proposal streams, when the schema blocks it, or when the document changed after the request."
  ),
  heading(2, "Things to try"),
  taskList(
    [false, "Ask a question about the draft"],
    [false, "Run a built-in Edit on a selection"],
    [false, "Change the Context and Change scopes"],
    [false, "Write a custom edit that inserts at the cursor"]
  )
)

export const assistantContent = doc(
  heading(1, "AI Assistant"),
  paragraph(
    "AI Assistant is a floating, document-aware chat. Each turn can ask about the draft or propose an edit, and follow-up questions carry the visible conversation into the next request."
  ),
  blockquote(
    italic("Try it: "),
    "open the round ",
    bold("AI Assistant"),
    " launcher in the bottom-right corner and ask, “What would make this draft clearer?”"
  ),
  heading(2, "What it does"),
  bulletList(
    [
      bold("Conversation: "),
      "follow-ups keep context, so you can challenge an answer or ask for an example.",
    ],
    [
      bold("Reviewable edits: "),
      "select text and choose an action. Every edit waits for Accept or Reject.",
    ],
    [
      bold("Chat history: "),
      "the latest 20 conversations are saved in this browser. Start fresh with ",
      bold("New chat"),
      ".",
    ],
    [
      bold("Stays open: "),
      "keep writing while the chat is open. Close it with the launcher, the close button, or Escape.",
    ]
  ),
  heading(2, "Edit actions"),
  table(
    ["Action", "Result"],
    ["Improve", "A clearer version of the selection"],
    ["Shorten", "The same point in fewer words"],
    ["Longer", "More supporting detail"],
    ["Fix grammar", "Corrected spelling and punctuation"],
    ["Tone", "Friendly, Professional, Confident, or Straightforward"],
    ["Custom instruction", "Anything you describe"]
  ),
  heading(2, "Practice on this note"),
  paragraph(
    "Imagine you are preparing a short note for a project team. The first paragraph explains the goal, but the middle buries the decision under background detail."
  ),
  paragraph(
    "After reviewing several vendor options over the past quarter and considering a range of factors including cost, support quality, and integration effort, along with feedback gathered from three teams, we have decided to move forward with the second proposal."
  ),
  paragraph(
    "Ask the assistant what feels unclear. Then select the long sentence above and ask for a version that leads with the decision."
  ),
  heading(2, "Things to try"),
  taskList(
    [false, "Ask a question, then send a follow-up"],
    [false, "Select a sentence and change its Tone"],
    [false, "Start a new chat and reopen the old one from history"],
    [false, "Reject a proposal and confirm nothing changed"]
  )
)
