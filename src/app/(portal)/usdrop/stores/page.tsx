import { Store, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StoresClient, type StoreRow, type OwnerLite } from "./stores-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Shopify Stores — USDrop | Suprans" }

async function fetchStores() {
  const { data, error } = await supabaseUsdrop
    .from("shopify_stores")
    .select(
      "id, user_id, shop_domain, store_name, store_email, plan, is_active, last_synced_at, currency, created_at",
    )
    .order("last_synced_at", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("usdrop.shopify_stores:", error.message)
  const rows = (data ?? []) as StoreRow[]
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]))
  let profiles: OwnerLite[] = []
  if (userIds.length > 0) {
    const { data: pdata } = await supabaseUsdrop
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds)
    profiles = (pdata ?? []) as OwnerLite[]
  }
  return { rows, profiles }
}

export default async function StoresPage() {
  const { rows, profiles } = await fetchStores()

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const active = rows.filter((r) => r.is_active).length
  const inactive = rows.length - active
  const stale = rows.filter(
    (r) => !r.last_synced_at || now - new Date(r.last_synced_at).getTime() > 7 * day,
  ).length

  // Top plan bucket
  const planCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const key = (r.plan ?? "unknown").toLowerCase()
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const topPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shopify stores"
        subtitle={`${rows.length.toLocaleString("en-IN")} connected stores (newest 200).`}
      />

      <KPIGrid>
        <MetricCard
          label="Connected stores"
          value={rows.length}
          icon={Store}
          iconTone="blue"
          hint="newest 200"
        />
        <MetricCard
          label="Active"
          value={active}
          icon={CheckCircle2}
          iconTone="emerald"
          hint={`${inactive} inactive`}
        />
        <MetricCard
          label="Stale sync"
          value={stale}
          icon={AlertTriangle}
          iconTone={stale > 0 ? "amber" : "emerald"}
          hint="no sync in 7d"
        />
        <MetricCard
          label="Top plan"
          value={topPlan ? topPlan[0] : "—"}
          icon={RefreshCw}
          iconTone="violet"
          hint={topPlan ? `${topPlan[1]} store${topPlan[1] === 1 ? "" : "s"}` : "—"}
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No stores connected yet"
          description="Clients connect their Shopify store from the USDrop app — they show up here with sync status and revenue."
        />
      ) : (
        <StoresClient rows={rows} profiles={profiles} />
      )}
    </div>
  )
}
