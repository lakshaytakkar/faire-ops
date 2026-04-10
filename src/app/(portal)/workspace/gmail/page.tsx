"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Mail, Search, Star, Send, FileText, AlertTriangle, Trash2,
  Plus, ChevronDown, X, ArrowLeft, Reply, MoreVertical,
  Inbox as InboxIcon, Pencil, Check, RefreshCw, Link as LinkIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GmailAccount {
  id: string
  email: string
  display_name: string | null
  profile_photo: string | null
  is_primary: boolean
  is_active: boolean
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

function avatarBg(name: string | null) {
  if (!name) return "hsl(220, 9%, 46%)"
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 48%)`
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
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
  const [statusBanner, setStatusBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  /* ---- Read OAuth result from query params ---- */
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("oauth") === "success") {
      setStatusBanner({ kind: "success", text: `Connected ${params.get("email") ?? "account"}` })
      window.history.replaceState({}, "", window.location.pathname)
    } else if (params.get("oauth_error")) {
      setStatusBanner({ kind: "error", text: `Connection failed: ${params.get("oauth_error")}` })
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  /* ---- Fetch accounts ---- */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("gmail_accounts")
        .select("id, email, display_name, profile_photo, is_primary, is_active, unread_count, total_messages")
        .order("is_primary", { ascending: false })
      if (data && data.length > 0) {
        setAccounts(data)
        setActiveAccount(data[0])
      } else {
        setLoading(false)
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

  /* ---- Derived ---- */
  const unreadCount = useMemo(() => messages.filter((m) => !m.is_read).length, [messages])

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

  /* ---- Mutations ---- */
  async function toggleStar(msg: GmailMessage, e?: React.MouseEvent) {
    e?.stopPropagation()
    const newVal = !msg.is_starred
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_starred: newVal } : m)))
    if (selectedMessage?.id === msg.id) setSelectedMessage({ ...msg, is_starred: newVal })
    await supabase.from("gmail_messages").update({ is_starred: newVal }).eq("id", msg.id)
  }

  function openMessage(msg: GmailMessage) {
    setSelectedMessage(msg)
    if (!msg.is_read) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)))
      supabase.from("gmail_messages").update({ is_read: true }).eq("id", msg.id)
    }
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ---- Compose ---- */
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
      const res = await fetch("/api/gmail/send", {
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
      const data = await res.json()
      if (res.ok) {
        setStatusBanner({
          kind: "success",
          text: data.demo ? "Saved (no Google account connected)" : "Email sent",
        })
        setCompose({ open: false, to: "", cc: "", showCc: false, subject: "", body: "", replyTo: null })
      } else {
        setStatusBanner({ kind: "error", text: data.error ?? "Send failed" })
      }
    } catch (err) {
      console.error("Send failed:", err)
      setStatusBanner({ kind: "error", text: "Network error" })
    } finally {
      setSending(false)
    }
  }

  function connectAccount() {
    window.location.href = "/api/gmail/oauth/start"
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5" onClick={() => setShowAccountDropdown(false)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Email</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Unified inbox across all your connected Google accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMessages}
            className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border/80 shadow-sm px-3 h-9 text-sm font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Sync
          </button>
          <button
            onClick={connectAccount}
            className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border/80 shadow-sm px-3 h-9 text-sm font-medium text-foreground hover:bg-muted/60 hover:border-border transition-colors"
          >
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            Connect Google
          </button>
          <button
            onClick={openCompose}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground shadow-sm px-3 h-9 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Pencil className="h-4 w-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusBanner && (
        <div
          className={`rounded-md border px-4 py-2.5 text-sm flex items-center justify-between ${
            statusBanner.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button onClick={() => setStatusBanner(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Empty state — no accounts at all */}
      {accounts.length === 0 && !loading ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-10 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold font-heading">Connect a Google account</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Sync messages from Gmail directly into the portal. We use the official Google OAuth flow —
            you can disconnect anytime.
          </p>
          <button
            onClick={connectAccount}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-9 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <LinkIcon className="h-4 w-4" />
            Connect with Google
          </button>
        </div>
      ) : (
        /* ---- Main email card ---- */
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          {/* Toolbar — account switcher + search */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-border/80">
            {/* Account switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowAccountDropdown((v) => !v)}
                className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
              >
                {activeAccount?.profile_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeAccount.profile_photo}
                    alt=""
                    className="h-6 w-6 rounded-md object-cover"
                  />
                ) : (
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: avatarBg(activeAccount?.display_name ?? null) }}
                  >
                    {senderInitial(activeAccount?.display_name ?? null)}
                  </div>
                )}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {activeAccount?.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {showAccountDropdown && (
                <div className="absolute left-0 top-full mt-1 w-72 rounded-md border border-border/80 bg-card shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/80">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Connected accounts
                    </p>
                  </div>
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setActiveAccount(acc)
                        setShowAccountDropdown(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                        acc.id === activeAccount?.id ? "bg-muted/30" : ""
                      }`}
                    >
                      {acc.profile_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={acc.profile_photo}
                          alt=""
                          className="h-7 w-7 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: avatarBg(acc.display_name) }}
                        >
                          {senderInitial(acc.display_name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{acc.display_name ?? acc.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      </div>
                      {acc.id === activeAccount?.id && (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={connectAccount}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-muted/50 transition-colors border-t border-border/80"
                  >
                    <Plus className="h-4 w-4" />
                    Add another account
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Body — sidebar + list/detail */}
          <div className="flex min-h-[560px]">
            {/* Sidebar */}
            <aside className="w-52 shrink-0 border-r border-border/80 bg-muted/20 py-3">
              <nav className="flex flex-col gap-0.5 px-2">
                {FOLDERS.map((f) => {
                  const isActive = activeFolder === f.key
                  const Icon = f.icon
                  return (
                    <button
                      key={f.key}
                      onClick={() => {
                        setActiveFolder(f.key)
                        setSelectedMessage(null)
                        setSelectedIds(new Set())
                      }}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="flex-1 text-left">{f.label}</span>
                      {f.key === "INBOX" && unreadCount > 0 && (
                        <span className="text-[10px] font-bold text-primary">{unreadCount}</span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <div className="h-px bg-border/80 mx-3 my-3" />

              <div className="px-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Labels
                </p>
                <div className="flex flex-col gap-0.5">
                  {[
                    { name: "Important", color: "#10b981" },
                    { name: "Work", color: "#3b82f6" },
                    { name: "Personal", color: "#f59e0b" },
                  ].map((label) => (
                    <button
                      key={label.name}
                      className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main pane */}
            <main className="flex-1 min-w-0 flex flex-col">
              {selectedMessage ? (
                /* ---- Message detail ---- */
                <>
                  <div className="flex items-center gap-2 px-4 h-11 border-b border-border/80 shrink-0">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="p-1.5 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm font-semibold truncate flex-1">{selectedMessage.subject}</h2>
                    <button
                      onClick={() => openReply(selectedMessage)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border/80 hover:bg-muted/60 transition-colors"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                    <button
                      onClick={() => toggleStar(selectedMessage)}
                      className="p-1.5 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          selectedMessage.is_starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-muted/60 transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto">
                      <div className="flex items-start gap-3 mb-5">
                        <div
                          className="h-10 w-10 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: avatarBg(selectedMessage.sender) }}
                        >
                          {senderInitial(selectedMessage.sender)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{selectedMessage.sender}</span>
                            <span className="text-xs text-muted-foreground">
                              &lt;{selectedMessage.sender_email}&gt;
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            to {selectedMessage.recipients} · {formatDate(selectedMessage.received_at)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md border border-border/80 bg-background p-5">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                          {selectedMessage.body_text || selectedMessage.snippet || "No content"}
                        </p>
                      </div>

                      <button
                        onClick={() => openReply(selectedMessage)}
                        className="mt-5 w-full flex items-center gap-2 px-4 py-2.5 rounded-md border border-border/80 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                      >
                        <Reply className="h-4 w-4" />
                        Click here to reply
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ---- Message list ---- */
                <>
                  <div className="flex items-center gap-3 px-4 h-11 border-b border-border/80 shrink-0">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size > 0 && selectedIds.size === filteredMessages.length
                      }
                      onChange={() => {
                        if (selectedIds.size === filteredMessages.length) setSelectedIds(new Set())
                        else setSelectedIds(new Set(filteredMessages.map((m) => m.id)))
                      }}
                      className="rounded border-border/50 accent-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {FOLDERS.find((f) => f.key === activeFolder)?.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                        <InboxIcon className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">
                          No messages in {FOLDERS.find((f) => f.key === activeFolder)?.label}
                        </p>
                        <p className="text-xs mt-1 opacity-70">Nothing here yet.</p>
                      </div>
                    ) : (
                      filteredMessages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => openMessage(msg)}
                          className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/40 cursor-pointer transition-colors ${
                            msg.is_read ? "hover:bg-muted/30" : "bg-primary/[0.02] hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(msg.id)}
                            onChange={() => {}}
                            onClick={(e) => toggleSelect(msg.id, e)}
                            className="rounded border-border/50 accent-primary shrink-0"
                          />
                          <button onClick={(e) => toggleStar(msg, e)} className="shrink-0">
                            <Star
                              className={`h-4 w-4 transition-colors ${
                                msg.is_starred
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40 hover:text-amber-400"
                              }`}
                            />
                          </button>
                          <div
                            className="h-7 w-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ backgroundColor: avatarBg(msg.sender) }}
                          >
                            {senderInitial(msg.sender)}
                          </div>
                          <span
                            className={`w-32 truncate text-sm shrink-0 ${
                              msg.is_read ? "text-muted-foreground" : "font-semibold text-foreground"
                            }`}
                          >
                            {msg.sender}
                          </span>
                          <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                            <span
                              className={`truncate text-sm ${
                                msg.is_read ? "text-muted-foreground" : "font-medium text-foreground"
                              }`}
                            >
                              {msg.subject}
                            </span>
                            <span className="text-xs text-muted-foreground/60 truncate hidden md:inline">
                              — {msg.snippet}
                            </span>
                          </div>
                          {!msg.is_read && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span
                            className={`text-xs shrink-0 w-16 text-right ${
                              msg.is_read ? "text-muted-foreground" : "font-medium text-foreground"
                            }`}
                          >
                            {formatDate(msg.received_at)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      )}

      {/* ---- Compose modal ---- */}
      {compose.open && (
        <div className="fixed bottom-4 right-6 w-[480px] max-h-[540px] rounded-lg border border-border/80 bg-card shadow-xl flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 h-10 border-b border-border/80 bg-muted/30">
            <span className="text-sm font-semibold">
              {compose.replyTo ? "Reply" : "New message"}
            </span>
            <button
              onClick={() => setCompose((c) => ({ ...c, open: false }))}
              className="p-1 hover:bg-muted/60 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-4 h-9 border-b border-border/40">
              <span className="text-xs text-muted-foreground w-10">To</span>
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
              <div className="flex items-center gap-2 px-4 h-9 border-b border-border/40">
                <span className="text-xs text-muted-foreground w-10">Cc</span>
                <input
                  type="text"
                  value={compose.cc}
                  onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))}
                  className="flex-1 text-sm bg-transparent focus:outline-none"
                  placeholder="cc@example.com"
                />
              </div>
            )}
            <div className="flex items-center gap-2 px-4 h-9 border-b border-border/40">
              <span className="text-xs text-muted-foreground w-10">Subject</span>
              <input
                type="text"
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                placeholder="Subject"
              />
            </div>
          </div>

          <textarea
            value={compose.body}
            onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
            className="flex-1 p-4 text-sm bg-transparent resize-none focus:outline-none min-h-[180px]"
            placeholder="Write your message..."
          />

          <div className="flex items-center gap-2 px-4 h-12 border-t border-border/80">
            <button
              onClick={handleSend}
              disabled={sending || !compose.to.trim() || !compose.subject.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send"}
            </button>
            <div className="flex-1" />
            <button
              onClick={() =>
                setCompose({
                  open: false,
                  to: "",
                  cc: "",
                  showCc: false,
                  subject: "",
                  body: "",
                  replyTo: null,
                })
              }
              className="p-1.5 hover:bg-muted/60 rounded-md"
              title="Discard"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
