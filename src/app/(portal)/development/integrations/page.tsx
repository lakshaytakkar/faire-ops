import Link from "next/link"
import {
  Plug,
  ShieldCheck,
  DollarSign,
  Layers,
  ExternalLink,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
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
export const metadata = { title: "Integrations — Development | Suprans" }

interface IntegrationRow {
  id: string
  key: string | null
  name: string | null
  category: string | null
  status: string | null
  account_email: string | null
  plan: string | null
  monthly_cost_usd: number | string | null
  used_in_spaces: string[] | null
  health_check_url: string | null
  notes: string | null
}

type SearchParams = { category?: string }

const CATEGORY_CHIPS = [
  { key: "all", label: "All" },
  { key: "observability", label: "Observability" },
  { key: "comm", label: "Communication" },
  { key: "payments", label: "Payments" },
  { key: "infra", label: "Infra" },
  { key: "ai", label: "AI" },
  { key: "analytics", label: "Analytics" },
]

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "string" ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const activeCategory = sp.category ?? "all"

  const { data } = await supabase
    .from("integrations")
    .select(
      "id, key, name, category, status, account_email, plan, monthly_cost_usd, used_in_spaces, health_check_url, notes",
    )
    .order("name", { ascending: true })

  const integrations = (data ?? []) as IntegrationRow[]

  const activeCount = integrations.filter(
    (i) => (i.status ?? "").toLowerCase() === "active",
  ).length
  const withHealth = integrations.filter((i) => !!i.health_check_url).length
  const totalMonthly = integrations.reduce(
    (sum, i) => sum + toNumber(i.monthly_cost_usd),
    0,
  )
  const categoriesCovered = new Set(
    integrations.map((i) => (i.category ?? "").trim()).filter(Boolean),
  ).size

  const filtered =
    activeCategory === "all"
      ? integrations
      : integrations.filter(
          (i) => (i.category ?? "").toLowerCase() === activeCategory,
        )

  const base = "/development/integrations"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Integrations"
        subtitle="Third-party services wired into Suprans operations."
      />

      <KPIGrid>
        <MetricCard label="Active" value={activeCount} icon={Plug} iconTone="emerald" />
        <MetricCard
          label="With health check"
          value={withHealth}
          icon={ShieldCheck}
          iconTone="blue"
        />
        <MetricCard
          label="Total monthly"
          value={formatCurrency(totalMonthly, "$")}
          icon={DollarSign}
          iconTone="violet"
        />
        <MetricCard
          label="Categories covered"
          value={categoriesCovered}
          icon={Layers}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title={`Integrations (${filtered.length})`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {CATEGORY_CHIPS.map((c) => {
            const href = c.key === "all" ? base : `${base}?category=${c.key}`
            const isActive = c.key === activeCategory
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
            icon={Plug}
            title="No integrations match"
            description="Try a different category or add your first integration."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Spaces</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {i.name ?? i.key ?? "—"}
                      </div>
                      {i.account_email && (
                        <div className="text-sm text-muted-foreground">
                          {i.account_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.category ? (
                        <Badge variant="secondary">{i.category}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{i.plan ?? "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatCurrency(i.monthly_cost_usd, "$")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(i.used_in_spaces ?? []).length > 0
                        ? (i.used_in_spaces ?? []).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {i.status ? (
                        <StatusBadge tone={toneForStatus(i.status)}>
                          {i.status}
                        </StatusBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {i.health_check_url ? (
                        <a
                          href={i.health_check_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          Check
                          <ExternalLink className="size-3" />
                        </a>
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
