import { ClipboardList, CheckCircle2, Clock, Percent } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Onboarding — Legal | Suprans" }

interface ChecklistRow {
  id: string
  client_id: string | null
  phase: string | null
  step_name: string | null
  completed: boolean | null
  completed_at: string | null
  created_at: string | null
}

interface ClientLookup {
  id: string
  client_code: string | null
  client_name: string | null
}

export default async function LegalOnboardingPage() {
  const [checklistRes, clientsRes] = await Promise.all([
    supabaseLegal
      .from("onboarding_checklist")
      .select("id, client_id, phase, step_name, completed, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseLegal
      .from("clients")
      .select("id, client_code, client_name"),
  ])

  if (checklistRes.error) console.error("legal.onboarding_checklist:", checklistRes.error.message)
  if (clientsRes.error) console.error("legal.clients:", clientsRes.error.message)

  const rows = (checklistRes.data ?? []) as ChecklistRow[]
  const clientMap = new Map(
    ((clientsRes.data ?? []) as ClientLookup[]).map((c) => [c.id, c]),
  )

  const completedCount = rows.filter((r) => r.completed).length
  const pendingCount = rows.length - completedCount
  const completionRate =
    rows.length > 0 ? Math.round((completedCount / rows.length) * 100) : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Onboarding"
        subtitle={`${rows.length.toLocaleString("en-IN")} checklist step${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard
          label="Total Steps"
          value={rows.length}
          icon={ClipboardList}
          iconTone="slate"
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconTone="amber"
        />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={Percent}
          iconTone="blue"
        />
      </KPIGrid>

      <DetailCard title="All onboarding steps">
        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No onboarding steps yet"
            description="Checklist items will appear here once clients begin onboarding."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Code</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Step Name</TableHead>
                  <TableHead className="w-[100px]">Completed</TableHead>
                  <TableHead className="w-[140px]">Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const client = r.client_id ? clientMap.get(r.client_id) : null
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {client?.client_code ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {client?.client_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.phase ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.step_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {r.completed ? "\u2705" : "\u2014"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(r.completed_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
