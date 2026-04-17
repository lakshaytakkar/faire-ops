import Link from "next/link"
import { Users, Layers, Zap, CreditCard, MessageCircle, TrendingUp } from "lucide-react"
import { supabaseSuprdm } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — SuprDM | Suprans" }

interface AutomationRow {
  id: string
  name: string
  category: string | null
  status: string
  runs: number
  dms_sent: number
  last_run_at: string | null
  users?: { email: string; company_name: string | null } | null
}

interface PaymentRow {
  id: string
  amount: number
  currency: string
  status: string
  billing_cycle: string | null
  created_at: string
  users?: { email: string; company_name: string | null } | null
  plans?: { name: string } | null
}

async function fetchDashboard() {
  const [usersCount, plansCount, featuresCount, automationsCount, paymentsCount, paymentsSum, automationsStats, recentAutomations, recentPayments] = await Promise.all([
    supabaseSuprdm.from("users").select("id", { count: "exact", head: true }),
    supabaseSuprdm.from("plans").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseSuprdm.from("features").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseSuprdm.from("automations").select("id", { count: "exact", head: true }),
    supabaseSuprdm.from("payments").select("id", { count: "exact", head: true }).eq("status", "captured"),
    supabaseSuprdm.from("payments").select("amount").eq("status", "captured"),
    supabaseSuprdm.from("automations").select("dms_sent"),
    supabaseSuprdm.from("automations").select("id, name, category, status, runs, dms_sent, last_run_at, users(email, company_name)").order("last_run_at", { ascending: false, nullsFirst: false }).limit(8),
    supabaseSuprdm.from("payments").select("id, amount, currency, status, billing_cycle, created_at, users(email, company_name), plans(name)").order("created_at", { ascending: false }).limit(8),
  ])

  const totalRevenue = (paymentsSum.data ?? []).reduce((s: number, p: { amount: number | string }) => s + Number(p.amount ?? 0), 0)
  const totalDms = (automationsStats.data ?? []).reduce((s: number, a: { dms_sent: number | null }) => s + (a.dms_sent ?? 0), 0)

  return {
    users: usersCount.count ?? 0,
    plans: plansCount.count ?? 0,
    features: featuresCount.count ?? 0,
    automations: automationsCount.count ?? 0,
    paidPayments: paymentsCount.count ?? 0,
    totalRevenue,
    totalDms,
    recentAutomations: (recentAutomations.data ?? []) as unknown as AutomationRow[],
    recentPayments: (recentPayments.data ?? []) as unknown as PaymentRow[],
  }
}

export default async function SuprdmOverviewPage() {
  const d = await fetchDashboard()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="SuprDM Admin"
        subtitle="Instagram DM automation SaaS — users, plans, automations, payments."
      />

      <KPIGrid>
        <MetricCard label="Total users" value={d.users} icon={Users} iconTone="blue" hint="Across all plans" />
        <MetricCard label="Active automations" value={d.automations} icon={Zap} iconTone="emerald" hint={`${d.totalDms.toLocaleString()} DMs sent`} />
        <MetricCard label="Active plans" value={d.plans} icon={Layers} iconTone="amber" hint={`${d.features} features live`} />
        <MetricCard label="Revenue captured" value={`₹${d.totalRevenue.toLocaleString()}`} icon={CreditCard} iconTone="emerald" hint={`${d.paidPayments} paid`} />
      </KPIGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <MessageCircle className="size-4 text-muted-foreground" />
              Recent automations
            </h2>
            <Link href="/suprdm/automations" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {d.recentAutomations.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No automations yet</div>
            ) : d.recentAutomations.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {a.users?.company_name ?? a.users?.email ?? "—"} · {a.category ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums text-muted-foreground">{a.dms_sent.toLocaleString()} DMs</span>
                  <StatusBadge tone={toneForStatus(a.status)}>{a.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Recent payments
            </h2>
            <Link href="/suprdm/payments" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {d.recentPayments.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No payments yet</div>
            ) : d.recentPayments.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.users?.company_name ?? p.users?.email ?? "—"}</div>
                  <div className="text-sm text-muted-foreground truncate">{p.plans?.name ?? "—"} · {p.billing_cycle ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">₹{Number(p.amount).toLocaleString()}</span>
                  <StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/suprdm/users", label: "Users", icon: Users },
          { href: "/suprdm/plans", label: "Plans", icon: Layers },
          { href: "/suprdm/features", label: "Features", icon: Zap },
          { href: "/suprdm/automations", label: "Automations", icon: MessageCircle },
          { href: "/suprdm/payments", label: "Payments", icon: CreditCard },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border/80 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <link.icon className="size-4" />
            </div>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
