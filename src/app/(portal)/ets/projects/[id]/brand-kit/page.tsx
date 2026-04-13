"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Palette, FileUp, Trash2, ExternalLink, Send } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEmptyState, formatDate } from "@/app/(portal)/ets/_components/ets-ui"

interface ProjectFile {
  id: string
  client_id: string
  category: string
  filename: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  version: number
  uploaded_by: string | null
  notes: string | null
  uploaded_at: string
}

interface ChatMessage {
  id: string
  client_id: string
  thread: string
  author_side: "admin" | "client"
  author_name: string | null
  body: string | null
  file_id: string | null
  created_at: string
}

const BRAND_SLOTS = [
  "Logo (primary)",
  "Logo (mono)",
  "Storefront signage",
  "Exterior render",
  "Interior render",
  "Carry bag artwork",
  "Banner artwork",
  "Visiting card",
  "Display POSM",
  "Checkout artwork",
]

export default function ProjectBrandKitPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: f }, { data: m }] = await Promise.all([
      supabaseEts
        .from("project_files")
        .select("*")
        .eq("client_id", clientId)
        .eq("category", "brand")
        .order("uploaded_at", { ascending: false }),
      supabaseEts
        .from("project_chat_messages")
        .select("*")
        .eq("client_id", clientId)
        .eq("thread", "brand-kit")
        .order("created_at", { ascending: true }),
    ])
    setFiles((f ?? []) as ProjectFile[])
    setMessages((m ?? []) as ChatMessage[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  async function attachUrl() {
    const url = prompt("Paste asset URL (any public-accessible link):")?.trim()
    if (!url) return
    const filename = url.split("/").pop() ?? "asset"
    const slot = prompt(`Asset name [${BRAND_SLOTS[0]}]:`, BRAND_SLOTS[0])?.trim() || filename
    const { data } = await supabaseEts
      .from("project_files")
      .insert({
        client_id: clientId,
        category: "brand",
        filename: slot,
        storage_path: url,
        notes: filename,
      })
      .select()
      .single()
    if (data) setFiles((fs) => [data as ProjectFile, ...fs])
  }

  async function removeFile(id: string) {
    if (!confirm("Remove this asset?")) return
    setFiles((fs) => fs.filter((f) => f.id !== id))
    await supabaseEts.from("project_files").delete().eq("id", id)
  }

  async function sendMessage() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    const { data } = await supabaseEts
      .from("project_chat_messages")
      .insert({
        client_id: clientId,
        thread: "brand-kit",
        author_side: "admin",
        author_name: "Designer",
        body,
      })
      .select()
      .single()
    if (data) setMessages((ms) => [...ms, data as ChatMessage])
  }

  if (loading) {
    return <div className="h-64 rounded-lg bg-muted animate-pulse" />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Brand assets</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {files.length} of {BRAND_SLOTS.length} slots filled
              </p>
            </div>
            <button
              onClick={attachUrl}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <FileUp className="size-3.5" /> Attach asset
            </button>
          </div>
          {files.length === 0 ? (
            <div className="p-8">
              <EtsEmptyState
                icon={Palette}
                title="No brand assets yet"
                description="Upload signage, exterior renders, bags, banners, etc. — they appear on the client's brand kit page."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {files.map((f) => (
                <div key={f.id} className="rounded-md border bg-background overflow-hidden group">
                  <a
                    href={f.storage_path}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square bg-muted relative"
                  >
                    {f.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.storage_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.storage_path}
                        alt={f.filename}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-muted-foreground">
                        <FileUp className="size-8" />
                      </div>
                    )}
                  </a>
                  <div className="p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{f.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(f.uploaded_at)} · v{f.version}
                      </div>
                    </div>
                    <a
                      href={f.storage_path}
                      target="_blank"
                      rel="noreferrer"
                      className="size-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center"
                      aria-label="Open"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="size-6 rounded hover:bg-muted text-muted-foreground flex items-center justify-center"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card shadow-sm p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Slot reference
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {BRAND_SLOTS.map((slot) => (
              <div key={slot} className="px-2 py-1.5 rounded border bg-background">
                {slot}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm flex flex-col h-[600px]">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Chat — Brand kit</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discuss creative changes with the client.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No messages yet.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.author_side === "admin" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.author_side === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.author_name && (
                    <div className="text-xs font-semibold mb-0.5 opacity-70">
                      {m.author_name}
                    </div>
                  )}
                  <div>{m.body}</div>
                  <div className="text-xs opacity-60 mt-1">{formatDate(m.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-3 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type a message…"
            className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
