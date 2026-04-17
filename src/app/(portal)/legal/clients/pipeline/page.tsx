import { Layers, Clock, Loader2, CheckCircle2, Pause, XCircle } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { KanbanBoard, type KanbanColumn, type KanbanCard } from "@/components/shared/kanban-board"
import { formatINR, planTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Client Pipeline — Legal | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  plan: string | null
  client_health: string | null
  llc_status: string | null
  amount_received: number | null
  date_of_payment: string | null
}

const columns: KanbanColumn[] = [
  { key: "Pending", label: "Pending", tone: "amber" },
  { key: "Processing", label: "Processing", tone: "blue" },
  { key: "Delivered", label: "Delivered", tone: "emerald" },
  { key: "On Hold", label: "On Hold", tone: "slate" },
  { key: "Cancelled", label: "Cancelled", tone: "red" },
]

export default async function ClientPipelinePage() {
  const { data, error } = await supabaseLegal
    .from("clients")
    .select(
      "id, client_code, client_name, plan, client_health, llc_status, amount_received, date_of_payment",
    )
    .order("created_at", { ascending: false })

  if (error) console.error("legal.clients pipeline:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const cards: KanbanCard[] = rows.map((c) => ({
    id: c.id,
    columnKey: c.llc_status || "Pending",
    title: c.client_name ?? "—",
    subtitle: c.client_code ?? undefined,
    meta: formatINR(c.amount_received),
    badge: { label: c.plan || "—", tone: planTone(c.plan) },
    href: `/legal/clients/${c.id}`,
  }))

  const countByStatus = (key: string) =>
    rows.filter((r) => (r.llc_status || "Pending") === key).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Client Pipeline"
        subtitle={`${rows.length.toLocaleString("en-IN")} client${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Pending" value={countByStatus("Pending")} icon={Clock} iconTone="amber" />
        <MetricCard label="Processing" value={countByStatus("Processing")} icon={Loader2} iconTone="blue" />
        <MetricCard label="Delivered" value={countByStatus("Delivered")} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="On Hold" value={countByStatus("On Hold")} icon={Pause} iconTone="slate" />
        <MetricCard label="Cancelled" value={countByStatus("Cancelled")} icon={XCircle} iconTone="red" />
      </KPIGrid>

      <KanbanBoard columns={columns} cards={cards} />
    </div>
  )
}
