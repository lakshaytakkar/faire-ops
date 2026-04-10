"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Hash, Send, Users, Building2, Paperclip, X, FileText, Download,
  Image as ImageIcon, Reply, Smile, Pencil, Trash2, Check, Plus,
  ChevronDown, MessageSquare, Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { RichTextEditor, RichTextRenderer, richTextToPlain } from "@/components/shared/rich-text-editor"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Attachment {
  url: string
  path: string
  name: string
  size: number
  type: string
}

interface Channel {
  id: string
  name: string
  type: string
  description: string | null
  created_at: string
  is_private?: boolean
  last_message_at?: string | null
}

interface ChatMessage {
  id: string
  channel_id: string
  sender_name: string
  body: string
  created_at: string
  message_type?: string
  attachments?: Attachment[]
  reply_to?: string | null
  edited_at?: string | null
  is_deleted?: boolean
  reactions?: Record<string, string[]>
}

interface TeamMember {
  id: string
  name: string
  role: string
  status: "online" | "away" | "offline"
  avatar_url?: string | null
}

interface VendorContact {
  id: string
  name: string
  contact_name: string | null
}

interface DmChannel {
  id: string
  participant_1: string
  participant_2: string
  last_message_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CURRENT_USER = "Lakshay"

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
}

const QUICK_EMOJIS = [
  { emoji: "👍", label: "thumbsup" },
  { emoji: "❤️", label: "heart" },
  { emoji: "😂", label: "laugh" },
  { emoji: "👀", label: "eyes" },
  { emoji: "🔥", label: "fire" },
  { emoji: "✅", label: "check" },
]

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(type: string): boolean {
  return IMAGE_TYPES.includes(type)
}

function isSameGroup(prev: ChatMessage, curr: ChatMessage): boolean {
  if (prev.sender_name !== curr.sender_name) return false
  const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
  return diff < 5 * 60 * 1000 // 5 minutes
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString()
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface PendingAttachment {
  file: File
  preview?: string
  uploaded?: Attachment
  uploading?: boolean
  error?: boolean
}

function AttachmentPreview({ att, onRemove }: { att: PendingAttachment; onRemove: () => void }) {
  const isImg = isImageType(att.file.type)
  return (
    <div className="relative group bg-muted rounded-lg p-2 flex items-center gap-2 min-w-0">
      {isImg && att.preview ? (
        <img src={att.preview} alt="" className="w-12 h-12 rounded object-cover" />
      ) : (
        <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{att.file.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {att.uploading ? "Uploading..." : att.error ? "Failed" : att.uploaded ? "Ready" : formatFileSize(att.file.size)}
        </p>
      </div>
      {att.uploading && (
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
      )}
      {att.uploaded && (
        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((a) => isImageType(a.type))
  const files = attachments.filter((a) => !isImageType(a.type))

  return (
    <div className="mt-1.5 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={img.url}
                alt={img.name}
                className="max-w-xs max-h-60 rounded-lg border object-cover hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <a
              key={i}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors max-w-sm"
            >
              <FileText className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function ReactionPills({
  reactions,
  onToggle,
}: {
  reactions: Record<string, string[]>
  onToggle: (emoji: string) => void
}) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const isMine = users.includes(CURRENT_USER)
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
              isMine
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted border-transparent text-muted-foreground hover:border-border"
            }`}
          >
            <span>{emoji}</span>
            <span className="font-medium">{users.length}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  // ---- data state ----
  const [channels, setChannels] = useState<Channel[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [vendors, setVendors] = useState<VendorContact[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // ---- selection state ----
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<VendorContact | null>(null)
  const [dmChannelId, setDmChannelId] = useState<string | null>(null)

  // ---- input state ----
  const [inputValue, setInputValue] = useState("")
  const [sending, setSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)

  // ---- edit state ----
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // ---- emoji picker state ----
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null)

  // ---- hover state ----
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)

  // ---- channel creation ----
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const [newChannelDesc, setNewChannelDesc] = useState("")

  // ---- search ----
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // ---- unread tracking ----
  const [lastRead, setLastRead] = useState<Record<string, string>>({})

  // ---- refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ---- derived ----
  const activeChannel = channels.find((c) => c.id === selectedChannelId) ?? null
  const activeChatId = dmChannelId ?? selectedChannelId

  const headerTitle = selectedVendor
    ? selectedVendor.name
    : selectedMember
      ? selectedMember.name
      : activeChannel
        ? `# ${activeChannel.name}`
        : "Select a channel"

  const headerDescription = selectedVendor
    ? `Vendor contact${selectedVendor.contact_name ? ` — ${selectedVendor.contact_name}` : ""}`
    : selectedMember
      ? selectedMember.role
      : activeChannel?.description ?? ""

  const avatarMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of teamMembers) {
      if (m.avatar_url) map[m.name] = m.avatar_url
    }
    return map
  }, [teamMembers])

  // Unread counts per channel
  const unreadChannels = useMemo(() => {
    const set = new Set<string>()
    for (const ch of channels) {
      if (ch.last_message_at && lastRead[ch.id]) {
        if (new Date(ch.last_message_at) > new Date(lastRead[ch.id])) {
          set.add(ch.id)
        }
      } else if (ch.last_message_at && !lastRead[ch.id]) {
        set.add(ch.id)
      }
    }
    return set
  }, [channels, lastRead])

  // ---- load last-read from localStorage ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem("chat_last_read")
      if (stored) setLastRead(JSON.parse(stored))
    } catch {}
  }, [])

  function markAsRead(channelId: string) {
    const now = new Date().toISOString()
    setLastRead((prev) => {
      const next = { ...prev, [channelId]: now }
      localStorage.setItem("chat_last_read", JSON.stringify(next))
      return next
    })
  }

  // ---- fetch channels + team + vendors on mount ----
  useEffect(() => {
    async function load() {
      const [chRes, tmRes, vRes] = await Promise.all([
        supabase.from("chat_channels").select("*").order("created_at", { ascending: true }),
        supabase.from("team_members").select("id, name, role, status, avatar_url").order("name"),
        supabase.from("faire_vendors").select("id, name, contact_name").order("name"),
      ])
      const chs = (chRes.data ?? []) as Channel[]
      setChannels(chs)
      setTeamMembers((tmRes.data ?? []) as TeamMember[])
      setVendors((vRes.data ?? []) as VendorContact[])
      if (chs.length > 0) {
        setSelectedChannelId(chs[0].id)
      }
    }
    load()
  }, [])

  // ---- fetch messages when selection changes ----
  const fetchMessages = useCallback(async (channelId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
    setMessages((data ?? []) as ChatMessage[])
    markAsRead(channelId)
  }, [])

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId)
    }
  }, [activeChatId, fetchMessages])

  // ---- Realtime subscription ----
  useEffect(() => {
    if (!activeChatId) return

    const channel = supabase
      .channel(`chat_messages_${activeChatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChatId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as ChatMessage
            setMessages((prev) => {
              // Avoid duplicates from optimistic updates
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            markAsRead(activeChatId)
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ChatMessage
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string }
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChatId])

  // ---- auto-scroll ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // ---- auto-resize textarea ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [inputValue])

  // ---- DM channel helper ----
  async function getOrCreateDmChannel(otherName: string): Promise<string | null> {
    const p1 = CURRENT_USER < otherName ? CURRENT_USER : otherName
    const p2 = CURRENT_USER < otherName ? otherName : CURRENT_USER

    // Check existing
    const { data: existing } = await supabase
      .from("chat_dm_channels")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .single()

    if (existing) return existing.id

    // Create
    const { data: created } = await supabase
      .from("chat_dm_channels")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id")
      .single()

    return created?.id ?? null
  }

  // ---- selection handlers ----
  function selectChannel(ch: Channel) {
    setSelectedMember(null)
    setSelectedVendor(null)
    setDmChannelId(null)
    setSelectedChannelId(ch.id)
    setReplyTo(null)
    setEditingId(null)
  }

  async function selectMember(member: TeamMember) {
    setSelectedChannelId(null)
    setSelectedVendor(null)
    setSelectedMember(member)
    setReplyTo(null)
    setEditingId(null)
    const dmId = await getOrCreateDmChannel(member.name)
    setDmChannelId(dmId)
  }

  async function selectVendor(vendor: VendorContact) {
    setSelectedChannelId(null)
    setSelectedMember(null)
    setSelectedVendor(vendor)
    setReplyTo(null)
    setEditingId(null)
    const dmId = await getOrCreateDmChannel(vendor.name)
    setDmChannelId(dmId)
  }

  // ---- file handling — upload immediately on select ----
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (fileInputRef.current) fileInputRef.current.value = ""

    for (const file of valid) {
      const pending: PendingAttachment = {
        file,
        preview: isImageType(file.type) ? URL.createObjectURL(file) : undefined,
        uploading: true,
      }
      setPendingFiles((prev) => [...prev, pending])

      // Upload in background
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/chat/upload", { method: "POST", body: formData })
        if (res.ok) {
          const data = (await res.json()) as Attachment
          setPendingFiles((prev) =>
            prev.map((p) => (p.file === file ? { ...p, uploading: false, uploaded: data } : p))
          )
        } else {
          setPendingFiles((prev) =>
            prev.map((p) => (p.file === file ? { ...p, uploading: false, error: true } : p))
          )
        }
      } catch {
        setPendingFiles((prev) =>
          prev.map((p) => (p.file === file ? { ...p, uploading: false, error: true } : p))
        )
      }
    }
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => {
      const item = prev[index]
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // ---- send message (files already uploaded) ----
  async function handleSend() {
    const text = inputValue.trim()
    const plainText = richTextToPlain(text)
    const readyFiles = pendingFiles.filter((p) => p.uploaded)
    if (!plainText && readyFiles.length === 0) return
    if (!activeChatId) return
    setSending(true)

    const attachments = readyFiles.map((p) => p.uploaded!)

    // Clean up previews
    pendingFiles.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) })
    setPendingFiles([])

    const hasImages = attachments.some((a) => isImageType(a.type))
    const hasFiles = attachments.some((a) => !isImageType(a.type))
    let messageType = "text"
    if (hasImages && !hasFiles && !text) messageType = "image"
    else if (hasFiles && !hasImages && !text) messageType = "file"

    // Insert to DB first, get the real ID back to avoid realtime duplicates
    const { data: inserted } = await supabase.from("chat_messages").insert({
      channel_id: activeChatId,
      sender_name: CURRENT_USER,
      body: text,
      message_type: messageType,
      attachments: attachments.length > 0 ? attachments : [],
      reply_to: replyTo?.id ?? null,
    }).select("id").single()

    // Add to local state with the real DB id
    const newMsg: ChatMessage = {
      id: inserted?.id ?? crypto.randomUUID(),
      channel_id: activeChatId,
      sender_name: CURRENT_USER,
      body: text,
      created_at: new Date().toISOString(),
      message_type: messageType,
      attachments,
      reply_to: replyTo?.id ?? null,
      reactions: {},
    }
    setMessages((prev) => {
      // Guard against realtime already having added it
      if (prev.some((m) => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })

    setInputValue("")
    setReplyTo(null)

    // Update last_message_at
    if (dmChannelId) {
      await supabase.from("chat_dm_channels").update({ last_message_at: new Date().toISOString() }).eq("id", dmChannelId)
    } else if (selectedChannelId) {
      await supabase.from("chat_channels").update({ last_message_at: new Date().toISOString() }).eq("id", selectedChannelId)
    }

    setSending(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---- reactions ----
  async function toggleReaction(msgId: string, emoji: string) {
    setEmojiPickerMsgId(null)
    const msg = messages.find((m) => m.id === msgId)
    if (!msg) return

    const reactions = { ...(msg.reactions ?? {}) }
    const users = reactions[emoji] ? [...reactions[emoji]] : []
    const idx = users.indexOf(CURRENT_USER)
    if (idx >= 0) users.splice(idx, 1)
    else users.push(CURRENT_USER)
    reactions[emoji] = users

    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions } : m)))
    await supabase.from("chat_messages").update({ reactions }).eq("id", msgId)
  }

  // ---- edit ----
  async function saveEdit(msgId: string) {
    const text = editValue.trim()
    if (!text) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, body: text, edited_at: new Date().toISOString() } : m
      )
    )
    setEditingId(null)
    await supabase
      .from("chat_messages")
      .update({ body: text, edited_at: new Date().toISOString() })
      .eq("id", msgId)
  }

  // ---- delete ----
  async function deleteMessage(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true, body: "" } : m))
    )
    await supabase.from("chat_messages").update({ is_deleted: true, body: "" }).eq("id", msgId)
  }

  // ---- create channel ----
  async function createChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-")
    if (!name) return
    const { data } = await supabase
      .from("chat_channels")
      .insert({ name, description: newChannelDesc.trim() || null })
      .select()
      .single()
    if (data) {
      setChannels((prev) => [...prev, data as Channel])
      setSelectedChannelId(data.id)
      setSelectedMember(null)
      setSelectedVendor(null)
      setDmChannelId(null)
    }
    setShowNewChannel(false)
    setNewChannelName("")
    setNewChannelDesc("")
  }

  // ---- find reply source ----
  function findReplySource(replyToId: string | null | undefined): ChatMessage | undefined {
    if (!replyToId) return undefined
    return messages.find((m) => m.id === replyToId)
  }

  // ---- search messages ----
  const filteredMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) => m.body.toLowerCase().includes(q) || m.sender_name.toLowerCase().includes(q)
    )
  }, [messages, searchQuery, showSearch])

  const displayMessages = showSearch && searchQuery.trim() ? filteredMessages : messages

  // ---- render ----
  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="h-[calc(100vh-120px)] flex rounded-lg border bg-card overflow-hidden">
        {/* ======== Left Sidebar ======== */}
        <div className="w-72 border-r flex flex-col bg-card">
          {/* Channels Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Channels
            </h3>
            <button
              onClick={() => setShowNewChannel(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Create channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Channel Form */}
          {showNewChannel && (
            <div className="px-3 pb-2 space-y-1.5">
              <input
                type="text"
                placeholder="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full h-8 rounded border px-2 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowNewChannel(false) }}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
                className="w-full h-8 rounded border px-2 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowNewChannel(false) }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={createChannel}
                  className="flex-1 h-7 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowNewChannel(false); setNewChannelName(""); setNewChannelDesc("") }}
                  className="flex-1 h-7 rounded border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Channel List */}
          <div className="px-2 space-y-0.5">
            {channels.map((ch) => {
              const isActive = selectedChannelId === ch.id && !selectedMember && !selectedVendor
              const hasUnread = unreadChannels.has(ch.id) && !isActive
              return (
                <button
                  key={ch.id}
                  onClick={() => selectChannel(ch)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  } ${hasUnread ? "font-semibold" : ""}`}
                >
                  <span className="text-muted-foreground">#</span>
                  <span className="flex-1 truncate">{ch.name}</span>
                  {hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Team */}
          <div className="px-4 pt-5 pb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Team
            </h3>
          </div>
          <div className="overflow-y-auto px-2 space-y-0.5 pb-2">
            {teamMembers.map((member) => {
              const isActive = selectedMember?.id === member.id
              return (
                <button
                  key={member.id}
                  onClick={() => selectMember(member)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {getInitials(member.name)}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_DOT[member.status] ?? STATUS_DOT.offline}`}
                    />
                  </div>
                  <span className="truncate">{member.name}</span>
                </button>
              )
            })}
          </div>

          {/* Vendors */}
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Vendors
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
            {vendors.map((vendor) => {
              const isActive = selectedVendor?.id === vendor.id
              return (
                <button
                  key={vendor.id}
                  onClick={() => selectVendor(vendor)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="shrink-0">
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {getInitials(vendor.name)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate">{vendor.name}</span>
                    {vendor.contact_name && (
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {vendor.contact_name}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ======== Right Main Area ======== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3 border-b flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{headerTitle}</div>
              {headerDescription && (
                <p className="text-xs text-muted-foreground truncate">{headerDescription}</p>
              )}
            </div>
            <button
              onClick={() => { setShowSearch(!showSearch); setSearchQuery("") }}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                showSearch ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="px-5 py-2 border-b">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 rounded border px-3 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
            {displayMessages.map((msg, idx) => {
              const prev = idx > 0 ? displayMessages[idx - 1] : null
              const showDateSep = !prev || isDifferentDay(prev.created_at, msg.created_at)
              const grouped = prev && !showDateSep && isSameGroup(prev, msg)
              const isMe = msg.sender_name === CURRENT_USER
              const senderAvatar = avatarMap[msg.sender_name] ?? null
              const replySrc = findReplySource(msg.reply_to)
              const isHovered = hoveredMsgId === msg.id
              const isEditing = editingId === msg.id

              if (msg.is_deleted) {
                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs font-medium text-muted-foreground">{formatDate(msg.created_at)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="flex gap-3 items-start py-1 pl-11">
                      <p className="text-sm text-muted-foreground italic">This message was deleted</p>
                    </div>
                  </div>
                )
              }

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
                    } ${isHovered ? "bg-muted/40" : "hover:bg-muted/30"}`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => { setHoveredMsgId(null); if (emojiPickerMsgId === msg.id) setEmojiPickerMsgId(null) }}
                  >
                    {/* Avatar (only for first in group) */}
                    {!grouped && (
                      <div className="shrink-0">
                        {senderAvatar ? (
                          <img src={senderAvatar} alt={msg.sender_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {getInitials(msg.sender_name)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {!grouped && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{msg.sender_name}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                          {msg.edited_at && (
                            <span className="text-[10px] text-muted-foreground">(edited)</span>
                          )}
                        </div>
                      )}

                      {/* Reply indicator */}
                      {replySrc && (
                        <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                          <Reply className="w-3 h-3 rotate-180" />
                          <span className="font-medium">{replySrc.sender_name}</span>
                          <span className="truncate max-w-xs opacity-70">{richTextToPlain(replySrc.body).slice(0, 80)}</span>
                        </div>
                      )}

                      {/* Message body */}
                      {isEditing ? (
                        <div className="flex gap-2 items-end mt-0.5">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 min-h-[36px] max-h-[100px] rounded border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id) }
                              if (e.key === "Escape") setEditingId(null)
                            }}
                          />
                          <button
                            onClick={() => saveEdit(msg.id)}
                            className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="h-8 px-3 rounded border text-xs font-medium hover:bg-muted cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {msg.body && (
                            <div className="mt-0.5">
                              <RichTextRenderer content={msg.body} />
                            </div>
                          )}
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <MessageAttachments attachments={msg.attachments} />
                          )}
                        </>
                      )}

                      {/* Reactions */}
                      {msg.reactions && (
                        <ReactionPills
                          reactions={msg.reactions}
                          onToggle={(emoji) => toggleReaction(msg.id, emoji)}
                        />
                      )}
                    </div>

                    {/* Hover Actions */}
                    {isHovered && !isEditing && (
                      <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-card border rounded-md shadow-sm px-1 py-0.5 z-10">
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="React"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        {isMe && (
                          <>
                            <button
                              onClick={() => { setEditingId(msg.id); setEditValue(msg.body) }}
                              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Emoji picker dropdown */}
                        {emojiPickerMsgId === msg.id && (
                          <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg p-1.5 flex gap-1 z-20">
                            {QUICK_EMOJIS.map((e) => (
                              <button
                                key={e.label}
                                onClick={() => toggleReaction(msg.id, e.emoji)}
                                className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-base transition-colors cursor-pointer"
                                title={e.label}
                              >
                                {e.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {displayMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {showSearch && searchQuery
                      ? "No messages match your search"
                      : selectedVendor
                        ? `Start a conversation with ${selectedVendor.name}`
                        : selectedMember
                          ? `Start a conversation with ${selectedMember.name}`
                          : "No messages yet. Start the conversation!"}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Banner */}
          {replyTo && (
            <div className="px-5 py-2 border-t bg-muted/30 flex items-center gap-3">
              <Reply className="w-4 h-4 text-muted-foreground shrink-0 rotate-180" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold">{replyTo.sender_name}</span>
                <p className="text-xs text-muted-foreground truncate">{richTextToPlain(replyTo.body).slice(0, 100)}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* File Preview Strip */}
          {pendingFiles.length > 0 && (
            <div className="px-5 py-2 border-t bg-muted/20">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingFiles.map((pf, i) => (
                  <AttachmentPreview key={i} att={pf} onRemove={() => removePendingFile(i)} />
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="px-5 py-3 border-t flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xlsx,.csv,.txt,.zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeChatId}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <RichTextEditor
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              disabled={!activeChatId}
              placeholder={
                activeChatId
                  ? selectedChannelId
                    ? `Message #${activeChannel?.name ?? "channel"}...`
                    : selectedVendor
                      ? `Message ${selectedVendor.name}...`
                      : selectedMember
                        ? `Message ${selectedMember.name}...`
                        : "Type a message..."
                  : "Select a channel..."
              }
            />
            <button
              onClick={handleSend}
              disabled={
                (!richTextToPlain(inputValue).trim() && !pendingFiles.some((p) => p.uploaded)) ||
                pendingFiles.some((p) => p.uploading) ||
                !activeChatId ||
                sending
              }
              className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : pendingFiles.some((p) => p.uploading) ? "Uploading..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
