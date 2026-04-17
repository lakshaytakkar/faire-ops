import { Inbox, Flame, Clock, Plus } from "lucide-react"
import { supabaseChinaimports } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { QueueClient, type OpsQueueRow } from "./queue-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Sourcing queue — chinaimports.in | Suprans" }

interface RFQLite {
  id: string
  rfq_number: string
  buyer_company: string
  product_name: string
  stage: string
  priority: string
  timeline_kind: string
  created_at: string | null
}

async function fetchQueue() {
  const [queueRes, rfqRes] = await Promise.all([
    supabaseChinaimports
      .from("ops_queue")
      .select(
        "id, rfq_id, buyer_company, product_summary, priority, bucket, assigned_ops_id, assigned_agent_key, age_hours_on_submit, last_action_at, last_action_summary, is_active, created_at",
      )
      .eq("is_active", true)
      .order("last_action_at", { ascending: false })
      .limit(200),
    supabaseChinaimports
      .from("rfqs")
      .select("id, rfq_number, buyer_company, product_name, stage, priority, timeline_kind, created_at"),
  ])

  if (queueRes.error) console.error("chinaimports.ops_queue:", queueRes.error.message)
  const rfqMap = new Map<string, RFQLite>((rfqRes.data ?? []).map((r) => [r.id as string, r as RFQLite]))

  const rows: OpsQueueRow[] = (queueRes.data ?? []).map((q) => {
    const rfq = q.rfq_id ? rfqMap.get(q.rfq_id as string) : undefined
    return {
      id: q.id as string,
      rfq_id: (q.rfq_id as string | null) ?? null,
      rfq_number: rfq?.rfq_number ?? "—",
      buyer_company: (q.buyer_company as string) ?? rfq?.buyer_company ?? "—",
      product_summary: (q.product_summary as string) ?? rfq?.product_name ?? "—",
      priority: (q.priority as string) ?? "medium",
      bucket: (q.bucket as string) ?? "new",
      stage: rfq?.stage ?? null,
      timeline_kind: rfq?.timeline_kind ?? null,
      assigned_agent_key: (q.assigned_agent_key as string | null) ?? null,
      age_hours_on_submit: Number(q.age_hours_on_submit ?? 0),
      last_action_at: (q.last_action_at as string | null) ?? null,
      last_action_summary: (q.last_action_summary as string | null) ?? null,
    }
  })
  return rows
}

export default async function ChinaimportsQueuePage() {
  const rows = await fetchQueue()

  const urgentCount = rows.filter((r) => r.priority === "urgent" || r.priority === "high").length
  const avgAgeHours = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.age_hours_on_submit || 0), 0) / rows.length)
    : 0
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const newToday = rows.filter((r) => r.last_action_at && new Date(r.last_action_at) >= todayStart).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Sourcing queue"
        subtitle="Every active RFQ, bucketed by where it sits in the 9-stage pipeline."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            New RFQ
          </button>
        }
      />

      <KPIGrid>
        <MetricCard label="Total open"       value={rows.length}   icon={Inbox}  iconTone="blue" />
        <MetricCard label="Urgent + high"    value={urgentCount}   icon={Flame}  iconTone="red"     hint="needs a quote today" />
        <MetricCard label="Avg age"          value={`${avgAgeHours}h`} icon={Clock} iconTone="amber"  hint="since submission" />
        <MetricCard label="New today"        value={newToday}      icon={Inbox}  iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Queue is empty"
          description="RFQs submitted on chinaimports.in land here once sourcing is triggered."
        />
      ) : (
        <QueueClient rows={rows} />
      )}
    </div>
  )
}
