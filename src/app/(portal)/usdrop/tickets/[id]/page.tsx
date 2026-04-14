import { notFound } from "next/navigation"
import { supabaseUsdrop } from "@/lib/supabase"
import { FullPageDetail, DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { TicketReplyForm } from "./TicketReplyForm"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Ticket ${id.slice(0, 8)} — USDrop | Suprans` }
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return d
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

function formatInitials(name: string | null | undefined) {
  if (!name) return "??"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

async function fetchTicket(id: string) {
  const [ticket, messages] = await Promise.all([
    supabaseUsdrop
      .from("support_tickets")
      .select(
        "id, user_id, title, type, priority, status, assigned_to, escalated_to, resolution_notes, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("ticket_messages")
      .select("id, sender_id, content, is_internal, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ])
  if (!ticket.data) return null
  const profileIds = new Set<string>()
  if (ticket.data.user_id) profileIds.add(ticket.data.user_id)
  if (ticket.data.assigned_to) profileIds.add(ticket.data.assigned_to)
  for (const m of messages.data ?? []) {
    if (m.sender_id) profileIds.add(m.sender_id)
  }
  let profiles: Array<{ id: string; full_name: string | null; email: string | null }> = []
  if (profileIds.size > 0) {
    const { data: pdata } = await supabaseUsdrop
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(profileIds))
    profiles = pdata ?? []
  }
  return { ticket: ticket.data, messages: messages.data ?? [], profiles }
}

export default async function TicketDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const data = await fetchTicket(id)
  if (!data) notFound()
  const { ticket, messages, profiles } = data
  const pMap = new Map(profiles.map((p) => [p.id, p]))
  const user = ticket.user_id ? pMap.get(ticket.user_id) : undefined
  const agent = ticket.assigned_to ? pMap.get(ticket.assigned_to) : undefined

  return (
    <FullPageDetail
      backLink={{ href: "/usdrop/tickets", label: "All tickets" }}
      title={ticket.title ?? "Untitled ticket"}
      subtitle={user?.email ?? undefined}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {ticket.priority && (
          <StatusBadge tone={toneForStatus(ticket.priority)}>{ticket.priority}</StatusBadge>
        )}
        <StatusBadge tone={toneForStatus(ticket.status)}>{ticket.status ?? "—"}</StatusBadge>
        {ticket.type && <StatusBadge tone="slate">{ticket.type}</StatusBadge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 rounded-lg border border-border/80 bg-card shadow-sm divide-x text-sm overflow-hidden">
        <KpiTile label="User" value={user?.full_name ?? user?.email ?? "—"} />
        <KpiTile label="Assigned" value={agent?.full_name ?? agent?.email ?? "Unassigned"} />
        <KpiTile label="Opened" value={formatDate(ticket.created_at)} />
        <KpiTile label="Last update" value={formatDate(ticket.updated_at)} />
        <KpiTile label="Messages" value={String(messages.length)} />
        <KpiTile label="Priority" value={ticket.priority ?? "—"} />
      </div>

      <DetailCard title="Thread">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const sender = m.sender_id ? pMap.get(m.sender_id) : undefined
              return (
                <div
                  key={m.id}
                  className={
                    m.is_internal
                      ? "flex gap-3 -mx-5 px-5 py-3 bg-muted/40 rounded"
                      : "flex gap-3"
                  }
                >
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                    {formatInitials(sender?.full_name ?? sender?.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {sender?.full_name ?? sender?.email ?? "Unknown"}
                      </span>
                      {m.is_internal && (
                        <StatusBadge tone="amber">Internal note</StatusBadge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div className="pt-4 border-t">
            <TicketReplyForm ticketId={ticket.id} />
          </div>
        </div>
      </DetailCard>

      {ticket.resolution_notes && (
        <DetailCard title="Resolution notes">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {ticket.resolution_notes}
          </p>
        </DetailCard>
      )}
    </FullPageDetail>
  )
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold truncate">{value || "—"}</div>
    </div>
  )
}
