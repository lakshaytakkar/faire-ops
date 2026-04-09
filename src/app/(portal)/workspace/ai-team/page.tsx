"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Users, Send, Search, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RemoteEmployee {
  id: string
  name: string
  role: string
  avatar_url: string | null
  system_prompt: string | null
  personality: string | null
  skills: string[]
  status: string
  messages_handled: number
}

interface RemoteConversation {
  id: string
  ai_employee_id: string
  title: string
  created_at: string
}

interface RemoteMessage {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CURRENT_USER = "Lakshay"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString()
}

function isSameGroup(prev: RemoteMessage, curr: RemoteMessage): boolean {
  if (prev.role !== curr.role) return false
  const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
  return diff < 5 * 60 * 1000
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function RemoteTeamPage() {
  const [employees, setEmployees] = useState<RemoteEmployee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<RemoteEmployee | null>(null)
  const [conversations, setConversations] = useState<RemoteConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<RemoteMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* ---- Scroll to bottom ---- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, scrollToBottom])

  /* ---- Auto-resize textarea ---- */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"
    }
  }, [draft])

  /* ---- Fetch remote employees ---- */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, name, role, avatar_url, system_prompt, personality, skills, status, messages_handled")
        .order("name")
      if (data) setEmployees(data)
    }
    load()
  }, [])

  /* ---- Fetch conversations when employee selected ---- */
  useEffect(() => {
    if (!selectedEmployee) return
    async function loadConvos() {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, ai_employee_id, title, created_at")
        .eq("ai_employee_id", selectedEmployee!.id)
        .order("created_at", { ascending: false })
        .limit(20)
      setConversations(data ?? [])
      if (data && data.length > 0) {
        setActiveConversationId(data[0].id)
      } else {
        setActiveConversationId(null)
        setMessages([])
      }
    }
    loadConvos()
  }, [selectedEmployee])

  /* ---- Fetch messages when conversation changes ---- */
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }
    async function loadMessages() {
      const { data } = await supabase
        .from("ai_messages")
        .select("id, conversation_id, role, content, created_at")
        .eq("conversation_id", activeConversationId!)
        .order("created_at", { ascending: true })
      setMessages(data ?? [])
    }
    loadMessages()
  }, [activeConversationId])

  /* ---- Send message ---- */
  async function handleSend() {
    const text = draft.trim()
    if (!text || !selectedEmployee || sending) return

    setSending(true)
    setDraft("")

    const tempUserMsg: RemoteMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId ?? "",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_employee_id: selectedEmployee.id,
          conversation_id: activeConversationId,
          message: text,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get response")
      }

      if (!activeConversationId && data.conversation_id) {
        setActiveConversationId(data.conversation_id)
        setConversations((prev) => [
          {
            id: data.conversation_id,
            ai_employee_id: selectedEmployee.id,
            title: text.slice(0, 80),
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      const replyMsg: RemoteMessage = {
        id: `reply-${Date.now()}`,
        conversation_id: data.conversation_id,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, replyMsg])
    } catch (err) {
      console.error("Send error:", err)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversation_id: activeConversationId ?? "",
          role: "assistant",
          content: "[Error: Failed to get a response. Please try again.]",
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  /* ---- Key handler ---- */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ---- Start new conversation ---- */
  function startNewChat(emp: RemoteEmployee) {
    setSelectedEmployee(emp)
    setActiveConversationId(null)
    setMessages([])
    setDraft("")
    inputRef.current?.focus()
  }

  /* ---- Filter employees ---- */
  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="h-[calc(100vh-120px)] flex rounded-lg border bg-card overflow-hidden">
        {/* ======== Left Sidebar ======== */}
        <div className="w-72 border-r flex flex-col bg-card">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Remote Team
            </h3>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded border pl-8 pr-3 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Employee list */}
          <div className="overflow-y-auto px-2 space-y-0.5 pb-2">
            {filteredEmployees.map((emp) => {
              const isSelected = selectedEmployee?.id === emp.id
              return (
                <button
                  key={emp.id}
                  onClick={() => startNewChat(emp)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    {emp.avatar_url ? (
                      <img
                        src={emp.avatar_url}
                        alt={emp.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {getInitials(emp.name)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{emp.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{emp.role}</span>
                  </div>
                </button>
              )
            })}

            {filteredEmployees.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No employees found</p>
              </div>
            )}
          </div>

          {/* Recent conversations for selected employee */}
          {selectedEmployee && conversations.length > 0 && (
            <div className="border-t max-h-48 overflow-y-auto">
              <div className="px-4 pt-3 pb-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Recent
                </h3>
              </div>
              <div className="px-2 space-y-0.5 pb-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors cursor-pointer ${
                      activeConversationId === conv.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======== Right Main Area ======== */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedEmployee ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b flex items-center gap-3">
                <div className="relative shrink-0">
                  {selectedEmployee.avatar_url ? (
                    <img
                      src={selectedEmployee.avatar_url}
                      alt={selectedEmployee.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {getInitials(selectedEmployee.name)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{selectedEmployee.name}</div>
                  <p className="text-xs text-muted-foreground truncate">{selectedEmployee.role}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
                {messages.length === 0 && !sending && (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Start a conversation with {selectedEmployee.name}
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null
                  const showDateSep = !prev || isDifferentDay(prev.created_at, msg.created_at)
                  const grouped = prev && !showDateSep && isSameGroup(prev, msg)
                  const isUser = msg.role === "user"
                  const senderName = isUser ? CURRENT_USER : selectedEmployee.name
                  const senderAvatar = isUser ? null : selectedEmployee.avatar_url

                  return (
                    <div key={msg.id}>
                      {/* Date Separator */}
                      {showDateSep && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs font-medium text-muted-foreground">{formatDate(msg.created_at)}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}

                      {/* Message */}
                      <div
                        className={`relative group flex gap-3 items-start rounded-md transition-colors ${
                          grouped ? "py-0.5 pl-11" : "py-2"
                        } hover:bg-muted/30`}
                      >
                        {/* Avatar (only for first in group) */}
                        {!grouped && (
                          <div className="shrink-0">
                            {senderAvatar ? (
                              <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {getInitials(senderName)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {!grouped && (
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold">{senderName}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                            </div>
                          )}
                          <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {sending && (
                  <div className="relative flex gap-3 items-start py-2">
                    <div className="shrink-0">
                      {selectedEmployee.avatar_url ? (
                        <img
                          src={selectedEmployee.avatar_url}
                          alt={selectedEmployee.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {getInitials(selectedEmployee.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{selectedEmployee.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                        <span className="text-xs text-muted-foreground ml-1.5">typing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="px-5 py-3 border-t flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedEmployee.name}...`}
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-[120px] rounded-lg border px-4 py-2.5 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-1">Remote Team</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a team member from the sidebar to start a conversation. Each employee is
                  specialized for different aspects of Suprans Wholesale operations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
