"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Send, MessageSquare } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { EtsEmptyState, formatDate } from "@/app/(portal)/ets/_components/ets-ui"

interface ChatMessage {
  id: string
  thread: string
  author_side: "admin" | "client"
  author_name: string | null
  body: string | null
  created_at: string
}

const THREADS = [
  { id: "general", label: "General" },
  { id: "brand-kit", label: "Brand kit" },
  { id: "layout-guide", label: "Layout" },
]

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [thread, setThread] = useState("general")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseEts
      .from("project_chat_messages")
      .select("id, thread, author_side, author_name, body, created_at")
      .eq("client_id", clientId)
      .eq("thread", thread)
      .order("created_at", { ascending: true })
    setMessages((data ?? []) as ChatMessage[])
    setLoading(false)
  }, [clientId, thread])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, thread, load])

  async function sendMessage() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    const { data } = await supabaseEts
      .from("project_chat_messages")
      .insert({
        client_id: clientId,
        thread,
        author_side: "admin",
        author_name: "Admin",
        body,
      })
      .select("id, thread, author_side, author_name, body, created_at")
      .single()
    if (data) setMessages((ms) => [...ms, data as ChatMessage])
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm flex flex-col h-[640px]">
      <div className="border-b">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold">Chat with client</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch threads to read or post in a specific topic.
          </p>
        </div>
        <div className="flex items-center gap-0 px-2 overflow-x-auto">
          {THREADS.map((t) => {
            const isActive = thread === t.id
            return (
              <button
                key={t.id}
                onClick={() => setThread(t.id)}
                className={`relative px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-32 rounded bg-muted animate-pulse" />
        ) : messages.length === 0 ? (
          <EtsEmptyState
            icon={MessageSquare}
            title="No messages yet"
            description={`No messages in the "${THREADS.find((t) => t.id === thread)?.label}" thread.`}
          />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.author_side === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  m.author_side === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.author_name && (
                  <div className="text-xs font-semibold mb-0.5 opacity-70">{m.author_name}</div>
                )}
                <div className="whitespace-pre-wrap">{m.body}</div>
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
          placeholder={`Message in ${THREADS.find((t) => t.id === thread)?.label}…`}
          className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          <Send className="size-3.5" /> Send
        </button>
      </div>
    </div>
  )
}
