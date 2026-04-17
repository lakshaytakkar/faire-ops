import Link from "next/link"
import {
  Wallet,
  Users,
  Briefcase,
  Ticket,
  CheckSquare,
  AlertTriangle,
  Plane,
  Share2,
  Globe,
  TrendingUp,
  Landmark,
  ArrowRight,
} from "lucide-react"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { supabase, supabaseHq, supabaseGoyo } from "@/lib/supabase"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Suprans HQ — Command Dashboard",
  description: "Company-wide pulse across every vertical — the top of the hierarchy.",
}

/* ------------------------------------------------------------------ */
/*  Vertical → display label. Keeps row labels consistent across the   */
/*  overview + P&L pages without hard-coding a new primitive.          */
/* ------------------------------------------------------------------ */

const VERTICAL_LABEL: Record<string, string> = {
  "b2b-ecommerce": "Faire Wholesale",
  "ets": "EazyToSell",
  "legal": "LegalNations",
  "goyo": "GoyoTours",
  "usdrop": "USDrop AI",
  "toysinbulk": "Toys in Bulk",
  "jsblueridge": "JSBlueridge",
  "b2b-ecosystem": "B2B Ecosystem",
  "hq": "HQ / Corporate",
}

function labelForVertical(slug: string): string {
  return VERTICAL_LABEL[slug] ?? slug
}

/* ------------------------------------------------------------------ */
/*  Data loaders                                                        */
/* ------------------------------------------------------------------ */

async function fetchRevenueMtd(): Promise<{ total: number; byVertical: { vertical: string; amount: number }[] }> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const { data, error } = await supabaseHq
    .from("revenue")
    .select("vertical, amount")
    .gte("booked_at", startOfMonth)
  if (error) {
    console.error("fetchRevenueMtd error:", error)
    return { total: 0, byVertical: [] }
  }
  const bucket = new Map<string, number>()
  for (const row of data ?? []) {
    const v = (row as { vertical: string; amount: number }).vertical
    const amt = Number((row as { amount: number | string }).amount ?? 0)
    bucket.set(v, (bucket.get(v) ?? 0) + amt)
  }
  const byVertical = Array.from(bucket.entries())
    .map(([vertical, amount]) => ({ vertical, amount }))
    .sort((a, b) => b.amount - a.amount)
  const total = byVertical.reduce((s, r) => s + r.amount, 0)
  return { total, byVertical }
}

interface HeadcountRow {
  department: string
  vertical: string
  active: number
  probation: number
  on_leave: number
  terminated: number
  total: number
}

async function fetchHeadcount(): Promise<{
  activeTotal: number
  byDepartment: { department: string; active: number }[]
}> {
  const { data, error } = await supabaseHq
    .from("v_headcount_by_dept_vertical")
    .select("department, vertical, active, probation, on_leave, terminated, total")
  if (error) {
    console.error("fetchHeadcount error:", error)
    return { activeTotal: 0, byDepartment: [] }
  }
  const bucket = new Map<string, number>()
  let activeTotal = 0
  for (const row of (data ?? []) as HeadcountRow[]) {
    const dept = row.department ?? "Unassigned"
    bucket.set(dept, (bucket.get(dept) ?? 0) + (row.active ?? 0))
    activeTotal += row.active ?? 0
  }
  const byDepartment = Array.from(bucket.entries())
    .map(([department, active]) => ({ department, active }))
    .sort((a, b) => b.active - a.active)
  return { activeTotal, byDepartment }
}

async function fetchActiveProjects(): Promise<number> {
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("status", "in", "(complete,archived)")
  if (error) {
    console.error("fetchActiveProjects error:", error)
    return 0
  }
  return count ?? 0
}

async function fetchOpenTicketsByPriority(): Promise<{
  total: number
  buckets: { priority: string; count: number }[]
}> {
  const { data, error } = await supabase
    .from("tickets")
    .select("priority, status")
    .not("status", "in", "(resolved,closed)")
  if (error) {
    console.error("fetchOpenTicketsByPriority error:", error)
    return { total: 0, buckets: [] }
  }
  const order = ["critical", "high", "medium", "low"]
  const bucket = new Map<string, number>()
  for (const row of data ?? []) {
    const p = ((row as { priority: string | null }).priority ?? "unassigned").toLowerCase()
    bucket.set(p, (bucket.get(p) ?? 0) + 1)
  }
  const buckets = Array.from(bucket.entries())
    .map(([priority, count]) => ({ priority, count }))
    .sort((a, b) => {
      const ai = order.indexOf(a.priority)
      const bi = order.indexOf(b.priority)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  const total = buckets.reduce((s, r) => s + r.count, 0)
  return { total, buckets }
}

async function fetchPendingApprovals(): Promise<number> {
  const { count, error } = await supabaseHq
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending_approval")
  if (error) {
    console.error("fetchPendingApprovals error:", error)
    return 0
  }
  return count ?? 0
}

interface AlertRow {
  id: string
  alert_type: string
  subject: string | null
  description: string
  severity: string
  due_date: string | null
}

async function fetchOpenAlerts(): Promise<AlertRow[]> {
  const { data, error } = await supabaseHq
    .from("alerts")
    .select("id, alert_type, subject, description, severity, due_date")
    .is("resolved_at", null)
    .order("due_date", { ascending: true })
    .limit(5)
  if (error) {
    console.error("fetchOpenAlerts error:", error)
    return []
  }
  return (data ?? []) as AlertRow[]
}

async function fetchGoyoDeparturesNext7Days(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const { count, error } = await supabaseGoyo
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("departure_date", today)
    .lte("departure_date", in7)
  if (error) {
    console.error("fetchGoyoDeparturesNext7Days error:", error)
    return 0
  }
  return count ?? 0
}

interface BankAccountRow {
  name: string
  currency: string
  balance_cents: number
}

async function fetchCashSnapshot(): Promise<{
  hasData: boolean
  total: BankAccountRow[]
}> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("name, currency, balance_cents")
  if (error) {
    return { hasData: false, total: [] }
  }
  return { hasData: (data ?? []).length > 0, total: (data ?? []) as BankAccountRow[] }
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function HqCommandDashboardPage() {
  const [
    revenue,
    headcount,
    activeProjects,
    tickets,
    pendingApprovals,
    alerts,
    goyoDepartures,
    cash,
  ] = await Promise.all([
    fetchRevenueMtd(),
    fetchHeadcount(),
    fetchActiveProjects(),
    fetchOpenTicketsByPriority(),
    fetchPendingApprovals(),
    fetchOpenAlerts(),
    fetchGoyoDeparturesNext7Days(),
    fetchCashSnapshot(),
  ])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero gradient banner */}
      <div className="relative isolate overflow-hidden rounded-2xl"
           style={{ background: "linear-gradient(135deg, hsl(225,50%,12%) 0%, hsl(220,60%,30%) 100%)" }}>
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/80">Suprans HQ</p>
          <h1 className="mt-1 text-2xl font-bold font-heading text-white">Command Center</h1>
          <p className="mt-1 text-sm text-white/70">Cross-vertical operations dashboard</p>
          <div className="mt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{formatCurrency(revenue.total, "₹")}</p>
              <p className="text-sm text-white/60">Revenue MTD</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{formatNumber(headcount.activeTotal)}</p>
              <p className="text-sm text-white/60">Active headcount</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{formatNumber(activeProjects)}</p>
              <p className="text-sm text-white/60">Active projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top KPI strip — the four headline numbers */}
      <KPIGrid>
        <MetricCard
          label="Revenue MTD"
          value={formatCurrency(revenue.total, "₹")}
          icon={Wallet}
          iconTone="emerald"
          hint="all verticals, this month"
        />
        <MetricCard
          label="Active projects"
          value={formatNumber(activeProjects)}
          icon={Briefcase}
          iconTone="blue"
          href="/projects"
        />
        <MetricCard
          label="Pending approvals"
          value={formatNumber(pendingApprovals)}
          icon={CheckSquare}
          iconTone={pendingApprovals > 0 ? "amber" : "slate"}
          hint="expense approvals"
        />
        <MetricCard
          label="Open tickets"
          value={formatNumber(tickets.total)}
          icon={Ticket}
          iconTone={tickets.total > 0 ? "amber" : "slate"}
          hint="unresolved"
        />
      </KPIGrid>

      {/* Secondary KPI strip — per-vertical flavour items */}
      <KPIGrid>
        <MetricCard
          label="Active headcount"
          value={formatNumber(headcount.activeTotal)}
          icon={Users}
          iconTone="blue"
          hint={`${headcount.byDepartment.length} departments`}
        />
        <MetricCard
          label="Cash position"
          value={cash.hasData ? `${cash.total.length} accounts` : "—"}
          icon={Landmark}
          iconTone="slate"
          hint={
            cash.hasData
              ? "multi-currency — see Finance"
              : "No bank accounts linked yet"
          }
        />
        <MetricCard
          label="Goyo departures (7d)"
          value={formatNumber(goyoDepartures)}
          icon={Plane}
          iconTone="violet"
          hint="next 7 days"
        />
        <MetricCard
          label="Compliance alerts"
          value={formatNumber(alerts.length)}
          icon={AlertTriangle}
          iconTone={alerts.length > 0 ? "red" : "slate"}
          hint="open, by due date"
        />
      </KPIGrid>

      {/* Tertiary strip — placeholders for integrations not yet online */}
      <KPIGrid>
        <MetricCard
          label="Social performance"
          value={0}
          icon={Share2}
          iconTone="slate"
          hint="No social accounts connected yet"
        />
        <MetricCard
          label="Website leads today"
          value={0}
          icon={Globe}
          iconTone="slate"
          hint="No sites tracked yet"
        />
        <MetricCard
          label="Revenue streams"
          value={formatNumber(revenue.byVertical.length)}
          icon={TrendingUp}
          iconTone="emerald"
          hint="verticals booking revenue MTD"
        />
        <MetricCard
          label="P&L summary"
          value="View"
          icon={ArrowRight}
          iconTone="blue"
          href="/hq/overview/p-and-l"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Primary column — revenue + headcount breakdowns */}
        <div className="lg:col-span-2 space-y-5">
          <DetailCard
            title="Revenue by vertical (MTD)"
            actions={
              <Link
                href="/hq/overview/p-and-l"
                className="text-xs font-medium text-primary hover:underline"
              >
                Full P&L →
              </Link>
            }
          >
            {revenue.byVertical.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No revenue this month"
                description="Nothing has been booked against any vertical since the start of the month."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {revenue.byVertical.map((row) => {
                  const share =
                    revenue.total > 0 ? (row.amount / revenue.total) * 100 : 0
                  return (
                    <div
                      key={row.vertical}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="text-sm font-medium text-foreground">
                          {labelForVertical(row.vertical)}
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${share.toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0">
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(
                            row.amount,
                            row.vertical === "legal" ? "$" : "₹",
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {share.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(revenue.total, "₹")}
                  </span>
                </div>
              </div>
            )}
          </DetailCard>

          <DetailCard
            title="Headcount by department"
            actions={
              <Link
                href="/hq/overview/headcount"
                className="text-xs font-medium text-primary hover:underline"
              >
                Full breakdown →
              </Link>
            }
          >
            {headcount.byDepartment.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Once employees are added to departments they'll roll up here."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {headcount.byDepartment.map((row) => (
                  <InfoRow
                    key={row.department}
                    label={row.department}
                    value={`${row.active} active`}
                  />
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        {/* Sidebar column — alerts, tickets, approvals */}
        <div className="space-y-5">
          <DetailCard
            title="Compliance alerts"
            actions={
              <Link
                href="/hq/overview/alerts"
                className="text-xs font-medium text-primary hover:underline"
              >
                All →
              </Link>
            }
          >
            {alerts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="All clear"
                description="No open compliance alerts."
              />
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground leading-snug">
                        {alert.description}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {alert.subject ?? alert.alert_type.replace(/_/g, " ")}
                        {alert.due_date && ` · due ${formatDate(alert.due_date)}`}
                      </div>
                    </div>
                    <StatusBadge tone={toneForStatus(alert.severity)}>
                      {alert.severity}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>

          <DetailCard title="Tickets by priority">
            {tickets.buckets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="Inbox zero"
                description="No unresolved tickets."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {tickets.buckets.map((row) => (
                  <div
                    key={row.priority}
                    className="flex items-center justify-between py-2"
                  >
                    <StatusBadge tone={toneForStatus(row.priority)}>
                      {row.priority}
                    </StatusBadge>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Pending approvals">
            {pendingApprovals === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Nothing waiting"
                description="No expense approvals pending."
              />
            ) : (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">
                  Expense approvals
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {pendingApprovals}
                </span>
              </div>
            )}
          </DetailCard>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/hq/people/directory" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Users className="size-5 text-blue-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">People</p>
          <p className="text-sm text-muted-foreground">Team directory &amp; org chart</p>
        </Link>
        <Link href="/hq/finance" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Wallet className="size-5 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Finance</p>
          <p className="text-sm text-muted-foreground">Revenue, expenses &amp; P&amp;L</p>
        </Link>
        <Link href="/hq/compliance" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <AlertTriangle className="size-5 text-amber-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Compliance</p>
          <p className="text-sm text-muted-foreground">Alerts &amp; regulatory tracking</p>
        </Link>
      </div>
    </div>
  )
}
