"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Mail, Search, Star, Send, FileText, AlertTriangle, Trash2,
  Plus, ChevronDown, X, ArrowLeft, Reply, MoreVertical,
  Inbox as InboxIcon, Tag, Pencil, Check,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GmailAccount {
  id: string
  email: string
  display_name: string | null
  is_primary: boolean
  unread_count: number
  total_messages: number
}

interface GmailMessage {
  id: string
  account_id: string
  gmail_id: string
  thread_id: string | null
  subject: string | null
  sender: string | null
  sender_email: string | null
  recipients: string | null
  snippet: string | null
  body_text: string | null
  label_ids: string[] | null
  is_read: boolean
  is_starred: boolean
  has_attachment: boolean
  received_at: string | null
}

type Folder = "INBOX" | "STARRED" | "SENT" | "DRAFT" | "SPAM" | "TRASH"

interface ComposeState {
  open: boolean
  to: string
  cc: string
  showCc: boolean
  subject: string
  body: string
  replyTo: GmailMessage | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Use primary brand color instead of Gmail red
const ACCENT = "hsl(223 83% 53%)"

const FOLDERS: { key: Folder; label: string; icon: React.ElementType }[] = [
  { key: "INBOX", label: "Inbox", icon: InboxIcon },
  { key: "STARRED", label: "Starred", icon: Star },
  { key: "SENT", label: "Sent", icon: Send },
  { key: "DRAFT", label: "Drafts", icon: FileText },
  { key: "SPAM", label: "Spam", icon: AlertTriangle },
  { key: "TRASH", label: "Trash", icon: Trash2 },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHrs = diffMs / (1000 * 60 * 60)
  if (diffHrs < 1) return `${Math.max(1, Math.round(diffMs / 60000))}m ago`
  if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`
  if (diffHrs < 48) return "Yesterday"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function senderInitial(name: string | null) {
  if (!name) return "?"
  return name.charAt(0).toUpperCase()
}

function senderColor(name: string | null) {
  if (!name) return "#6b7280"
  const colors = ["#EA4335", "#4285F4", "#34A853", "#FBBC05", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function GmailPage() {
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<GmailAccount | null>(null)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState<Folder>("INBOX")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [compose, setCompose] = useState<ComposeState>({
    open: false, to: "", cc: "", showCc: false, subject: "", body: "", replyTo: null,
  })
  const [sending, setSending] = useState(false)

  /* ---- Fetch accounts ---- */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("gmail_accounts")
        .select("id, email, display_name, is_primary, unread_count, total_messages")
        .order("is_primary", { ascending: false })
      if (data && data.length > 0) {
        setAccounts(data)
        setActiveAccount(data[0])
      }
    }
    load()
  }, [])

  /* ---- Fetch messages ---- */
  const fetchMessages = useCallback(async () => {
    if (!activeAccount) return
    setLoading(true)
    let query = supabase
      .from("gmail_messages")
      .select("id, account_id, gmail_id, thread_id, subject, sender, sender_email, recipients, snippet, body_text, label_ids, is_read, is_starred, has_attachment, received_at")
      .eq("account_id", activeAccount.id)
      .order("received_at", { ascending: false })
      .limit(100)

    if (activeFolder === "STARRED") {
      query = query.eq("is_starred", true)
    } else {
      query = query.contains("label_ids", [activeFolder])
    }

    const { data } = await query
    setMessages(data ?? [])
    setLoading(false)
  }, [activeAccount, activeFolder])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  /* ---- Unread count per folder ---- */
  const unreadCount = useMemo(() => {
    return messages.filter((m) => !m.is_read).length
  }, [messages])

  /* ---- Filtered by search ---- */
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) =>
        m.subject?.toLowerCase().includes(q) ||
        m.sender?.toLowerCase().includes(q) ||
        m.snippet?.toLowerCase().includes(q)
    )
  }, [messages, searchQuery])

  /* ---- Toggle star ---- */
  async function toggleStar(msg: GmailMessage, e?: React.MouseEvent) {
    e?.stopPropagation()
    const newVal = !msg.is_starred
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_starred: newVal } : m)))
    await supabase.from("gmail_messages").update({ is_starred: newVal }).eq("id", msg.id)
  }

  /* ---- Toggle read ---- */
  async function toggleRead(msg: GmailMessage) {
    const newVal = !msg.is_read
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: newVal } : m)))
    await supabase.from("gmail_messages").update({ is_read: newVal }).eq("id", msg.id)
  }

  /* ---- Mark as read on open ---- */
  function openMessage(msg: GmailMessage) {
    setSelectedMessage(msg)
    if (!msg.is_read) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)))
      supabase.from("gmail_messages").update({ is_read: true }).eq("id", msg.id)
    }
  }

  /* ---- Toggle checkbox ---- */
  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ---- Compose helpers ---- */
  function openCompose() {
    setCompose({ open: true, to: "", cc: "", showCc: false, subject: "", body: "", replyTo: null })
  }

  function openReply(msg: GmailMessage) {
    setCompose({
      open: true,
      to: msg.sender_email ?? "",
      cc: "",
      showCc: false,
      subject: `Re: ${msg.subject ?? ""}`,
      body: "",
      replyTo: msg,
    })
  }

  async function handleSend() {
    if (!compose.to.trim() || !compose.subject.trim()) return
    setSending(true)
    try {
      await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: compose.to,
          cc: compose.cc || undefined,
          subject: compose.subject,
          body: compose.body,
          accountId: activeAccount?.id,
        }),
      })
      setCompose({ open: false, to: "", cc: "", showCc: false, subject: "", body: "", replyTo: null })
    } catch (err) {
      console.error("Send failed:", err)
    } finally {
      setSending(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-[hsl(220,20%,97%)] dark:bg-[hsl(225,30%,8%)]">
      {/* ---- Header ---- */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-white/80 dark:bg-white/5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-primary" />
          <span className="text-base font-bold font-heading">Email</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA4335]/30 focus:border-[#EA4335]/50 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Account dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-sm"
          >
            <div
              className="size-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: ACCENT }}
            >
              {activeAccount?.display_name?.charAt(0) ?? "?"}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{activeAccount?.email ?? ""}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {showAccountDropdown && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { setActiveAccount(acc); setShowAccountDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${acc.id === activeAccount?.id ? "bg-muted/30" : ""}`}
                >
                  <div
                    className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {acc.display_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{acc.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                  </div>
                  {acc.id === activeAccount?.id && <Check className="size-4 ml-auto text-green-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ---- Left Sidebar ---- */}
        <aside className="w-56 shrink-0 border-r border-border/40 bg-white/60 dark:bg-white/[0.02] flex flex-col py-3 overflow-y-auto">
          {/* Compose button */}
          <div className="px-3 mb-4">
            <button
              onClick={openCompose}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-white font-medium text-sm transition-colors hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <Pencil className="size-4" />
              Compose
            </button>
          </div>

          {/* Folders */}
          <nav className="flex flex-col gap-0.5 px-2">
            {FOLDERS.map((f) => {
              const isActive = activeFolder === f.key
              const Icon = f.icon
              return (
                <button
                  key={f.key}
                  onClick={() => { setActiveFolder(f.key); setSelectedMessage(null); setSelectedIds(new Set()) }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-r-full text-sm transition-all ${
                    isActive
                      ? "bg-[#EA4335]/10 text-[#EA4335] font-semibold"
                      : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-[#EA4335]" : ""}`} />
                  <span className="flex-1 text-left">{f.label}</span>
                  {f.key === "INBOX" && unreadCount > 0 && activeFolder === "INBOX" && (
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>{unreadCount}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Separator */}
          <div className="h-px bg-border/40 mx-4 my-3" />

          {/* Labels */}
          <div className="px-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
              <button className="p-0.5 rounded hover:bg-muted/50 transition-colors" title="New label">
                <Plus className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer">
                <Tag className="size-3" style={{ color: "#34A853" }} />
                <span>Important</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer">
                <Tag className="size-3" style={{ color: "#4285F4" }} />
                <span>Work</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer">
                <Tag className="size-3" style={{ color: "#FBBC05" }} />
                <span>Personal</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <main className="flex-1 flex min-w-0">
          {selectedMessage ? (
            /* ---- Message Detail ---- */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 shrink-0">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <h2 className="text-base font-semibold truncate flex-1">{selectedMessage.subject}</h2>
                <button
                  onClick={() => openReply(selectedMessage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors border border-border/40"
                >
                  <Reply className="size-3.5" /> Reply
                </button>
                <button
                  onClick={() => toggleStar(selectedMessage)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Star className={`size-4 ${selectedMessage.is_starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <MoreVertical className="size-4 text-muted-foreground" />
                </button>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  {/* Sender info */}
                  <div className="flex items-start gap-3 mb-6">
                    <div
                      className="size-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: senderColor(selectedMessage.sender) }}
                    >
                      {senderInitial(selectedMessage.sender)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">{selectedMessage.sender}</span>
                        <span className="text-xs text-muted-foreground">&lt;{selectedMessage.sender_email}&gt;</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        to {selectedMessage.recipients} &middot; {formatDate(selectedMessage.received_at)}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-white dark:bg-white/5 rounded-md border border-border/30 p-6">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {selectedMessage.body_text || selectedMessage.snippet || "No content"}
                    </p>
                  </div>

                  {/* Quick reply */}
                  <div className="mt-6">
                    <button
                      onClick={() => openReply(selectedMessage)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border/40 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors w-full"
                    >
                      <Reply className="size-4" />
                      Click here to reply...
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---- Message List ---- */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* List header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 shrink-0">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredMessages.length}
                  onChange={() => {
                    if (selectedIds.size === filteredMessages.length) setSelectedIds(new Set())
                    else setSelectedIds(new Set(filteredMessages.map((m) => m.id)))
                  }}
                  className="rounded border-border/50 accent-[#EA4335]"
                />
                <span className="text-xs text-muted-foreground">
                  {activeFolder === "INBOX" ? "Primary" : FOLDERS.find((f) => f.key === activeFolder)?.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="size-6 border-2 border-[#EA4335] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                    <InboxIcon className="size-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No messages in {FOLDERS.find((f) => f.key === activeFolder)?.label}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {activeFolder === "INBOX" ? "Your inbox is clean!" : "Nothing here yet."}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => openMessage(msg)}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/20 cursor-pointer transition-colors group ${
                        msg.is_read
                          ? "bg-transparent hover:bg-muted/30"
                          : "bg-white dark:bg-white/[0.03] hover:bg-muted/20"
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(msg.id)}
                        onChange={() => {}}
                        onClick={(e) => toggleSelect(msg.id, e)}
                        className="rounded border-border/50 accent-[#EA4335] shrink-0"
                      />

                      {/* Star */}
                      <button onClick={(e) => toggleStar(msg, e)} className="shrink-0 p-0.5">
                        <Star
                          className={`size-4 transition-colors ${
                            msg.is_starred
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40 hover:text-yellow-400"
                          }`}
                        />
                      </button>

                      {/* Sender avatar */}
                      <div
                        className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: senderColor(msg.sender) }}
                      >
                        {senderInitial(msg.sender)}
                      </div>

                      {/* Sender name */}
                      <span className={`w-36 truncate text-sm shrink-0 ${msg.is_read ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                        {msg.sender}
                      </span>

                      {/* Subject + snippet */}
                      <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                        <span className={`truncate text-sm ${msg.is_read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                          {msg.subject}
                        </span>
                        <span className="text-xs text-muted-foreground/60 truncate hidden md:inline">
                          — {msg.snippet}
                        </span>
                      </div>

                      {/* Unread dot */}
                      {!msg.is_read && (
                        <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: ACCENT }} />
                      )}

                      {/* Date */}
                      <span className={`text-xs shrink-0 ${msg.is_read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        {formatDate(msg.received_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ---- Compose Modal ---- */}
      {compose.open && (
        <div className="fixed bottom-4 right-6 w-[480px] max-h-[520px] bg-card border border-border rounded-md shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Compose header */}
          <div
            className="flex items-center justify-between px-4 py-2.5 text-white text-sm font-medium rounded-t-md"
            style={{ backgroundColor: "#404040" }}
          >
            <span>{compose.replyTo ? "Reply" : "New Message"}</span>
            <button onClick={() => setCompose((c) => ({ ...c, open: false }))} className="p-0.5 hover:bg-white/10 rounded">
              <X className="size-4" />
            </button>
          </div>

          {/* Fields */}
          <div className="flex flex-col border-b border-border/30">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20">
              <span className="text-xs text-muted-foreground w-8">To</span>
              <input
                type="text"
                value={compose.to}
                onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                placeholder="recipient@example.com"
              />
              {!compose.showCc && (
                <button
                  onClick={() => setCompose((c) => ({ ...c, showCc: true }))}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cc
                </button>
              )}
            </div>
            {compose.showCc && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20">
                <span className="text-xs text-muted-foreground w-8">Cc</span>
                <input
                  type="text"
                  value={compose.cc}
                  onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                  className="flex-1 text-sm bg-transparent focus:outline-none"
                  placeholder="cc@example.com"
                />
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-xs text-muted-foreground w-8">Subj</span>
              <input
                type="text"
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                placeholder="Subject"
              />
            </div>
          </div>

          {/* Body */}
          <textarea
            value={compose.body}
            onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
            className="flex-1 p-4 text-sm bg-transparent resize-none focus:outline-none min-h-[160px]"
            placeholder="Write your message..."
          />

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30">
            <button
              onClick={handleSend}
              disabled={sending || !compose.to.trim() || !compose.subject.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              <Send className="size-3.5" />
              {sending ? "Sending..." : "Send"}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setCompose((c) => ({ ...c, open: false }))}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              title="Save draft & close"
            >
              Save Draft
            </button>
            <button
              onClick={() => setCompose({ open: false, to: "", cc: "", showCc: false, subject: "", body: "", replyTo: null })}
              className="p-1.5 hover:bg-muted/50 rounded"
              title="Discard"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
