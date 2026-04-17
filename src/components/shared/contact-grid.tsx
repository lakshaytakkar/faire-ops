// ContactGrid — responsive card grid for people directories.
// Typical uses: retailer contacts, vendor reps, supplier roster, team page.
// Avatars fall back to initials on a deterministic hue gradient derived from
// the contact name so the same person keeps the same colour across renders.

import Link from "next/link"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatInitials, relativeTime } from "@/lib/format"
import { StatusBadge, type StatusTone } from "./status-badge"
import { EmptyState } from "./empty-state"

export interface ContactCard {
  id: string
  name: string
  avatarUrl?: string | null
  initials?: string
  role?: string
  lastInteraction?: string | Date
  badge?: { label: string; tone?: StatusTone }
  href?: string
}

export function ContactGrid({
  contacts,
  emptyMessage = "No contacts yet.",
}: {
  contacts: ContactCard[]
  emptyMessage?: string
}) {
  if (contacts.length === 0) {
    return <EmptyState title="No contacts" description={emptyMessage} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {contacts.map((contact) => (
        <ContactGridCard key={contact.id} contact={contact} />
      ))}
    </div>
  )
}

function ContactGridCard({ contact }: { contact: ContactCard }) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 flex items-start gap-3 transition-colors h-full",
        contact.href && "hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      <Avatar
        name={contact.name}
        url={contact.avatarUrl}
        initials={contact.initials ?? formatInitials(contact.name)}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold tracking-tight text-foreground truncate">
            {contact.name}
          </div>
          {contact.badge && (
            <StatusBadge tone={contact.badge.tone ?? "slate"}>{contact.badge.label}</StatusBadge>
          )}
        </div>
        {contact.role && (
          <div className="text-sm text-muted-foreground truncate">{contact.role}</div>
        )}
        {contact.lastInteraction && (
          <div className="text-sm text-muted-foreground tabular-nums">
            Last contact {relativeTime(contact.lastInteraction)}
          </div>
        )}
      </div>
    </div>
  )

  if (contact.href) {
    return (
      <Link href={contact.href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}

function hashHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 360
}

function Avatar({
  name,
  url,
  initials,
}: {
  name: string
  url?: string | null
  initials: string
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="size-10 rounded-full object-cover shrink-0 ring-1 ring-border"
      />
    )
  }
  const hue = hashHue(name)
  const bg = `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`
  return (
    <div
      className="size-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white ring-1 ring-border/40"
      style={{ background: bg }}
      aria-hidden
    >
      {initials}
    </div>
  )
}
