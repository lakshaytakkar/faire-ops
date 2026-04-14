import { Truck, ShieldCheck, Star, Globe } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { SuppliersClient, type Supplier } from "./suppliers-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Suppliers — USDrop | Suprans" }

async function fetchSuppliers() {
  const { data, error } = await supabaseUsdrop
    .from("suppliers")
    .select(
      "id, name, website, country, rating, verified, shipping_time, min_order_quantity, contact_email",
    )
    .order("name", { ascending: true })
  if (error) console.error("usdrop.suppliers:", error.message)
  return (data ?? []) as Supplier[]
}

export default async function SuppliersPage() {
  const rows = await fetchSuppliers()

  const verified = rows.filter((s) => s.verified).length
  const top = rows.filter(
    (s) => s.rating !== null && s.rating !== undefined && Number(s.rating) >= 4.5,
  ).length

  const countries = new Set(rows.map((s) => s.country).filter(Boolean)).size

  const ratings = rows.map((s) => Number(s.rating)).filter((n) => !Number.isNaN(n))
  const avgRating = ratings.length
    ? (ratings.reduce((sum, n) => sum + n, 0) / ratings.length).toFixed(1)
    : "—"

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        subtitle={`${rows.length.toLocaleString("en-IN")} sourcing partners.`}
      />

      <KPIGrid>
        <MetricCard
          label="Total suppliers"
          value={rows.length}
          icon={Truck}
          iconTone="blue"
        />
        <MetricCard
          label="Verified"
          value={verified}
          icon={ShieldCheck}
          iconTone="emerald"
          hint={`${rows.length - verified} pending`}
        />
        <MetricCard
          label="Top rated (≥4.5)"
          value={top}
          icon={Star}
          iconTone="amber"
          hint={`avg ${avgRating}`}
        />
        <MetricCard
          label="Countries"
          value={countries}
          icon={Globe}
          iconTone="violet"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers"
          description="Add suppliers to route products through the AI pipeline."
        />
      ) : (
        <SuppliersClient rows={rows} />
      )}
    </div>
  )
}
