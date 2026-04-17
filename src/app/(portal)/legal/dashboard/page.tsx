import Link from "next/link"
import {
  Users,
  Building2,
  FileCheck2,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import {
  formatINR,
  clientHealthTone,
  llcStatusTone,
  filingStatusTone,
  filingStageTone,
  planTone,
} from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard — Legal | Suprans" }

/* ── Tone → hex for inline styles (progress bars, dots) ──────────── */
const TONE_HEX: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  slate: "#64748b",
  violet: "#8b5cf6",
}

const PLAN_ORDER = ["Elite", "Pro", "Starter", "Basic"]
const PHASE_ORDER = [
  "Onboarding",
  "LLC Filing",
  "EIN",
  "Bank Account",
  "Website",
  "Reseller Permit",
  "ITIN",
]
const HEALTH_ORDER = [
  "Healthy",
  "At Risk",
  "Critical",
  "Churned",
  "Neutral",
  "Inactive",
]

/* ── Types ────────────────────────────────────────────────────────── */
interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  email: string | null
  plan: string | null
  client_health: string | null
  llc_name: string | null
  llc_status: string | null
  amount_received: number | null
  remaining_payment: number | null
  country: string | null
  created_at: string | null
}

interface TaxFilingRow {
  id: string
  client_id: string | null
  llc_name: string | null
  status: string | null
  filing_stage: string | null
  filled_1120: boolean | null
  filled_5472: boolean | null
  amount_received: number | null
  filing_done: boolean | null
}

interface OnboardingRow {
  client_id: string | null
  phase: string | null
  is_completed: boolean | null
}

/* ── Data fetching ────────────────────────────────────────────────── */
async function fetchDashboard() {
  const [clientsRes, recentClientsRes, taxFilingsRes, onboardingRes] =
    await Promise.all([
      supabaseLegal
        .from("clients")
        .select(
          "id, client_code, client_name, plan, client_health, llc_status, amount_received, remaining_payment, country, created_at",
        )
        .limit(1000),
      supabaseLegal
        .from("clients")
        .select(
          "id, client_code, client_name, email, plan, client_health, llc_name, llc_status, amount_received, remaining_payment, country, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseLegal
        .from("tax_filings")
        .select(
          "id, client_id, llc_name, status, filing_stage, filled_1120, filled_5472, amount_received, filing_done, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseLegal
        .from("onboarding_checklist")
        .select("client_id, phase, is_completed")
        .limit(10000),
    ])

  if (clientsRes.error) console.error("legal.clients:", clientsRes.error.message)
  if (recentClientsRes.error)
    console.error("legal.clients (recent):", recentClientsRes.error.message)
  if (taxFilingsRes.error)
    console.error("legal.tax_filings:", taxFilingsRes.error.message)
  if (onboardingRes.error)
    console.error("legal.onboarding_checklist:", onboardingRes.error.message)

  return {
    clients: (clientsRes.data ?? []) as ClientRow[],
    recentClients: (recentClientsRes.data ?? []) as ClientRow[],
    taxFilings: (taxFilingsRes.data ?? []) as TaxFilingRow[],
    onboarding: (onboardingRes.data ?? []) as OnboardingRow[],
  }
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default async function LegalDashboardPage() {
  const { clients, recentClients, taxFilings, onboarding } =
    await fetchDashboard()

  /* ── Aggregations ──────────────────────────────────────────────── */
  const totalClients = clients.length
  const totalRevenue = clients.reduce(
    (s, c) => s + (Number(c.amount_received) || 0),
    0,
  )
  const payingClients = clients.filter(
    (c) => (Number(c.amount_received) || 0) > 0,
  ).length
  const llcDelivered = clients.filter(
    (c) => c.llc_status === "Delivered",
  ).length
  const uniqueCountries = new Set(
    clients.map((c) => c.country).filter(Boolean),
  ).size

  const atRiskCount = clients.filter((c) =>
    ["At Risk", "Critical", "Churned"].includes(c.client_health ?? ""),
  ).length
  const llcPipelineCount = clients.filter((c) =>
    ["Pending", "Processing"].includes(c.llc_status ?? ""),
  ).length
  const activeTaxCount = taxFilings.filter(
    (f) => f.status !== "Completed" && !f.filing_done,
  ).length

  /* Health breakdown */
  const healthMap = new Map<string, number>()
  for (const c of clients) {
    const h = c.client_health || "Unknown"
    healthMap.set(h, (healthMap.get(h) || 0) + 1)
  }
  const healthEntries = [
    ...HEALTH_ORDER.filter((h) => healthMap.has(h)).map((h) => [h, healthMap.get(h)!] as const),
    ...[...healthMap.entries()].filter(([h]) => !HEALTH_ORDER.includes(h)),
  ]

  /* Plan breakdown */
  const planMap = new Map<string, number>()
  for (const c of clients) {
    const p = c.plan || "Unknown"
    planMap.set(p, (planMap.get(p) || 0) + 1)
  }
  const planEntries = [
    ...PLAN_ORDER.filter((p) => planMap.has(p)).map((p) => [p, planMap.get(p)!] as const),
    ...[...planMap.entries()].filter(([p]) => !PLAN_ORDER.includes(p)),
  ]

  /* Onboarding phase pipeline */
  const phaseStats = PHASE_ORDER.map((phase) => {
    const items = onboarding.filter((o) => o.phase === phase)
    const completed = items.filter((o) => o.is_completed).length
    return {
      phase,
      total: items.length,
      completed,
      pct: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
    }
  }).filter((p) => p.total > 0)

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* ── 1. Hero Banner ─────────────────────────────────────── */}
      <div
        className="rounded-md px-8 py-7 text-white"
        style={{
          background:
            "linear-gradient(135deg, hsl(210,50%,12%) 0%, hsl(195,70%,30%) 100%)",
        }}
      >
        <p className="text-sm font-medium opacity-75">LegalNations</p>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">
          LLC Formation & Tax Filing Services
        </h1>
        <p className="mt-1 text-sm opacity-60">
          {totalClients} clients across {uniqueCountries} countries
        </p>
        <div className="mt-5 flex items-center gap-8">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {formatINR(totalRevenue)}
            </p>
            <p className="text-xs opacity-50">Total Revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{totalClients}</p>
            <p className="text-xs opacity-50">Total Clients</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{llcDelivered}</p>
            <p className="text-xs opacity-50">LLC Delivered</p>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatINR(totalRevenue)}
          hint={`from ${payingClients} paying clients`}
          icon={Wallet}
          color="#8b5cf6"
        />
        <StatCard
          label="Clients at Risk"
          value={atRiskCount}
          hint="need attention"
          icon={AlertTriangle}
          color="#ef4444"
          highlight={atRiskCount > 0}
        />
        <StatCard
          label="LLC Pipeline"
          value={llcPipelineCount}
          hint="in progress"
          icon={Building2}
          color="#f59e0b"
        />
        <StatCard
          label="Active Tax Filings"
          value={activeTaxCount}
          hint={`${activeTaxCount} of ${taxFilings.length} total`}
          icon={FileCheck2}
          color="#3b82f6"
        />
      </div>

      {/* ── 3. Two-Column: Health | Onboarding ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Health Breakdown */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="border-b px-5 py-3.5 text-[0.9375rem] font-semibold tracking-tight">
            Client Health Breakdown
          </div>
          <div className="divide-y">
            {healthEntries.map(([health, count]) => {
              const tone = clientHealthTone(health)
              const hex = TONE_HEX[tone] || TONE_HEX.slate
              const pct =
                totalClients > 0 ? Math.round((count / totalClients) * 100) : 0
              return (
                <div
                  key={health}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${hex}15` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hex }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{health}</p>
                      <StatusBadge tone={tone}>{health}</StatusBadge>
                    </div>
                    <div className="mt-1.5 w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: hex }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Onboarding Pipeline */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Onboarding Pipeline
            </span>
            <Link
              href="/legal/onboarding"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {phaseStats.map(({ phase, total, completed, pct }) => (
              <div key={phase}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{phase}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {completed}/{total}{" "}
                    <span className="text-muted-foreground">({pct}%)</span>
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Plan Distribution ───────────────────────────────── */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3.5 text-[0.9375rem] font-semibold tracking-tight">
          Plan Distribution
        </div>
        <div className="p-5">
          <div className="h-6 rounded-full overflow-hidden flex">
            {planEntries.map(([plan, count]) => {
              const hex = TONE_HEX[planTone(plan)] || TONE_HEX.slate
              return (
                <div
                  key={plan}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(count / totalClients) * 100}%`,
                    backgroundColor: hex,
                  }}
                  title={`${plan}: ${count}`}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-6 mt-3 flex-wrap">
            {planEntries.map(([plan, count]) => {
              const hex = TONE_HEX[planTone(plan)] || TONE_HEX.slate
              return (
                <div key={plan} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-sm font-medium">{plan}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {count} (
                    {Math.round((count / totalClients) * 100)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 5. Recent Clients ──────────────────────────────────── */}
      <DetailCard
        title="Recent Clients"
        actions={
          <Link
            href="/legal/clients"
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {recentClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]">Plan</TableHead>
                <TableHead className="w-[110px]">LLC Status</TableHead>
                <TableHead className="w-[100px]">Health</TableHead>
                <TableHead className="w-[120px] text-right">Revenue</TableHead>
                <TableHead className="w-[110px]">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentClients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {c.client_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <Link
                      href={`/legal/clients/${c.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {c.client_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={planTone(c.plan)}>
                      {c.plan ?? "—"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={llcStatusTone(c.llc_status)}>
                      {c.llc_status ?? "—"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={clientHealthTone(c.client_health)}>
                      {c.client_health ?? "—"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatINR(c.amount_received)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailCard>

      {/* ── 6. Tax Filings ─────────────────────────────────────── */}
      <DetailCard
        title="Tax Filings"
        actions={
          <Link
            href="/legal/tax-filings"
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {taxFilings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tax filings yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LLC Name</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[150px]">Filing Stage</TableHead>
                <TableHead className="w-[80px] text-center">1120</TableHead>
                <TableHead className="w-[80px] text-center">5472</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead className="w-[80px] text-center">Done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxFilings.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm font-medium">
                    <Link
                      href={`/legal/tax-filings/${f.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {f.llc_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={filingStatusTone(f.status)}>
                      {f.status ?? "—"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {f.filing_stage ? (
                      <StatusBadge tone={filingStageTone(f.filing_stage)}>
                        {f.filing_stage}
                      </StatusBadge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {f.filled_1120 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {f.filled_5472 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatINR(f.amount_received)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {f.filing_done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailCard>

      {/* ── 7. Quick Actions ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/legal/clients"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              View All Clients
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalClients} clients in directory
          </p>
        </Link>

        <Link
          href="/legal/onboarding"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <ClipboardCheck className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Onboarding Tracker
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track client onboarding progress
          </p>
        </Link>

        <Link
          href="/legal/tax-filings"
          className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
              <FileCheck2 className="size-4" />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Tax Filing Center
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {taxFilings.length} filings to manage
          </p>
        </Link>
      </div>
    </div>
  )
}

/* ── Inline Stat Card (matches Faire overview pattern) ────────────── */
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  color,
  highlight,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-bold font-heading mt-2 tabular-nums ${highlight ? "text-red-600" : ""}`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <span style={{ color }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}
