import { ShieldCheck, CheckCircle2, Hourglass, XCircle } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
} from "@/components/shared/kanban-board"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { visaStatusTone } from "../_lib/format"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Visas — Goyo | Suprans" }

interface VisaRow {
  id: string
  booking_id: string | null
  traveller_name: string | null
  country: string | null
  visa_type: string | null
  submission_date: string | null
  expected_date: string | null
  status: string | null
}

const COLUMNS: KanbanColumn[] = [
  { key: "pending", label: "Pending", tone: "slate" },
  { key: "submitted", label: "Submitted", tone: "amber" },
  { key: "approved", label: "Approved", tone: "emerald" },
  { key: "rejected", label: "Rejected", tone: "red" },
  { key: "on_arrival", label: "On arrival", tone: "blue" },
]

export default async function GoyoVisasPage() {
  const visasRes = await supabaseGoyo
    .from("visas")
    .select(
      "id, booking_id, traveller_name, country, visa_type, submission_date, expected_date, status",
    )
    .order("expected_date", { ascending: true, nullsFirst: false })

  if (visasRes.error) console.error("goyo.visas:", visasRes.error.message)

  const visas = (visasRes.data ?? []) as VisaRow[]

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const isThisMonth = (iso: string | null) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === year && d.getMonth() === month
  }

  const approvedThisMonth = visas.filter(
    (v) => v.status === "approved" && isThisMonth(v.expected_date),
  ).length
  const inFlight = visas.filter(
    (v) => v.status === "pending" || v.status === "submitted",
  ).length
  const rejected = visas.filter((v) => v.status === "rejected").length

  const cards: KanbanCard[] = visas.map((v) => ({
    id: v.id,
    columnKey: v.status ?? "pending",
    title: v.traveller_name ?? "—",
    subtitle: [v.country, v.visa_type].filter(Boolean).join(" · ") || "—",
    meta: v.expected_date ? `Expected ${formatDate(v.expected_date)}` : null,
    badge: v.status
      ? { label: v.status, tone: visaStatusTone(v.status) }
      : undefined,
    href: v.booking_id ? `/goyo/bookings/${v.booking_id}` : undefined,
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Visas"
        subtitle={`${visas.length.toLocaleString("en-IN")} visa${visas.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="visas"
            listHref="/goyo/visas"
            title="New visa"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={visas.length.toLocaleString("en-IN")}
          icon={ShieldCheck}
          iconTone="blue"
        />
        <MetricCard
          label="Approved this month"
          value={approvedThisMonth.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Pending + submitted"
          value={inFlight.toLocaleString("en-IN")}
          icon={Hourglass}
          iconTone="amber"
        />
        <MetricCard
          label="Rejected"
          value={rejected.toLocaleString("en-IN")}
          icon={XCircle}
          iconTone="red"
        />
      </KPIGrid>

      <KanbanBoard
        columns={COLUMNS}
        cards={cards}
        emptyColumnMessage="No visas"
      />
    </div>
  )
}
