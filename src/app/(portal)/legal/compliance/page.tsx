import { Calendar, AlertTriangle, CheckCircle2, FileText } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { CalendarGrid } from "@/components/shared/calendar-grid"
import { StatusBadge } from "@/components/shared/status-badge"
import { filingStageTone } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Compliance — Legal | Suprans" }

interface FilingRow {
  id: string
  llc_name: string | null
  filing_stage: string | null
  status: string | null
  state_annual_report_due: string | null
  annual_report_filed: boolean | null
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default async function CompliancePage() {
  const { data, error } = await supabaseLegal
    .from("tax_filings")
    .select(
      "id, llc_name, filing_stage, status, state_annual_report_due, annual_report_filed",
    )
    .order("state_annual_report_due", { ascending: true })

  if (error) console.error("legal.tax_filings compliance:", error.message)
  const rows = (data ?? []) as FilingRow[]

  // Parse dates
  const filings = rows
    .map((r) => ({ ...r, dueDate: parseDate(r.state_annual_report_due) }))
    .filter((r) => r.dueDate !== null) as (FilingRow & { dueDate: Date })[]

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const dueThisMonth = filings.filter(
    (f) => f.dueDate.getFullYear() === year && f.dueDate.getMonth() === month,
  )
  const pastDue = filings.filter(
    (f) => f.dueDate < now && !f.annual_report_filed,
  )
  const filed = rows.filter((r) => r.annual_report_filed === true)

  // Group filings by date string for calendar render
  const byDateKey = new Map<string, typeof filings>()
  for (const f of filings) {
    const key = `${f.dueDate.getFullYear()}-${f.dueDate.getMonth()}-${f.dueDate.getDate()}`
    if (!byDateKey.has(key)) byDateKey.set(key, [])
    byDateKey.get(key)!.push(f)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Compliance Calendar"
        subtitle={`${rows.length.toLocaleString("en-IN")} filing${rows.length === 1 ? "" : "s"} tracked`}
      />

      <KPIGrid>
        <MetricCard
          label="Due This Month"
          value={dueThisMonth.length}
          icon={Calendar}
          iconTone="amber"
        />
        <MetricCard
          label="Past Due"
          value={pastDue.length}
          icon={AlertTriangle}
          iconTone="red"
        />
        <MetricCard
          label="Filed"
          value={filed.length}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Total Filings"
          value={rows.length}
          icon={FileText}
          iconTone="slate"
        />
      </KPIGrid>

      <CalendarGrid
        year={year}
        month={month}
        render={(date) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          const dayFilings = byDateKey.get(key)
          if (!dayFilings || dayFilings.length === 0) return null
          return (
            <div className="flex flex-col gap-1">
              {dayFilings.map((f) => (
                <StatusBadge key={f.id} tone={filingStageTone(f.filing_stage)}>
                  {f.llc_name ?? "LLC"}
                </StatusBadge>
              ))}
            </div>
          )
        }}
      />
    </div>
  )
}
