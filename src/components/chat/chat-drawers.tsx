"use client"

/**
 * Right-side drawer pair for the chat page — channel details + person
 * profile. Lives inside the chat right-main area (flex sibling of the
 * message column), so opening one compresses messages rather than
 * overlaying the whole app. Slide-in via the drawerIn keyframe.
 *
 * ChannelDrawer supports full admin controls: inline edit (name,
 * description, public/private), add members, remove members, delete
 * channel. Non-admins see a Leave channel action.
 *
 * ProfileDrawer supports quick "Send message" and a shared-channels
 * list computed client-side from the preloaded membership cache.
 *
 * Typography + spacing harmonised with the rest of the portal:
 *   - body copy: text-sm
 *   - secondary copy: text-xs
 *   - uppercase labels: text-[10px] font-bold uppercase tracking-wider
 *   - input fields: h-9 rounded-md border-border/80 bg-background px-3 text-sm
 *   - primary buttons: h-9 px-3 rounded-md bg-primary text-primary-foreground
 *   - destructive buttons: h-9 px-3 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/15
 *   - icon buttons: w-8 h-8 rounded-md
 *   - every interactive element ends with active:scale-95
 */

import { useEffect, useMemo, useRef, useState } from "react"
import {
  X,
  Hash,
  Lock,
  Globe,
  UserPlus,
  UserMinus,
  MessageCircle,
  Clock,
  Users,
  Mail,
  Phone as PhoneIcon,
  Briefcase,
  Building2,
  CheckCircle2,
  Pencil,
  Trash2,
  LogOut,
  Check,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
}

const STATUS_LABEL: Record<string, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Shared shell                                                       */
/* ------------------------------------------------------------------ */

function DrawerShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <aside
      className="w-[340px] shrink-0 border-l border-border/80 bg-card flex flex-col animate-[drawerIn_200ms_ease-out]"
      role="complementary"
    >
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border/80">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground leading-tight truncate">
            {title}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/*  Channel drawer                                                     */
/* ------------------------------------------------------------------ */

interface MemberRow {
  user_id: string
  member_name: string
  role: "admin" | "member"
  joined_at: string | null
}

interface TeamMemberLite {
  id: string
  name: string
  role: string
  status: "online" | "away" | "offline"
  avatar_url?: string | null
}

export interface ChannelDrawerChannel {
  id: string
  name: string
  description: string | null
  is_private?: boolean
  created_at: string
}

interface ChannelDrawerProps {
  channel: ChannelDrawerChannel
  teamMembers: TeamMemberLite[]
  /** Current user's name — used to detect admin status + enable Leave. */
  currentUserName: string
  onClose: () => void
  onPickMember: (memberName: string) => void
  onRequestAddMembers: () => void
  onRequestDelete: () => void
  onRequestLeave: () => void
  onRequestRemoveMember: (row: MemberRow) => void
  onUpdateChannel: (patch: {
    name?: string
    description?: string | null
    is_private?: boolean
  }) => Promise<{ ok: boolean; errorMessage?: string }>
  /** Trigger from the parent to refetch the roster — e.g. after an
   * add-members modal adds someone. */
  reloadKey?: number
}

export function ChannelDrawer({
  channel,
  teamMembers,
  currentUserName,
  onClose,
  onPickMember,
  onRequestAddMembers,
  onRequestDelete,
  onRequestLeave,
  onRequestRemoveMember,
  onUpdateChannel,
  reloadKey = 0,
}: ChannelDrawerProps) {
  const [rows, setRows] = useState<MemberRow[] | null>(null)
  const [rowsError, setRowsError] = useState<string | null>(null)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(channel.name)
  const [editDesc, setEditDesc] = useState(channel.description ?? "")
  const [editPrivate, setEditPrivate] = useState(!!channel.is_private)
  const [savingEdit, setSavingEdit] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditName(channel.name)
    setEditDesc(channel.description ?? "")
    setEditPrivate(!!channel.is_private)
    setEditing(false)
  }, [channel.id, channel.name, channel.description, channel.is_private])

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => nameInputRef.current?.focus())
    }
  }, [editing])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setRows(null)
      setRowsError(null)
      const { data, error } = await supabase
        .from("chat_channel_members")
        .select("user_id, member_name, role, joined_at")
        .eq("channel_id", channel.id)
        .order("role", { ascending: true })
      if (cancelled) return
      if (error) {
        setRowsError(error.message)
        setRows([])
      } else {
        setRows((data ?? []) as MemberRow[])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [channel.id, reloadKey])

  const tmByName = useMemo(() => {
    const map = new Map<string, TeamMemberLite>()
    for (const m of teamMembers) map.set(m.name, m)
    return map
  }, [teamMembers])

  const isPrivate = !!channel.is_private
  const memberCount = rows?.length ?? 0

  // Current user's membership + role in this channel (if any)
  const meRow = rows?.find((r) => r.member_name === currentUserName)
  const iAmAdmin = meRow?.role === "admin"
  const iAmMember = !!meRow

  const existingNames = useMemo(() => rows?.map((r) => r.member_name) ?? [], [rows])

  async function handleSaveEdit() {
    const trimmedName = editName.trim().toLowerCase().replace(/\s+/g, "-")
    if (!trimmedName) return
    setSavingEdit(true)
    const res = await onUpdateChannel({
      name: trimmedName,
      description: editDesc.trim() || null,
      is_private: editPrivate,
    })
    setSavingEdit(false)
    if (res.ok) setEditing(false)
  }

  function handleCancelEdit() {
    setEditName(channel.name)
    setEditDesc(channel.description ?? "")
    setEditPrivate(!!channel.is_private)
    setEditing(false)
  }

  return (
    <DrawerShell
      title={
        <span className="inline-flex items-center gap-1.5">
          {isPrivate ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {channel.name}
        </span>
      }
      subtitle={`${isPrivate ? "Private" : "Public"} channel`}
      onClose={onClose}
    >
      {/* About */}
      <section className="px-4 py-4 border-b border-border/80">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            About
          </h3>
          {iAmAdmin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit channel"
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2 h-7 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="edit-channel-name"
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Name
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  #
                </span>
                <input
                  ref={nameInputRef}
                  id="edit-channel-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 rounded-md border border-border/80 bg-background pl-6 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={60}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="edit-channel-desc"
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Description
              </label>
              <textarea
                id="edit-channel-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                maxLength={240}
                className="mt-1 w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Visibility
              </p>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditPrivate(false)}
                  aria-pressed={!editPrivate}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 h-9 text-xs font-medium transition-all active:scale-95 ${
                    !editPrivate
                      ? "border-primary/50 bg-primary/5 text-primary"
                      : "border-border/80 bg-background text-foreground hover:border-foreground/20"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setEditPrivate(true)}
                  aria-pressed={editPrivate}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 h-9 text-xs font-medium transition-all active:scale-95 ${
                    editPrivate
                      ? "border-primary/50 bg-primary/5 text-primary"
                      : "border-border/80 bg-background text-foreground hover:border-foreground/20"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Private
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || editName.trim().length < 2}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50"
              >
                {savingEdit && (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                )}
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="h-9 px-3 rounded-md border border-border/80 bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {channel.description ? (
              <p className="text-sm text-foreground leading-snug">
                {channel.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description yet.
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Created {formatFullDate(channel.created_at)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="px-4 py-4 border-b border-border/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {rows === null ? "Members" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
          </h3>
          {iAmAdmin && (
            <button
              type="button"
              onClick={onRequestAddMembers}
              aria-label="Add people to channel"
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2 h-7 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            >
              <UserPlus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>

        {rows === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 animate-pulse"
              >
                <div className="w-7 h-7 rounded-full bg-muted" />
                <div className="h-3 w-28 rounded bg-muted/80" />
              </div>
            ))}
          </div>
        ) : rowsError ? (
          <p className="text-xs text-destructive">
            Couldn&apos;t load members: {rowsError}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            No members yet. {iAmAdmin && "Click Add to invite the team."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((r) => {
              const tm = tmByName.get(r.member_name)
              const status = tm?.status ?? "offline"
              const isMeRow = r.member_name === currentUserName
              return (
                <li
                  key={r.user_id}
                  className="relative group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onPickMember(r.member_name)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    aria-label={`Open profile for ${r.member_name}`}
                  >
                    <div className="relative shrink-0">
                      {tm?.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tm.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {getInitials(r.member_name)}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_DOT[status] ?? STATUS_DOT.offline}`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {r.member_name}
                        {isMeRow && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            you
                          </span>
                        )}
                      </p>
                      {tm?.role && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tm.role}
                        </p>
                      )}
                    </div>
                    {r.role === "admin" && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shrink-0">
                        Admin
                      </span>
                    )}
                  </button>
                  {iAmAdmin && !isMeRow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRequestRemoveMember(r)
                      }}
                      aria-label={`Remove ${r.member_name} from channel`}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Danger zone — admins see Delete, members see Leave */}
      <section className="px-4 py-4 space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {iAmAdmin ? "Admin" : "Actions"}
        </h3>
        {iAmMember && !iAmAdmin && (
          <button
            type="button"
            onClick={onRequestLeave}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-border/80 bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            aria-label="Leave channel"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave #{channel.name}
          </button>
        )}
        {iAmAdmin && (
          <button
            type="button"
            onClick={onRequestDelete}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
            aria-label="Delete channel"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete #{channel.name}
          </button>
        )}
      </section>
    </DrawerShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Profile drawer                                                     */
/* ------------------------------------------------------------------ */

export type ProfileSubject =
  | {
      kind: "team"
      id: string
      name: string
      role: string
      status: "online" | "away" | "offline"
      avatar_url?: string | null
      email?: string | null
      phone?: string | null
    }
  | {
      kind: "vendor"
      id: string
      name: string
      contact_name: string | null
      email?: string | null
      phone?: string | null
    }

export function ProfileDrawer({
  subject,
  onClose,
  onStartDm,
  currentUserName,
  sharedChannelNames,
}: {
  subject: ProfileSubject
  onClose: () => void
  onStartDm: (name: string) => void
  currentUserName: string
  sharedChannelNames: string[]
}) {
  const isSelf = subject.kind === "team" && subject.name === currentUserName

  return (
    <DrawerShell
      title="Profile"
      subtitle={subject.kind === "team" ? "Team member" : "Vendor contact"}
      onClose={onClose}
    >
      {/* Hero */}
      <section className="px-4 py-5 border-b border-border/80">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {subject.kind === "team" && subject.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={subject.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full object-cover ring-2 ring-card"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-base font-bold ${
                  subject.kind === "vendor"
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {getInitials(subject.name)}
              </div>
            )}
            {subject.kind === "team" && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${STATUS_DOT[subject.status] ?? STATUS_DOT.offline}`}
                aria-label={STATUS_LABEL[subject.status] ?? "Offline"}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold font-heading text-foreground leading-tight truncate">
                {subject.name}
              </h3>
              {isSelf && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  You
                </span>
              )}
            </div>
            {subject.kind === "team" && subject.role && (
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {subject.role}
              </p>
            )}
            {subject.kind === "vendor" && subject.contact_name && (
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                {subject.contact_name}
              </p>
            )}
            {subject.kind === "team" && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[subject.status] ?? STATUS_DOT.offline}`}
                  aria-hidden="true"
                />
                {STATUS_LABEL[subject.status] ?? "Offline"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      {!isSelf && (
        <section className="px-4 py-3 border-b border-border/80">
          <button
            type="button"
            onClick={() => onStartDm(subject.name)}
            className="w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
            aria-label={`Send message to ${subject.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Send message
          </button>
        </section>
      )}

      {/* Details */}
      <section className="px-4 py-4 border-b border-border/80 space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {subject.kind === "vendor" ? "Vendor details" : "Contact"}
        </h3>
        {subject.kind === "team" ? (
          <>
            <DetailRow
              icon={Briefcase}
              label="Role"
              value={subject.role || "—"}
            />
            {subject.email && (
              <DetailRow
                icon={Mail}
                label="Email"
                value={subject.email}
                href={`mailto:${subject.email}`}
              />
            )}
            {subject.phone && (
              <DetailRow
                icon={PhoneIcon}
                label="Phone"
                value={subject.phone}
                href={`tel:${subject.phone}`}
              />
            )}
          </>
        ) : (
          <>
            <DetailRow
              icon={Building2}
              label="Vendor"
              value={subject.name}
            />
            {subject.contact_name && (
              <DetailRow
                icon={Briefcase}
                label="Contact"
                value={subject.contact_name}
              />
            )}
            {subject.email && (
              <DetailRow
                icon={Mail}
                label="Email"
                value={subject.email}
                href={`mailto:${subject.email}`}
              />
            )}
            {subject.phone && (
              <DetailRow
                icon={PhoneIcon}
                label="Phone"
                value={subject.phone}
                href={`tel:${subject.phone}`}
              />
            )}
          </>
        )}
      </section>

      {/* Shared channels */}
      {subject.kind === "team" && !isSelf && (
        <section className="px-4 py-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Hash className="h-3 w-3" />
            {sharedChannelNames.length === 0
              ? "No shared channels"
              : `${sharedChannelNames.length} shared channel${sharedChannelNames.length === 1 ? "" : "s"}`}
          </h3>
          {sharedChannelNames.length > 0 ? (
            <ul className="space-y-0.5">
              {sharedChannelNames.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 text-sm text-foreground"
                >
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate flex-1">{name}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Once you&apos;re both in a channel it will show up here.
            </p>
          )}
        </section>
      )}
    </DrawerShell>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="text-sm text-foreground hover:text-primary transition-colors truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  )
}
