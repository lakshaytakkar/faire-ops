"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sparkles, Send, Bot, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AiEmployee {
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

interface AiConversation {
  id: string
  ai_employee_id: string
  title: string
  created_at: string
}

interface AiMessage {
  id: string
  conversation_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AiTeamPage() {
  const [employees, setEmployees] = useState<AiEmployee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<AiEmployee | null>(null)
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
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

  /* ---- Fetch AI employees ---- */
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
      // Auto-select the latest conversation or start fresh
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

    // Optimistic user message
    const tempUserMsg: AiMessage = {
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

      // If a new conversation was created, update the state
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

      // Add AI response
      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        conversation_id: data.conversation_id,
        role: "assistant",
        content: data.response,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error("Send error:", err)
      // Add error message
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
  function startNewChat(emp: AiEmployee) {
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
    <div className="flex h-full overflow-hidden">
      {/* ================================================================ */}
      {/*  Left sidebar — AI Employee list                                  */}
      {/* ================================================================ */}
      <aside className="w-72 shrink-0 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h2 className="text-sm font-semibold">AI Team</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search AI employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredEmployees.map((emp) => {
            const isSelected = selectedEmployee?.id === emp.id
            return (
              <button
                key={emp.id}
                onClick={() => startNewChat(emp)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                  isSelected ? "bg-muted" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {emp.avatar_url ? (
                    <img
                      src={emp.avatar_url}
                      alt={emp.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <span className="text-[11px] font-semibold text-violet-400">
                        {getInitials(emp.name)}
                      </span>
                    </div>
                  )}
                  {/* Online dot */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background bg-emerald-500" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{emp.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{emp.role}</p>
                </div>

                {/* Skills count badge */}
                {emp.skills && emp.skills.length > 0 && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-violet-500/15 text-violet-400">
                    {emp.skills.length} skills
                  </span>
                )}
              </button>
            )
          })}

          {filteredEmployees.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Bot className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No AI employees found</p>
            </div>
          )}
        </div>

        {/* Conversations for selected employee */}
        {selectedEmployee && conversations.length > 0 && (
          <div className="border-t max-h-48 overflow-y-auto">
            <div className="px-4 py-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Recent conversations
              </p>
            </div>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full text-left px-4 py-1.5 text-xs truncate hover:bg-muted/60 transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ================================================================ */}
      {/*  Right main area — Chat                                           */}
      {/* ================================================================ */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedEmployee ? (
          <>
            {/* Header */}
            <header className="shrink-0 h-14 border-b flex items-center gap-3 px-5">
              {selectedEmployee.avatar_url ? (
                <img
                  src={selectedEmployee.avatar_url}
                  alt={selectedEmployee.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-violet-400">
                    {getInitials(selectedEmployee.name)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{selectedEmployee.name}</h3>
                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-500/20 text-violet-400 uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{selectedEmployee.role}</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && !sending && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-violet-500" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">
                    Start a conversation with {selectedEmployee.name}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {selectedEmployee.role} &mdash; Ask anything about Suprans Wholesale operations.
                  </p>
                  {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 justify-center max-w-md">
                      {selectedEmployee.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === "user"
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar (AI only) */}
                    {!isUser && (
                      <div className="shrink-0 relative">
                        {selectedEmployee.avatar_url ? (
                          <img
                            src={selectedEmployee.avatar_url}
                            alt={selectedEmployee.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <span className="text-[9px] font-semibold text-violet-400">
                              {getInitials(selectedEmployee.name)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-[70%] rounded-xl px-3.5 py-2.5 ${
                        isUser
                          ? "bg-blue-600 text-white"
                          : "bg-muted"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold">{selectedEmployee.name}</span>
                          <span className="px-1 py-px text-[8px] font-bold rounded bg-violet-500/20 text-violet-400 uppercase">
                            AI
                          </span>
                        </div>
                      )}
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isUser ? "text-blue-200" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Thinking indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {selectedEmployee.avatar_url ? (
                      <img
                        src={selectedEmployee.avatar_url}
                        alt={selectedEmployee.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <span className="text-[9px] font-semibold text-violet-400">
                          {getInitials(selectedEmployee.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold">{selectedEmployee.name}</span>
                      <span className="px-1 py-px text-[8px] font-bold rounded bg-violet-500/20 text-violet-400 uppercase">
                        AI
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                      <span className="text-[11px] text-muted-foreground ml-1.5">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t px-5 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedEmployee.name}...`}
                  rows={1}
                  className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 max-h-32"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="shrink-0 w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
              <Sparkles className="w-10 h-10 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold mb-1">AI Team</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select an AI employee from the sidebar to start a conversation. Each AI team member is
              specialized for different aspects of Suprans Wholesale operations.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
