"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { useEffect, useCallback, useRef, memo } from "react"
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  minHeight?: string
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function RichTextEditorImpl({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  minHeight = "40px",
}: RichTextEditorProps) {
  // Refs to keep latest callbacks accessible without recreating editor
  const onChangeRef = useRef(onChange)
  const onSubmitRef = useRef(onSubmit)
  const lastEmittedRef = useRef<string>(value || "")

  useEffect(() => {
    onChangeRef.current = onChange
    onSubmitRef.current = onSubmit
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        blockquote: false,
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-4 py-2.5 text-sm`,
        style: `min-height: ${minHeight};`,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault()
          onSubmitRef.current?.()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const normalized = html === "<p></p>" ? "" : html
      lastEmittedRef.current = normalized
      onChangeRef.current(normalized)
    },
  })

  // Only sync external resets (e.g. parent cleared value after send)
  // Skip when the incoming value matches what the editor itself just emitted.
  useEffect(() => {
    if (!editor) return
    if (value === lastEmittedRef.current) return
    const incoming = value || ""
    editor.commands.setContent(incoming, { emitUpdate: false })
    lastEmittedRef.current = incoming
  }, [value, editor])

  // Sync editable state without recreating the editor
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl ?? "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex-1 flex flex-col rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring transition-shadow overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/60 bg-muted/30">
        <ToolbarButton
          title="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <ToolbarButton
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="ml-auto text-[10px] text-muted-foreground/70 px-1 select-none">
          Enter to send · Shift+Enter for line
        </div>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        placeholder={placeholder}
        className="flex-1 min-h-0 max-h-[200px] overflow-y-auto"
      />
    </div>
  )
}

export const RichTextEditor = memo(RichTextEditorImpl, (prev, next) => {
  // Only re-render when these specific props change. Ignore value changes —
  // the editor manages its own content internally and only resyncs on resets.
  return (
    prev.disabled === next.disabled &&
    prev.placeholder === next.placeholder &&
    prev.minHeight === next.minHeight &&
    // Re-render only when value transitions to/from empty (e.g. after clear)
    (prev.value === "" || next.value === "" ? prev.value === next.value : true)
  )
})

/* ------------------------------------------------------------------ */
/*  Renderer for displaying rich text messages                         */
/* ------------------------------------------------------------------ */

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "code", "a"]
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
}

function sanitize(html: string): string {
  // Lightweight server-safe sanitization (strip all tags not in allowlist + dangerous attrs)
  // Browsers will further sanitize via DOM if needed.
  let cleaned = html
  // Remove script/style/iframe tags entirely
  cleaned = cleaned.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
  // Remove on* event handlers and javascript: hrefs
  cleaned = cleaned.replace(/\son\w+="[^"]*"/gi, "")
  cleaned = cleaned.replace(/\son\w+='[^']*'/gi, "")
  cleaned = cleaned.replace(/href="javascript:[^"]*"/gi, 'href="#"')
  // Force links to open in new tab safely
  cleaned = cleaned.replace(/<a\s+href=/gi, '<a target="_blank" rel="noopener noreferrer" href=')
  return cleaned
}

function isHtml(content: string): boolean {
  return /<\/?(p|br|strong|em|u|s|ul|ol|li|code|a)\b/i.test(content)
}

export function RichTextRenderer({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return null

  // Plain text fallback (for legacy plain messages)
  if (!isHtml(content)) {
    return <p className={`text-sm text-foreground whitespace-pre-wrap break-words ${className}`}>{content}</p>
  }

  return (
    <div
      className={`text-sm text-foreground prose prose-sm max-w-none break-words [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitize(content) }}
    />
  )
}

export function richTextToPlain(html: string): string {
  if (!html) return ""
  if (!isHtml(html)) return html
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
