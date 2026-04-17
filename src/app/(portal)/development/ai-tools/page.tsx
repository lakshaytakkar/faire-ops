import { Sparkles, Cpu, DollarSign, Layers } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
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
import { formatCurrency } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "AI Tools — Development | Suprans" }

interface AiToolRow {
  id: string
  key: string | null
  name: string | null
  provider: string | null
  model_id: string | null
  purpose: string | null
  used_in_spaces: string[] | null
  monthly_cost_usd: number | string | null
  status: string | null
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "string" ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

export default async function AiToolsPage() {
  const { data } = await supabase
    .from("ai_tools")
    .select(
      "id, key, name, provider, model_id, purpose, used_in_spaces, monthly_cost_usd, status",
    )
    .order("name", { ascending: true })

  const tools = (data ?? []) as AiToolRow[]

  const activeProviders = new Set(
    tools
      .filter((t) => (t.status ?? "").toLowerCase() === "active")
      .map((t) => (t.provider ?? "").trim())
      .filter(Boolean),
  ).size

  const totalMonthly = tools.reduce(
    (sum, t) => sum + toNumber(t.monthly_cost_usd),
    0,
  )

  const spacesUsing = new Set<string>()
  for (const t of tools) {
    for (const s of t.used_in_spaces ?? []) {
      if (s) spacesUsing.add(s)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="AI Tools"
        subtitle="Models and providers powering Suprans automations."
      />

      <KPIGrid>
        <MetricCard
          label="Total tools"
          value={tools.length}
          icon={Sparkles}
          iconTone="violet"
        />
        <MetricCard
          label="Active providers"
          value={activeProviders}
          icon={Cpu}
          iconTone="blue"
        />
        <MetricCard
          label="Total monthly"
          value={formatCurrency(totalMonthly, "$")}
          icon={DollarSign}
          iconTone="emerald"
        />
        <MetricCard
          label="Spaces using"
          value={spacesUsing.size}
          icon={Layers}
          iconTone="amber"
          hint="≥ 1 tool"
        />
      </KPIGrid>

      <DetailCard title={`AI tools (${tools.length})`}>
        {tools.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No AI tools registered"
            description="Add your first AI provider to track models, usage, and spend."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Spaces</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {t.name ?? t.key ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.provider ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.model_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{t.purpose ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(t.used_in_spaces ?? []).length > 0
                        ? (t.used_in_spaces ?? []).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatCurrency(t.monthly_cost_usd, "$")}
                    </TableCell>
                    <TableCell>
                      {t.status ? (
                        <StatusBadge tone={toneForStatus(t.status)}>
                          {t.status}
                        </StatusBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
