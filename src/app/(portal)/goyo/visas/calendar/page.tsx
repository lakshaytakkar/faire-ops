import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Hourglass,
  PlaneTakeoff,
} from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { CalendarGrid } from "@/components/shared/calendar-grid"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Visas — calendar | Goyo | Suprans" }

interface VisaRow {
  id: string
  traveller_name: string | null
  country: string | null
  submission_date: string | null
  expected_date: string | null
  status: string | null
}

function statusToBgClass(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "bg-slate-400"
    case "submitted":
      return "bg-amber-500"
    case "approved":
      return "bg-emerald-500"
    case "rejected":
      return "bg-red-500"
    case "on_arrival":
      return "bg-blue-500"
    default:
      return "bg-slate-300"
  }
}

export default async function GoyoVisasCalendarPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10)
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)

  // Fetch any visa where submission_date OR expected_date falls in the month.
  const [bySubmission, byExpected] = await Promise.all([
    supabaseGoyo
      .from("visas")
      .select(
        "id, traveller_name, country, submission_date, expected_date, status",
      )
      .gte("submission_date", monthStart)
      .lte("submission_date", monthEnd),
    supabaseGoyo
      .from("visas")
      .select(
        "id, traveller_name, country, submission_date, expected_date, status",
      )
      .gte("expected_date", monthStart)
      .lte("expected_date", monthEnd),
  ])

  const merged = new Map<string, VisaRow>()
  for (const v of (bySubmission.data ?? []) as VisaRow[]) merged.set(v.id, v)
  for (const v of (byExpected.data ?? []) as VisaRow[]) merged.set(v.id, v)
  const items = [...merged.values()]

  const byDate = new Map<string, VisaRow[]>()
  for (const v of items) {
    const key = (v.submission_date ?? v.expected_date ?? "").slice(0, 10)
    if (!key) continue
    const list = byDate.get(key) ?? []
    list.push(v)
    byDate.set(key, list)
  }

  const approvedThisMonth = items.filter((v) => v.status === "approved").length
  const pendingThisMonth = items.filter(
    (v) => v.status === "pending" || v.status === "submitted",
  ).length
  const onArrivalCount = items.filter((v) => v.status === "on_arrival").length

  const subtitle = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Visas — calendar" subtitle={subtitle} />

      <KPIGrid>
        <MetricCard
          label="Total this month"
          value={items.length.toLocaleString("en-IN")}
          icon={CalendarIcon}
          iconTone="blue"
        />
        <MetricCard
          label="Approved this month"
          value={approvedThisMonth.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Pending this month"
          value={pendingThisMonth.toLocaleString("en-IN")}
          icon={Hourglass}
          iconTone="amber"
        />
        <MetricCard
          label="On arrival"
          value={onArrivalCount.toLocaleString("en-IN")}
          icon={PlaneTakeoff}
          iconTone="violet"
        />
      </KPIGrid>

      <CalendarGrid
        year={year}
        month={month}
        render={(d) => {
          const key = d.toISOString().slice(0, 10)
          const list = byDate.get(key) ?? []
          if (list.length === 0) return null
          return (
            <div className="space-y-1 mt-1">
              {list.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="text-sm truncate"
                  title={`${v.traveller_name ?? ""} · ${v.country ?? ""}`}
                >
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full mr-1 align-middle",
                      statusToBgClass(v.status),
                    )}
                  />
                  {v.traveller_name ?? "—"}
                </div>
              ))}
              {list.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{list.length - 3}
                </div>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
