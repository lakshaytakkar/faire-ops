import { LayoutGrid, Sparkles, CircleDollarSign, ShieldCheck } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { GenericAddLauncher } from "@/app/(portal)/life/_components/GenericEditLauncher"
import { StackClient, type AppRow, type SubRow, type CredRow } from "./stack-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Stack | Suprans" }

function normalisedMonthly(amount: number, cycle: string | null): number {
  switch (cycle) {
    case "monthly":
      return amount
    case "quarterly":
      return amount / 3
    case "annual":
      return amount / 12
    case "trial":
      return 0
    case "lifetime":
      return 0
    default:
      return amount
  }
}

async function fetchAll() {
  const [appsRes, subsRes, credsRes] = await Promise.all([
    supabaseLife
      .from("apps")
      .select(
        "id, name, url, logo_url, category, purpose, usage_frequency, is_favorite, is_paid, tags, notes",
      )
      .order("name", { ascending: true }),
    supabaseLife
      .from("app_subscriptions")
      .select("*")
      .order("next_renewal", { ascending: true, nullsFirst: false }),
    supabaseLife.from("app_credentials").select("*"),
  ])
  if (appsRes.error) console.error("life.apps:", appsRes.error.message)
  if (subsRes.error) console.error("life.app_subscriptions:", subsRes.error.message)
  if (credsRes.error) console.error("life.app_credentials:", credsRes.error.message)
  return {
    apps: (appsRes.data ?? []) as AppRow[],
    subs: (subsRes.data ?? []) as SubRow[],
    creds: (credsRes.data ?? []) as CredRow[],
  }
}

export default async function WorkspaceStackPage() {
  const { apps, subs, creds } = await fetchAll()

  // Map subs/creds by app_id — keep the first one per app for summary.
  const subsByApp = new Map<string, SubRow>()
  for (const s of subs) {
    if (!subsByApp.has(s.app_id)) subsByApp.set(s.app_id, s)
  }
  const credsByApp = new Map<string, CredRow>()
  for (const c of creds) {
    if (!credsByApp.has(c.app_id)) credsByApp.set(c.app_id, c)
  }

  const count = apps.length
  const daily = apps.filter((a) => a.usage_frequency === "daily").length
  const paid = apps.filter((a) => a.is_paid).length
  const favs = apps.filter((a) => a.is_favorite).length

  const monthlyTotal = subs.reduce((sum, s) => {
    if (!s.amount || s.status !== "active") return sum
    if (s.billing_cycle === "lifetime" || s.billing_cycle === "trial") return sum
    return sum + normalisedMonthly(s.amount, s.billing_cycle)
  }, 0)

  const totalCreds = creds.length
  const strongTwoFa = creds.filter(
    (c) => c.two_factor_method === "totp" || c.two_factor_method === "hardware_key",
  ).length
  const coverage = totalCreds > 0 ? Math.round((strongTwoFa / totalCreds) * 100) : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Stack"
        subtitle={`${count} apps · ${paid} paid · ${favs} favorites`}
        actions={
          <GenericAddLauncher
            table="apps"
            listHref="/workspace/stack"
            title="New app"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total apps"
          value={count}
          icon={LayoutGrid}
          iconTone="slate"
        />
        <MetricCard
          label="Daily use"
          value={daily}
          icon={Sparkles}
          iconTone="emerald"
        />
        <MetricCard
          label="Monthly subs"
          value={
            <span className="tabular-nums">
              ₹ {Math.round(monthlyTotal).toLocaleString("en-IN")}
            </span>
          }
          icon={CircleDollarSign}
          iconTone="violet"
        />
        <MetricCard
          label="2FA coverage"
          value={<span className="tabular-nums">{coverage}%</span>}
          icon={ShieldCheck}
          iconTone="blue"
        />
      </KPIGrid>

      <StackClient
        apps={apps}
        subsByApp={Array.from(subsByApp.entries())}
        credsByApp={Array.from(credsByApp.entries())}
      />
    </div>
  )
}
