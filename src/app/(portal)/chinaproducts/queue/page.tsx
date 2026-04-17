import Link from "next/link"
import { Headphones, Flame, Clock, IndianRupee, Inbox } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { QueueClient, type RepQueueRow } from "./queue-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rep Queue — chinaproducts.in | Suprans" }

async function fetchQueue() {
  const { data, error } = await supabaseChinaproducts
    .from("rep_queue")
    .select(
      "id, buyer_name, buyer_company, buyer_phone, buyer_email, intent, priority, potential_value_inr, last_activity_at, last_activity_summary, status, created_at",
    )
    .order("last_activity_at", { ascending: false })
    .limit(500)
  if (error) console.error("chinaproducts.rep_queue:", error.message)
  return (data ?? []) as RepQueueRow[]
}

export default async function ChinaproductsQueuePage() {
  const rows = await fetchQueue()

  const openCount = rows.filter((r) => r.status === "open").length
  const highPriority = rows.filter((r) => r.priority === "high" && r.status !== "resolved" && r.status !== "dropped").length
  const nowMs = Date.now()
  const liveRows = rows.filter((r) => r.status === "open" || r.status === "in_progress")
  const avgAgeHours = liveRows.length
    ? Math.round(
        liveRows.reduce((sum, r) => {
          const ts = r.last_activity_at ? new Date(r.last_activity_at).getTime() : nowMs
          return sum + (nowMs - ts) / (1000 * 60 * 60)
        }, 0) / liveRows.length,
      )
    : 0
  const potentialTotal = liveRows.reduce((sum, r) => sum + (Number(r.potential_value_inr) || 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Customer queue"
        subtitle="Live customer intents surfaced for the rep team — call, resolve, or escalate."
      />

      <KPIGrid>
        <MetricCard
          label="Open queue"
          value={openCount}
          icon={Headphones}
          iconTone="blue"
          hint={`${rows.length} total`}
        />
        <MetricCard
          label="High priority"
          value={highPriority}
          icon={Flame}
          iconTone="red"
          hint="needs a call today"
        />
        <MetricCard
          label="Avg age"
          value={`${avgAgeHours}h`}
          icon={Clock}
          iconTone="amber"
          hint="across open + in-progress"
        />
        <MetricCard
          label="Potential value"
          value={`₹${potentialTotal.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          iconTone="emerald"
          hint="sum of open potential"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Queue is empty"
          description="Intents surface here when buyers hit pricing objections, cart abandons, or custom requests on chinaproducts.in."
          action={
            <Link
              href="/chinaproducts/scripts"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Review script library
            </Link>
          }
        />
      ) : (
        <QueueClient rows={rows} />
      )}
    </div>
  )
}
