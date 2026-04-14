import { Ticket, Inbox, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { TicketsClient, type TicketRow, type ProfileLite } from "./tickets-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tickets — USDrop | Suprans" }

async function fetchTickets() {
  const { data, error } = await supabaseUsdrop
    .from("support_tickets")
    .select(
      "id, user_id, title, type, priority, status, assigned_to, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) console.error("usdrop.support_tickets:", error.message)
  const rows = (data ?? []) as TicketRow[]
  const ids = Array.from(
    new Set([
      ...rows.map((r) => r.user_id).filter(Boolean),
      ...rows.map((r) => r.assigned_to).filter(Boolean),
    ] as string[]),
  )
  let profiles: ProfileLite[] = []
  if (ids.length > 0) {
    const { data: pdata } = await supabaseUsdrop
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
    profiles = (pdata ?? []) as ProfileLite[]
  }
  return { rows, profiles }
}

export default async function TicketsPage() {
  const { rows, profiles } = await fetchTickets()

  const statusCount = (key: string) =>
    rows.filter((r) => (r.status ?? "").toLowerCase() === key).length

  const openCount = statusCount("open")
  const pendingCount = statusCount("pending")
  const resolvedCount = statusCount("resolved")
  const urgentCount = rows.filter(
    (r) =>
      ["urgent", "high", "critical"].includes((r.priority ?? "").toLowerCase()) &&
      !["resolved", "closed"].includes((r.status ?? "").toLowerCase()),
  ).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Support tickets"
        subtitle={`${rows.length.toLocaleString("en-IN")} tickets (newest 200)`}
      />

      <KPIGrid>
        <MetricCard label="Open" value={openCount} icon={Inbox} iconTone="blue" hint="awaiting first reply" />
        <MetricCard label="Pending" value={pendingCount} icon={Clock} iconTone="amber" hint="waiting on user" />
        <MetricCard label="Resolved" value={resolvedCount} icon={CheckCircle2} iconTone="emerald" hint="closed out" />
        <MetricCard
          label="Urgent / high"
          value={urgentCount}
          icon={AlertTriangle}
          iconTone={urgentCount > 0 ? "red" : "slate"}
          hint="needs attention"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Inbox zero"
          description="No open support tickets — every client query is resolved. New tickets from the USDrop app show up here."
        />
      ) : (
        <TicketsClient rows={rows} profiles={profiles} />
      )}
    </div>
  )
}
