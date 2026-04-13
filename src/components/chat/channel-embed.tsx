"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Send, Paperclip, X, Download, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Attachment {
  url: string
  path: string
  name: string
  size: number
  type: string
}

interface ChatMessage {
  id: string
  channel_id: string
  sender_name: string
  body: string
  created_at: string
  message_type?: string | null
  attachments?: Attachment[] | null
  reply_to?: string | null
  edited_at?: string | null
  is_deleted?: boolean | null
  __pending?: boolean
}

interface Channel {
  id: string
  name: string
  description: string | null
  channel_kind: string | null
  project_id: string | null
}

const BUCKET = "chat-attachments"

interface ChannelEmbedProps {
  channelId?: string
  projectId?: string | null
  channelKind?: string
  /** Display name to attribute new messages to (defaults to "Designer"). */
  senderName?: string
  height?: string
  showHeader?: boolean
  emptyHint?: string
}

/**
 * Embeddable chat channel — same component is used by the workspace chat
 * page AND by per-feature widgets (admin's brand-kit, layout-guide, and the
 * client portal mirrors). Reads/writes the shared public.chat_* tables and
 * subscribes to realtime updates.
 *
 * Pass either `channelId` directly OR `(projectId, channelKind)` to resolve
 * the canonical channel for a project.
 */
export function ChannelEmbed({
  channelId: providedId,
  projectId,
  channelKind,
  senderName = "Designer",
  height = "100%",
  showHeader = true,
  emptyHint = "No messages yet — say hi.",
}: ChannelEmbedProps) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      setLoading(true)
      let id = providedId
      let resolved: Channel | null = null
      if (!id && projectId && channelKind) {
        const { data } = await supabase
          .from("chat_channels")
          .select("*")
          .eq("project_id", projectId)
          .eq("channel_kind", channelKind)
          .maybeSingle()
        if (cancelled) return
        if (data) {
          resolved = data as Channel
          id = data.id
        }
      } else if (id) {
        const { data } = await supabase
          .from("chat_channels")
          .select("*")
          .eq("id", id)
          .maybeSingle()
        if (cancelled) return
        if (data) resolved = data as Channel
      }
      setChannel(resolved)
      if (!id) {
        setMessages([])
        setLoading(false)
        return
      }
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(200)
      if (cancelled) return
      setMessages((msgs ?? []) as ChatMessage[])
      setLoading(false)
    }
    resolve()
    return () => {
      cancelled = true
    }
  }, [providedId, projectId, channelKind])

  useEffect(() => {
    if (!channel?.id) return
    const sub = supabase
      .channel(`chat:${channel.id}`)
      .on(
        // @ts-expect-error supabase-js v2 typings don't include "postgres_changes" in the public overloads
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload: { new: ChatMessage; eventType: string; old: { id: string } }) => {
          if (payload.eventType === "INSERT") {
            setMessages((m) => {
              if (m.some((x) => x.id === payload.new.id)) return m
              return [...m, payload.new]
            })
          } else if (payload.eventType === "UPDATE") {
            setMessages((m) =>
              m.map((x) => (x.id === payload.new.id ? payload.new : x)),
            )
          } else if (payload.eventType === "DELETE") {
            setMessages((m) => m.filter((x) => x.id !== payload.old.id))
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(sub)
    }
  }, [channel?.id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const send = useCallback(async () => {
    if (!channel?.id) return
    const body = draft.trim()
    if (!body && pending.length === 0) return
    const tempId = `tmp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      channel_id: channel.id,
      sender_name: senderName,
      body,
      created_at: new Date().toISOString(),
      attachments: pending,
      __pending: true,
    }
    setMessages((m) => [...m, optimistic])
    setDraft("")
    const attachments = pending
    setPending([])
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channel.id,
        sender_name: senderName,
        body,
        message_type: "text",
        attachments,
        reply_to: null,
        is_deleted: false,
        space_slug: "ets",
      })
      .select()
      .single()
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== tempId))
      return
    }
    setMessages((m) =>
      m.map((x) => (x.id === tempId ? (data as ChatMessage) : x)),
    )
  }, [channel?.id, draft, pending, senderName])

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploads: Attachment[] = []
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = `admin/${Date.now()}-${safeName}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) {
          console.error("upload failed:", upErr.message)
          continue
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        uploads.push({
          url: pub.publicUrl,
          path,
          name: file.name,
          size: file.size,
          type: file.type,
        })
      }
      setPending((p) => [...p, ...uploads])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-lg border bg-card animate-pulse"
        style={{ height }}
      />
    )
  }

  if (!channel) {
    return (
      <div
        className="rounded-lg border bg-card flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Channel not configured.
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border bg-card shadow-sm flex flex-col overflow-hidden"
      style={{ height }}
    >
      {showHeader && (
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold truncate">{channel.name}</h3>
          {channel.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {channel.description}
            </p>
          )}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {emptyHint}
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_name === senderName
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  } ${m.__pending ? "opacity-60" : ""}`}
                >
                  {!isMine && (
                    <div className="text-xs font-semibold mb-0.5 opacity-70">
                      {m.sender_name}
                    </div>
                  )}
                  {m.body && (
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  )}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.attachments.map((a) => (
                        <AttachmentPill key={a.path} a={a} />
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      {pending.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t">
          {pending.map((a) => (
            <span
              key={a.path}
              className="inline-flex items-center gap-1 h-6 px-2 rounded bg-muted text-xs"
            >
              {a.name}
              <button
                onClick={() => setPending((p) => p.filter((x) => x.path !== a.path))}
                className="hover:opacity-70"
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="border-t p-3 flex items-end gap-2">
        <input
          type="file"
          ref={fileRef}
          onChange={(e) => handleFile(e.target.files)}
          className="hidden"
          multiple
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="size-9 rounded-md border bg-background hover:bg-muted text-muted-foreground inline-flex items-center justify-center disabled:opacity-60"
          aria-label="Attach"
        >
          <Paperclip className="size-4" />
        </button>
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Type a message…"
          className="flex-1 min-h-9 max-h-32 rounded-md border bg-background px-3 py-1.5 text-sm resize-none"
        />
        <button
          onClick={send}
          disabled={!draft.trim() && pending.length === 0}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          <Send className="size-3.5" /> Send
        </button>
      </div>
    </div>
  )
}

function AttachmentPill({ a }: { a: Attachment }) {
  const isImage =
    a.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(a.url)
  if (isImage) {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          src={a.url}
          alt={a.name}
          className="max-w-[200px] max-h-[200px] rounded border object-cover"
        />
      </a>
    )
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded border bg-background text-xs hover:bg-muted"
    >
      <FileText className="size-3.5" />
      <span className="truncate max-w-[180px]">{a.name}</span>
      <Download className="size-3 opacity-60" />
    </a>
  )
}
