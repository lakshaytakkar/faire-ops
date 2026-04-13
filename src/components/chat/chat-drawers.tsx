"use client"

/**
 * Slack-style right-side drawer pair for the chat page:
 *
 *   <ChannelDrawer /> — channel info + member roster, click a member to
 *                       switch the drawer over to their profile.
 *   <ProfileDrawer /> — avatar, name, role, presence, quick actions
 *                       (Send message, Shared channels).
 *
 * Both drawers live INSIDE the chat right-main area (flex sibling of the
 * message column), not the viewport — so opening one compresses the
 * message list rather than overlaying the whole app. Slide-in via the
 * drawerIn keyframe in globals.css.
 *
 * The parent owns drawer state and the open/close handlers; the drawers
 * themselves are presentation-only with a single `onPickMember` escape
 * hatch so clicking a roster row can swap to the profile view.
 */

import { useEffect, useMemo, useState } from "react"
import {
  X,
  Hash,
  Lock,
  Globe,
  UserPlus,
  MessageCircle,
  Clock,
  Users,
  Mail,
  Phone as PhoneIcon,
  Briefcase,
  Building2,
  CheckCircle2,
  Circle,
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
  // Esc closes
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
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 shrink-0"
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

export function ChannelDrawer({
  channel,
  teamMembers,
  onClose,
  onPickMember,
  onAddMembersClick,
}: {
  channel: {
    id: string
    name: string
    description: string | null
    is_private?: boolean
    created_at: string
  }
  teamMembers: TeamMemberLite[]
  onClose: () => void
  onPickMember: (memberName: string) => void
  onAddMembersClick?: () => void
}) {
  const [rows, setRows] = useState<MemberRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setRows(null)
      const { data } = await supabase
        .from("chat_channel_members")
        .select("user_id, member_name, role, joined_at")
        .eq("channel_id", channel.id)
        .order("role", { ascending: true })
      if (!cancelled) setRows((data ?? []) as MemberRow[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [channel.id])

  const tmByName = useMemo(() => {
    const map = new Map<string, TeamMemberLite>()
    for (const m of teamMembers) map.set(m.name, m)
    return map
  }, [teamMembers])

  const isPrivate = !!channel.is_private
  const memberCount = rows?.length ?? 0

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
      <section className="px-4 py-3 border-b border-border/80">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          About
        </h3>
        <div className="space-y-2">
          {channel.description ? (
            <p className="text-xs text-foreground leading-snug">
              {channel.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No description yet.
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Created {formatFullDate(channel.created_at)}</span>
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {rows === null ? "Members" : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
          </h3>
          {onAddMembersClick && (
            <button
              type="button"
              onClick={onAddMembersClick}
              className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/60 transition-colors active:scale-95"
              aria-label="Add people to channel"
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
                <div className="h-3 w-24 rounded bg-muted/80" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No members yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((r) => {
              const tm = tmByName.get(r.member_name)
              const status = tm?.status ?? "offline"
              return (
                <li key={r.user_id}>
                  <button
                    type="button"
                    onClick={() => onPickMember(r.member_name)}
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left cursor-pointer active:scale-[0.98]"
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
                      </p>
                      {tm?.role && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {tm.role}
                        </p>
                      )}
                    </div>
                    {r.role === "admin" && (
                      <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shrink-0">
                        Admin
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
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
  /** Names of channels the viewer and this person are both in — computed
   * by the parent from the already-loaded chat_channel_members rows. */
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
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {subject.role}
              </p>
            )}
            {subject.kind === "vendor" && subject.contact_name && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {subject.contact_name}
              </p>
            )}
            {subject.kind === "team" && (
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
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
        <section className="px-4 py-3 border-b border-border/80 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onStartDm(subject.name)}
            className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
            aria-label={`Send message to ${subject.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Send message
          </button>
        </section>
      )}

      {/* Details */}
      <section className="px-4 py-3 border-b border-border/80 space-y-2">
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
        <section className="px-4 py-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Hash className="h-3 w-3" />
            {sharedChannelNames.length === 0
              ? "No shared channels"
              : `${sharedChannelNames.length} shared channel${sharedChannelNames.length === 1 ? "" : "s"}`}
          </h3>
          {sharedChannelNames.length > 0 && (
            <ul className="space-y-0.5">
              {sharedChannelNames.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40 text-sm text-foreground"
                >
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{name}</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                </li>
              ))}
            </ul>
          )}
          {sharedChannelNames.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
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
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="text-foreground hover:text-primary transition-colors truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  )
}
