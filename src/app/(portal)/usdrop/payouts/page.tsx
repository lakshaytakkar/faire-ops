import { TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import {
  PayoutsClient,
  type PaymentLinkRow,
  type ProfileLite,
} from "./payouts-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payouts — USDrop | Suprans" }

async function fetchPayouts() {
  const { data, error } = await supabaseUsdrop
    .from("payment_links")
    .select(
      "id, lead_user_id, amount, currency, title, description, status, payment_url, paid_at, expires_at, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) console.error("usdrop.payment_links:", error.message)
  const rows = (data ?? []) as PaymentLinkRow[]
  const userIds = Array.from(
    new Set([
      ...rows.map((r) => r.lead_user_id).filter(Boolean),
      ...rows.map((r) => r.created_by).filter(Boolean),
    ] as string[]),
  )
  let profiles: ProfileLite[] = []
  if (userIds.length > 0) {
    const { data: pdata } = await supabaseUsdrop
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
    profiles = (pdata ?? []) as ProfileLite[]
  }
  return { rows, profiles }
}

export default async function PayoutsPage() {
  const { rows, profiles } = await fetchPayouts()

  const statusCount = (key: string) =>
    rows.filter((r) => (r.status ?? "").toLowerCase() === key).length
  const paidCount = statusCount("paid")
  const pendingCount = statusCount("pending")
  const expiredCount = statusCount("expired")

  const paidTotal = rows
    .filter((r) => (r.status ?? "").toLowerCase() === "paid")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payouts"
        subtitle={`${rows.length.toLocaleString("en-IN")} payment links (newest 200)`}
      />

      <KPIGrid>
        <MetricCard
          label="Paid"
          value={paidCount}
          icon={CheckCircle2}
          iconTone="emerald"
          hint={`$${paidTotal.toLocaleString("en-IN")} collected`}
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconTone="amber"
          hint="awaiting payment"
        />
        <MetricCard
          label="Expired"
          value={expiredCount}
          icon={AlertTriangle}
          iconTone={expiredCount > 0 ? "red" : "slate"}
          hint="past expiry"
        />
        <MetricCard
          label="Total links"
          value={rows.length}
          icon={TrendingUp}
          iconTone="blue"
          hint="issued (200 latest)"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No payouts issued yet"
          description="Payment links and payout runs to clients surface here once admins issue them."
        />
      ) : (
        <PayoutsClient rows={rows} profiles={profiles} />
      )}
    </div>
  )
}
