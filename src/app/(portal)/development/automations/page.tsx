import Link from "next/link"
import { Play, Clock, Webhook, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Automations — Development | Suprans" }

interface AutomationRow {
  id: string
  name: string | null
  trigger_type: string | null
  schedule: string | null
  target_path: string | null
  spaces: string[] | null
  status: string | null
  last_run_at: string | null
  last_success_at: string | null
  failure_count: number | null
}

type SearchParams = { trigger?: string }

const TRIGGER_CHIPS = [
  { key: "all", label: "All" },
  { key: "cron", label: "Cron" },
  { key: "webhook", label: "Webhook" },
  { key: "manual", label: "Manual" },
  { key: "event", label: "Event" },
]

const HOUR_MS = 60 * 60 * 1000

function runTone(
  lastRun: string | null,
  failureCount: number | null,
  status: string | null,
): StatusTone {
  if ((failureCount ?? 0) >= 3) return "red"
  if (lastRun) {
    const delta = Date.now() - new Date(lastRun).getTime()
    if (!Number.isNaN(delta) && delta > 24 * HOUR_MS) return "amber"
  }
  return toneForStatus(status)
}

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const activeTrigger = sp.trigger ?? "all"

  const { data } = await supabase
    .from("automations")
    .select(
      "id, name, trigger_type, schedule, target_path, spaces, status, last_run_at, last_success_at, failure_count",
    )
    .order("name", { ascending: true })

  const automations = (data ?? []) as AutomationRow[]

  const running = automations.filter(
    (a) => (a.status ?? "").toLowerCase() === "active" || (a.status ?? "").toLowerCase() === "running",
  ).length
  const cronJobs = automations.filter(
    (a) => (a.trigger_type ?? "").toLowerCase() === "cron",
  ).length
  const webhooks = automations.filter(
    (a) => (a.trigger_type ?? "").toLowerCase() === "webhook",
  ).length
  const failing = automations.filter((a) => (a.failure_count ?? 0) > 3).length

  const filtered =
    activeTrigger === "all"
      ? automations
      : automations.filter(
          (a) => (a.trigger_type ?? "").toLowerCase() === activeTrigger,
        )

  const base = "/development/automations"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Automations"
        subtitle="Cron jobs, webhooks, and event handlers running across Suprans."
      />

      <KPIGrid>
        <MetricCard label="Running" value={running} icon={Play} iconTone="emerald" />
        <MetricCard label="Cron jobs" value={cronJobs} icon={Clock} iconTone="blue" />
        <MetricCard label="Webhooks" value={webhooks} icon={Webhook} iconTone="violet" />
        <MetricCard
          label="Failing"
          value={failing}
          icon={AlertTriangle}
          iconTone={failing > 0 ? "red" : "slate"}
          hint="failure_count > 3"
        />
      </KPIGrid>

      <DetailCard title={`Automations (${filtered.length})`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TRIGGER_CHIPS.map((c) => {
            const href = c.key === "all" ? base : `${base}?trigger=${c.key}`
            const isActive = c.key === activeTrigger
            return (
              <Link
                key={c.key}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                {c.label}
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Play}
            title="No automations match"
            description="Try a different trigger type or add your first automation."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Target path</TableHead>
                  <TableHead>Spaces</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const tone = runTone(a.last_run_at, a.failure_count, a.status)
                  const label =
                    (a.failure_count ?? 0) >= 3
                      ? "failing"
                      : a.status ?? "unknown"
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {a.name ?? "—"}
                        </div>
                        {(a.failure_count ?? 0) > 0 && (
                          <div className="text-sm text-muted-foreground tabular-nums">
                            {a.failure_count} recent failure
                            {a.failure_count === 1 ? "" : "s"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.trigger_type ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {a.schedule ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.target_path ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(a.spaces ?? []).length > 0
                          ? (a.spaces ?? []).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDateTime(a.last_run_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={tone}>{label}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
