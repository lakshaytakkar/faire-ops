"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  Hash, Send, Users, Building2, Paperclip, X, FileText, Download,
  Image as ImageIcon, Reply, Smile, Pencil, Trash2, Check, Plus,
  ChevronDown, MessageSquare, Search, WifiOff, RotateCcw, AlertTriangle,
  Copy, CornerDownLeft,
} from "lucide-react"
import { toast } from "sonner"
import { supabase, supabaseB2B } from "@/lib/supabase"
import { RichTextEditor, RichTextRenderer, richTextToPlain } from "@/components/shared/rich-text-editor"
import { CreateChannelModal, type CreateChannelPayload } from "@/components/chat/create-channel-modal"

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

type SendStatus = "sent" | "pending" | "failed"

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
  /** Client-only: "pending" while the insert is in-flight, "failed" after
   * an error. Never stored in the DB. Used to render failure UX + retry. */
  __status?: SendStatus
  /** Client-only: raw payload we can replay on retry. */
  __retry?: {
    channel_id: string
    body: string
    message_type: string
    attachments: Attachment[]
    reply_to: string | null
  }
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
// Hardcoded lakshay user_id. Dev-fallback path while Supabase Auth session
// isn't wired yet — matches the SUPERADMIN_FALLBACK_EMAIL flow in
// auth-context.tsx. Needed to key server-side chat read state per user.
const CURRENT_USER_ID = "5962af62-87a0-41e6-83c3-317f3501c590"

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

/** Slack-style relative time: "just now" / "5m" / "12:34" / "Yesterday 12:34" / "Mar 4". */
function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffSec = (now.getTime() - d.getTime()) / 1000

  if (diffSec < 45) return "just now"
  if (diffSec < 60 * 60) return `${Math.max(1, Math.floor(diffSec / 60))}m`

  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (sameDay) return time
  if (isYesterday) return `Yesterday ${time}`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
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

/** Minimal online/offline hook — navigator.onLine + event listeners. */
function useOnline(): boolean {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  return online
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
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" aria-label="Uploading" />
      )}
      {att.uploaded && (
        <Check className="w-4 h-4 text-emerald-500 shrink-0" aria-label="Uploaded" />
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer active:scale-95"
        aria-label={`Remove attachment ${att.file.name}`}
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
          {images.map((img) => (
            <a
              key={img.path || img.url}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              aria-label={`Open image ${img.name}`}
            >
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
          {files.map((f) => (
            <a
              key={f.path || f.url}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors max-w-sm"
            >
              <FileText className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
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
            aria-label={`${emoji} reaction, ${users.length} ${users.length === 1 ? "person" : "people"}${isMine ? ", including you — click to remove" : " — click to add"}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer active:scale-95 animate-[reactionPop_160ms_cubic-bezier(.2,.8,.2,1.4)] ${
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

/** Shimmer skeleton used during initial message fetch. */
function MessageSkeleton() {
  return (
    <div className="space-y-4 py-4 px-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 items-start animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2 items-center">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted/60" />
            </div>
            <div className={`h-3 rounded bg-muted/80 ${i === 1 ? "w-3/5" : "w-4/5"}`} />
            {i !== 1 && <div className="h-3 w-2/5 rounded bg-muted/60" />}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  const online = useOnline()

  // ---- data state ----
  const [channels, setChannels] = useState<Channel[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [vendors, setVendors] = useState<VendorContact[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

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
  const [showCreateChannel, setShowCreateChannel] = useState(false)

  // ---- search ----
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  // ---- quick switcher (Cmd/Ctrl+K) ----
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switcherQuery, setSwitcherQuery] = useState("")

  // ---- server-persisted unread state ----
  // Map keys: channel id (both regular channels and DM channels share
  // the chat_messages.channel_id column). Value = ISO timestamp of the
  // most recent read. Read from chat_channel_reads + chat_dm_reads on
  // mount and refreshed when the user opens a channel.
  const [lastRead, setLastRead] = useState<Record<string, string>>({})

  // ---- scroll anchoring ----
  // When the user is reading history (scrolled up), don't auto-jump to
  // bottom on new arrivals — show a "new messages" pill instead.
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const [newMessagesCount, setNewMessagesCount] = useState(0)

  // ---- unread divider (rendered once between last-read and first-unread on
  //      channel open). Computed when messages load for a channel. ----
  const [unreadBoundaryId, setUnreadBoundaryId] = useState<string | null>(null)

  // ---- refs ----
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ---- derived ----
  const activeChannel = channels.find((c) => c.id === selectedChannelId) ?? null
  const activeChatId = dmChannelId ?? selectedChannelId
  const activeChatIsDm = !!dmChannelId

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

  // Unread channel set — derived from DB-persisted lastRead vs channel.last_message_at
  const unreadChannels = useMemo(() => {
    const set = new Set<string>()
    for (const ch of channels) {
      if (!ch.last_message_at) continue
      const read = lastRead[ch.id]
      if (!read || new Date(ch.last_message_at) > new Date(read)) {
        set.add(ch.id)
      }
    }
    return set
  }, [channels, lastRead])

  // ---- load last-read state from DB on mount ----
  useEffect(() => {
    async function loadReadState() {
      try {
        const [chRes, dmRes] = await Promise.all([
          supabase
            .from("chat_channel_reads")
            .select("channel_id, last_read_at")
            .eq("user_id", CURRENT_USER_ID),
          supabase
            .from("chat_dm_reads")
            .select("dm_channel_id, last_read_at")
            .eq("user_id", CURRENT_USER_ID),
        ])
        const next: Record<string, string> = {}
        for (const r of (chRes.data ?? []) as Array<{ channel_id: string; last_read_at: string }>) {
          next[r.channel_id] = r.last_read_at
        }
        for (const r of (dmRes.data ?? []) as Array<{ dm_channel_id: string; last_read_at: string }>) {
          next[r.dm_channel_id] = r.last_read_at
        }
        setLastRead(next)
      } catch {
        /* RLS / network — degrade silently; unread state stays empty */
      }
    }
    loadReadState()
  }, [])

  const markAsRead = useCallback(
    async (channelId: string, isDm: boolean) => {
      const now = new Date().toISOString()
      setLastRead((prev) => ({ ...prev, [channelId]: now }))
      const table = isDm ? "chat_dm_reads" : "chat_channel_reads"
      const idCol = isDm ? "dm_channel_id" : "channel_id"
      await supabase.from(table).upsert(
        { user_id: CURRENT_USER_ID, [idCol]: channelId, last_read_at: now, updated_at: now },
        { onConflict: `user_id,${idCol}` },
      )
    },
    [],
  )

  // ---- fetch channels + team + vendors on mount ----
  useEffect(() => {
    async function load() {
      const [chRes, tmRes, vRes] = await Promise.all([
        supabase.from("chat_channels").select("*").order("created_at", { ascending: true }),
        supabase.from("team_members").select("id, name, role, status, avatar_url").order("name"),
        supabaseB2B.from("faire_vendors").select("id, name, contact_name").order("name"),
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
  const fetchMessages = useCallback(
    async (channelId: string, isDm: boolean) => {
      setMessagesLoading(true)
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
      const rows = (data ?? []) as ChatMessage[]
      setMessages(rows)
      setMessagesLoading(false)
      setNewMessagesCount(0)

      // Compute unread boundary BEFORE marking as read: first message with
      // created_at > lastRead[channelId] AND from another sender.
      const read = lastRead[channelId]
      if (read) {
        const boundary = rows.find(
          (m) => new Date(m.created_at) > new Date(read) && m.sender_name !== CURRENT_USER,
        )
        setUnreadBoundaryId(boundary ? boundary.id : null)
      } else {
        setUnreadBoundaryId(null)
      }

      // Now mark as read (updates state after boundary is computed)
      markAsRead(channelId, isDm)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markAsRead],
  )

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId, activeChatIsDm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, activeChatIsDm])

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
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // If the user isn't at the bottom AND it's not their own message,
            // bump the "new messages" counter instead of auto-scrolling.
            if (!isAtBottomRef.current && newMsg.sender_name !== CURRENT_USER) {
              setNewMessagesCount((c) => c + 1)
            } else if (isAtBottomRef.current) {
              // They're already at the bottom — scroll to show the new msg
              requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
              })
              markAsRead(activeChatId, activeChatIsDm)
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as ChatMessage
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
            )
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string }
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChatId, activeChatIsDm, markAsRead])

  // ---- scroll anchoring: track whether user is at bottom ----
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = () => {
      // 80px threshold — anything within 80px of the bottom counts as "at bottom"
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      isAtBottomRef.current = nearBottom
      if (nearBottom && newMessagesCount > 0) setNewMessagesCount(0)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    // Initialise as at-bottom
    onScroll()
    return () => el.removeEventListener("scroll", onScroll)
  }, [newMessagesCount])

  // ---- auto-scroll ONLY if we were already near the bottom ----
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  // ---- auto-resize textarea ----
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [inputValue])

  // ---- global keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSwitcherOpen((v) => !v)
        setSwitcherQuery("")
      } else if (e.key === "Escape") {
        if (switcherOpen) setSwitcherOpen(false)
        else if (emojiPickerMsgId) setEmojiPickerMsgId(null)
        else if (editingId) setEditingId(null)
        else if (replyTo) setReplyTo(null)
        else if (showSearch) { setShowSearch(false); setSearchQuery("") }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [switcherOpen, emojiPickerMsgId, editingId, replyTo, showSearch])

  // ---- DM channel helper ----
  async function getOrCreateDmChannel(otherName: string): Promise<string | null> {
    const p1 = CURRENT_USER < otherName ? CURRENT_USER : otherName
    const p2 = CURRENT_USER < otherName ? otherName : CURRENT_USER

    const { data: existing } = await supabase
      .from("chat_dm_channels")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .maybeSingle()

    if (existing) return existing.id

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
    setNewMessagesCount(0)
    isAtBottomRef.current = true
  }

  async function selectMember(member: TeamMember) {
    setSelectedChannelId(null)
    setSelectedVendor(null)
    setSelectedMember(member)
    setReplyTo(null)
    setEditingId(null)
    setNewMessagesCount(0)
    isAtBottomRef.current = true
    const dmId = await getOrCreateDmChannel(member.name)
    setDmChannelId(dmId)
  }

  async function selectVendor(vendor: VendorContact) {
    setSelectedChannelId(null)
    setSelectedMember(null)
    setSelectedVendor(vendor)
    setReplyTo(null)
    setEditingId(null)
    setNewMessagesCount(0)
    isAtBottomRef.current = true
    const dmId = await getOrCreateDmChannel(vendor.name)
    setDmChannelId(dmId)
  }

  // ---- file handling ----
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE)
    if (tooBig.length > 0) {
      toast.error(`${tooBig.length} file${tooBig.length === 1 ? "" : "s"} exceeded the 10 MB limit`)
    }
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (fileInputRef.current) fileInputRef.current.value = ""

    for (const file of valid) {
      const pending: PendingAttachment = {
        file,
        preview: isImageType(file.type) ? URL.createObjectURL(file) : undefined,
        uploading: true,
      }
      setPendingFiles((prev) => [...prev, pending])

      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/chat/upload", { method: "POST", body: formData })
        if (res.ok) {
          const data = (await res.json()) as Attachment
          setPendingFiles((prev) =>
            prev.map((p) => (p.file === file ? { ...p, uploading: false, uploaded: data } : p)),
          )
        } else {
          setPendingFiles((prev) =>
            prev.map((p) => (p.file === file ? { ...p, uploading: false, error: true } : p)),
          )
          toast.error(`Upload failed: ${file.name}`)
        }
      } catch {
        setPendingFiles((prev) =>
          prev.map((p) => (p.file === file ? { ...p, uploading: false, error: true } : p)),
        )
        toast.error(`Upload failed: ${file.name}`)
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

  // ---- send message core — INSERT to DB, resolve/fail optimistic bubble ----
  const insertMessage = useCallback(
    async (
      optimisticId: string,
      payload: {
        channel_id: string
        body: string
        message_type: string
        attachments: Attachment[]
        reply_to: string | null
      },
      isDm: boolean,
    ) => {
      const { data: inserted, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: payload.channel_id,
          sender_name: CURRENT_USER,
          body: payload.body,
          message_type: payload.message_type,
          attachments: payload.attachments,
          reply_to: payload.reply_to,
        })
        .select("id, created_at")
        .single()

      if (error || !inserted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, __status: "failed", __retry: payload }
              : m,
          ),
        )
        toast.error("Message failed to send", {
          description: error?.message ?? "Network or permission error",
        })
        return false
      }

      // Swap the optimistic id for the real DB id so realtime echoes are deduped
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, id: inserted.id, created_at: inserted.created_at, __status: "sent", __retry: undefined }
            : m,
        ),
      )

      // Bump the channel's last_message_at for the sidebar ordering / unread
      if (isDm) {
        await supabase.from("chat_dm_channels").update({ last_message_at: inserted.created_at }).eq("id", payload.channel_id)
      } else {
        await supabase.from("chat_channels").update({ last_message_at: inserted.created_at }).eq("id", payload.channel_id)
      }
      return true
    },
    [],
  )

  // ---- send (user-triggered from composer) ----
  async function handleSend(htmlOverride?: string) {
    const text = (htmlOverride ?? inputValue).trim()
    const plainText = richTextToPlain(text)
    const readyFiles = pendingFiles.filter((p) => p.uploaded)
    if (!plainText && readyFiles.length === 0) return
    if (!activeChatId) return
    setSending(true)

    const attachments = readyFiles.map((p) => p.uploaded!)
    pendingFiles.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) })
    setPendingFiles([])

    const hasImages = attachments.some((a) => isImageType(a.type))
    const hasFiles = attachments.some((a) => !isImageType(a.type))
    let messageType = "text"
    if (hasImages && !hasFiles && !text) messageType = "image"
    else if (hasFiles && !hasImages && !text) messageType = "file"

    const optimisticId = `pending-${crypto.randomUUID()}`
    const payload = {
      channel_id: activeChatId,
      body: text,
      message_type: messageType,
      attachments,
      reply_to: replyTo?.id ?? null,
    }
    const optimistic: ChatMessage = {
      id: optimisticId,
      channel_id: activeChatId,
      sender_name: CURRENT_USER,
      body: text,
      created_at: new Date().toISOString(),
      message_type: messageType,
      attachments,
      reply_to: replyTo?.id ?? null,
      reactions: {},
      __status: "pending",
    }
    setMessages((prev) => [...prev, optimistic])
    setInputValue("")
    setReplyTo(null)
    // Optimistic send always scrolls us to the bottom (we just composed it)
    isAtBottomRef.current = true
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }))

    await insertMessage(optimisticId, payload, activeChatIsDm)

    setSending(false)
    textareaRef.current?.focus()
  }

  // ---- retry failed send ----
  async function retryMessage(msgId: string) {
    const msg = messages.find((m) => m.id === msgId)
    if (!msg || !msg.__retry) return
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, __status: "pending" } : m)),
    )
    await insertMessage(msgId, msg.__retry, activeChatIsDm)
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
    const { error } = await supabase.from("chat_messages").update({ reactions }).eq("id", msgId)
    if (error) toast.error("Reaction didn't save", { description: error.message })
  }

  // ---- edit ----
  async function saveEdit(msgId: string) {
    const text = editValue.trim()
    if (!text) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, body: text, edited_at: new Date().toISOString() } : m,
      ),
    )
    setEditingId(null)
    const { error } = await supabase
      .from("chat_messages")
      .update({ body: text, edited_at: new Date().toISOString() })
      .eq("id", msgId)
    if (error) toast.error("Edit didn't save", { description: error.message })
  }

  // ---- delete ----
  async function deleteMessage(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true, body: "" } : m)),
    )
    const { error } = await supabase.from("chat_messages").update({ is_deleted: true, body: "" }).eq("id", msgId)
    if (error) toast.error("Delete didn't save", { description: error.message })
  }

  // ---- copy message text ----
  async function copyMessageText(msg: ChatMessage) {
    try {
      await navigator.clipboard.writeText(richTextToPlain(msg.body))
      toast.success("Copied")
    } catch {
      toast.error("Clipboard unavailable")
    }
  }

  // ---- create channel (wired to the multi-step modal) ----
  // Slack-style create-channel flow: channel insert + membership rows for
  // current user (admin) + every selected team member (member). If the
  // member inserts fail we delete the just-inserted channel so the DB
  // doesn't end up with an orphan.
  async function handleCreateChannel(
    payload: CreateChannelPayload,
  ): Promise<{ ok: boolean; errorMessage?: string }> {
    const { data: channelRow, error: channelErr } = await supabase
      .from("chat_channels")
      .insert({
        name: payload.name,
        description: payload.description || null,
        is_private: payload.isPrivate,
      })
      .select()
      .single()

    if (channelErr || !channelRow) {
      const msg = channelErr?.message ?? "Channel insert failed"
      toast.error("Couldn't create channel", { description: msg })
      return { ok: false, errorMessage: msg }
    }

    // Build membership rows. Current user is always admin; selected team
    // members (by id) are members. Denormalize name for fast list renders.
    const memberRows: Array<{
      channel_id: string
      user_id: string
      member_name: string
      role: "admin" | "member"
      added_by: string
    }> = [
      {
        channel_id: channelRow.id,
        user_id: CURRENT_USER_ID,
        member_name: CURRENT_USER,
        role: "admin",
        added_by: CURRENT_USER_ID,
      },
    ]
    for (const memberId of payload.memberIds) {
      const tm = teamMembers.find((m) => m.id === memberId)
      if (!tm || tm.name === CURRENT_USER) continue
      memberRows.push({
        channel_id: channelRow.id,
        user_id: tm.id,
        member_name: tm.name,
        role: "member",
        added_by: CURRENT_USER_ID,
      })
    }

    const { error: memberErr } = await supabase
      .from("chat_channel_members")
      .insert(memberRows)

    if (memberErr) {
      // Rollback the channel insert so we don't leave an orphan row.
      await supabase.from("chat_channels").delete().eq("id", channelRow.id)
      toast.error("Couldn't add members", { description: memberErr.message })
      return { ok: false, errorMessage: memberErr.message }
    }

    // Success path — update local state so the new channel is selected.
    setChannels((prev) => [...prev, channelRow as Channel])
    setSelectedChannelId(channelRow.id)
    setSelectedMember(null)
    setSelectedVendor(null)
    setDmChannelId(null)
    toast.success(
      `Created #${channelRow.name}`,
      { description: `${memberRows.length} member${memberRows.length === 1 ? "" : "s"} added` },
    )
    return { ok: true }
  }

  function findReplySource(replyToId: string | null | undefined): ChatMessage | undefined {
    if (!replyToId) return undefined
    return messages.find((m) => m.id === replyToId)
  }

  // ---- search messages ----
  const filteredMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) => m.body.toLowerCase().includes(q) || m.sender_name.toLowerCase().includes(q),
    )
  }, [messages, searchQuery, showSearch])

  const displayMessages = showSearch && searchQuery.trim() ? filteredMessages : messages

  // ---- quick switcher entries ----
  const switcherItems = useMemo(() => {
    const q = switcherQuery.trim().toLowerCase()
    const channelItems = channels
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((c) => ({ kind: "channel" as const, id: c.id, label: `#${c.name}`, ch: c }))
    const memberItems = teamMembers
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .map((m) => ({ kind: "member" as const, id: m.id, label: m.name, member: m }))
    return [...channelItems, ...memberItems].slice(0, 8)
  }, [switcherQuery, channels, teamMembers])

  // ---- render ----
  return (
    <div className="max-w-[1440px] mx-auto w-full">
      {/* Offline banner */}
      {!online && (
        <div
          className="mb-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          You&apos;re offline — messages will send when the connection is back.
        </div>
      )}

      <div className="h-[calc(100vh-120px)] flex rounded-lg border bg-card overflow-hidden">
        {/* ======== Left Sidebar ======== */}
        <div className="w-72 border-r flex flex-col bg-card">
          {/* Channels Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" aria-hidden="true" />
              Channels
            </h3>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
              aria-label="Create channel"
              title="Create channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channel List */}
          <div className="px-2 space-y-0.5">
            {channels.map((ch) => {
              const isActive = selectedChannelId === ch.id && !selectedMember && !selectedVendor
              const hasUnread = unreadChannels.has(ch.id) && !isActive
              return (
                <button
                  key={ch.id}
                  onClick={() => selectChannel(ch)}
                  aria-label={`Channel ${ch.name}${hasUnread ? ", unread" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  } ${hasUnread ? "font-semibold" : ""}`}
                >
                  <span className="text-muted-foreground">#</span>
                  <span className="flex-1 truncate">{ch.name}</span>
                  {hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Team */}
          <div className="px-4 pt-5 pb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
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
                  aria-label={`Direct message ${member.name}, status ${member.status}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {getInitials(member.name)}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_DOT[member.status] ?? STATUS_DOT.offline}`}
                      aria-hidden="true"
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
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
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
                  aria-label={`Direct message vendor ${vendor.name}`}
                  aria-current={isActive ? "page" : undefined}
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
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Header */}
          <div className="px-5 py-3 border-b flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{headerTitle}</div>
              {headerDescription && (
                <p className="text-xs text-muted-foreground truncate">{headerDescription}</p>
              )}
            </div>
            <kbd className="hidden md:inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              <span>⌘</span>K
            </kbd>
            <button
              onClick={() => { setShowSearch(!showSearch); setSearchQuery("") }}
              aria-label={showSearch ? "Close search" : "Search messages"}
              aria-pressed={showSearch}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                showSearch ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Search messages"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {showSearch && (
            <div className="px-5 py-2 border-b">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 rounded border px-3 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                aria-label="Search messages"
              />
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messagesLoading && messages.length === 0 ? (
              <MessageSkeleton />
            ) : (
              displayMessages.map((msg, idx) => {
                const prev = idx > 0 ? displayMessages[idx - 1] : null
                const showDateSep = !prev || isDifferentDay(prev.created_at, msg.created_at)
                const grouped = prev && !showDateSep && isSameGroup(prev, msg)
                const isMe = msg.sender_name === CURRENT_USER
                const senderAvatar = avatarMap[msg.sender_name] ?? null
                const replySrc = findReplySource(msg.reply_to)
                const isHovered = hoveredMsgId === msg.id
                const isEditing = editingId === msg.id
                const isPending = msg.__status === "pending"
                const isFailed = msg.__status === "failed"
                const showUnreadDivider = unreadBoundaryId === msg.id

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
                    {showDateSep && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs font-medium text-muted-foreground">{formatDate(msg.created_at)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}

                    {showUnreadDivider && (
                      <div className="flex items-center gap-3 py-2" role="separator" aria-label="New messages">
                        <div className="flex-1 h-px bg-red-500/40" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                          New
                        </span>
                        <div className="flex-1 h-px bg-red-500/40" />
                      </div>
                    )}

                    <div
                      className={`relative group flex gap-3 items-start rounded-md transition-colors animate-[messageIn_160ms_ease-out] ${
                        grouped ? "py-0.5 pl-11" : "py-2"
                      } ${isHovered ? "bg-muted/40" : "hover:bg-muted/30"} ${isPending ? "opacity-60" : ""} ${isFailed ? "bg-red-50/40" : ""}`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { setHoveredMsgId(null); if (emojiPickerMsgId === msg.id) setEmojiPickerMsgId(null) }}
                    >
                      {!grouped && (
                        <div className="shrink-0">
                          {senderAvatar ? (
                            <img src={senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
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

                      <div className="flex-1 min-w-0">
                        {!grouped && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold">{msg.sender_name}</span>
                            <span className="text-xs text-muted-foreground" title={new Date(msg.created_at).toLocaleString()}>
                              {formatTime(msg.created_at)}
                            </span>
                            {msg.edited_at && (
                              <span className="text-[10px] text-muted-foreground">(edited)</span>
                            )}
                          </div>
                        )}

                        {replySrc && (
                          <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                            <Reply className="w-3 h-3 rotate-180" aria-hidden="true" />
                            <span className="font-medium">{replySrc.sender_name}</span>
                            <span className="truncate max-w-xs opacity-70">{richTextToPlain(replySrc.body).slice(0, 80)}</span>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="flex gap-2 items-end mt-0.5">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 min-h-[36px] max-h-[100px] rounded border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                              autoFocus
                              aria-label="Edit message"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id) }
                                if (e.key === "Escape") setEditingId(null)
                              }}
                            />
                            <button
                              onClick={() => saveEdit(msg.id)}
                              className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer active:scale-95"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="h-8 px-3 rounded border text-xs font-medium hover:bg-muted cursor-pointer active:scale-95"
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
                            {msg.attachments && msg.attachments.length > 0 && (
                              <MessageAttachments attachments={msg.attachments} />
                            )}
                          </>
                        )}

                        {msg.reactions && (
                          <ReactionPills
                            reactions={msg.reactions}
                            onToggle={(emoji) => toggleReaction(msg.id, emoji)}
                          />
                        )}

                        {/* Failed state — inline retry */}
                        {isFailed && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-red-600">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            <span>Failed to send.</span>
                            <button
                              onClick={() => retryMessage(msg.id)}
                              className="inline-flex items-center gap-0.5 font-medium underline hover:no-underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" aria-hidden="true" />
                              Retry
                            </button>
                          </div>
                        )}
                      </div>

                      {isHovered && !isEditing && !isPending && !isFailed && (
                        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-card border rounded-md shadow-sm px-1 py-0.5 z-10 animate-[toolbarIn_120ms_ease-out]">
                          <button
                            onClick={() => setReplyTo(msg)}
                            aria-label="Reply to message"
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                            aria-label="Add reaction"
                            aria-expanded={emojiPickerMsgId === msg.id}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
                            title="React"
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => copyMessageText(msg)}
                            aria-label="Copy message text"
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {isMe && (
                            <>
                              <button
                                onClick={() => { setEditingId(msg.id); setEditValue(msg.body) }}
                                aria-label="Edit message"
                                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                aria-label="Delete message"
                                className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-95"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {emojiPickerMsgId === msg.id && (
                            <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg p-1.5 flex gap-1 z-20 animate-[toolbarIn_100ms_ease-out]">
                              {QUICK_EMOJIS.map((e) => (
                                <button
                                  key={e.label}
                                  onClick={() => toggleReaction(msg.id, e.emoji)}
                                  aria-label={`React with ${e.label}`}
                                  className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-base transition-colors cursor-pointer active:scale-95"
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
              })
            )}

            {!messagesLoading && displayMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
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

          {/* "New messages" floating pill — only when not at bottom */}
          {newMessagesCount > 0 && (
            <button
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                setNewMessagesCount(0)
                if (activeChatId) markAsRead(activeChatId, activeChatIsDm)
              }}
              aria-label={`Scroll to ${newMessagesCount} new message${newMessagesCount === 1 ? "" : "s"}`}
              className="absolute bottom-[7.5rem] right-5 z-20 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90 cursor-pointer active:scale-95 animate-[toolbarIn_160ms_ease-out]"
            >
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              {newMessagesCount} new
            </button>
          )}

          {replyTo && (
            <div className="px-5 py-2 border-t bg-muted/30 flex items-center gap-3">
              <Reply className="w-4 h-4 text-muted-foreground shrink-0 rotate-180" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold">{replyTo.sender_name}</span>
                <p className="text-xs text-muted-foreground truncate">{richTextToPlain(replyTo.body).slice(0, 100)}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="px-5 py-2 border-t bg-muted/20">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingFiles.map((pf, i) => (
                  <AttachmentPreview
                    key={`${pf.file.name}-${pf.file.size}-${pf.file.lastModified}-${i}`}
                    att={pf}
                    onRemove={() => removePendingFile(i)}
                  />
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
              aria-hidden="true"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeChatId}
              aria-label="Attach file"
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer shrink-0 active:scale-95"
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
              onClick={() => handleSend()}
              disabled={
                (!richTextToPlain(inputValue).trim() && !pendingFiles.some((p) => p.uploaded)) ||
                pendingFiles.some((p) => p.uploading) ||
                !activeChatId ||
                sending
              }
              aria-label={sending ? "Sending" : pendingFiles.some((p) => p.uploading) ? "Uploading attachments" : "Send message"}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0 active:scale-95"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              {sending ? "Sending..." : pendingFiles.some((p) => p.uploading) ? "Uploading..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Cmd/Ctrl+K Switcher */}
      {switcherOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm animate-[toolbarIn_120ms_ease-out]"
          onClick={() => setSwitcherOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Jump to channel or person"
        >
          <div
            className="w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                autoFocus
                value={switcherQuery}
                onChange={(e) => setSwitcherQuery(e.target.value)}
                placeholder="Jump to channel or person…"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                aria-label="Jump to channel or person"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && switcherItems.length > 0) {
                    const first = switcherItems[0]
                    if (first.kind === "channel") selectChannel(first.ch)
                    else selectMember(first.member)
                    setSwitcherOpen(false)
                  }
                }}
              />
              <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                Esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-1">
              {switcherItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matches.</p>
              ) : (
                switcherItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.kind === "channel") selectChannel(item.ch)
                      else selectMember(item.member)
                      setSwitcherOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    {item.kind === "channel" ? (
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180" aria-hidden="true" />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {i === 0 && (
                      <kbd className="rounded border bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        ↵
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Create-channel multi-step modal */}
      <CreateChannelModal
        open={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleCreateChannel}
        teamMembers={teamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          avatar_url: m.avatar_url,
        }))}
        currentUserName={CURRENT_USER}
        currentUserAvatar={avatarMap[CURRENT_USER]}
      />
    </div>
  )
}
