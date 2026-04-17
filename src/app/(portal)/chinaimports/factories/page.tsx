import { Factory, ShieldCheck, Globe } from "lucide-react"
import { supabaseShared } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Factories — chinaimports.in | Suprans" }

interface FactoryRow {
  id: string
  name: string
  city: string
  specialties: string[] | null
  verified_since: string | null
  prior_orders_count: number
  certifications: string[] | null
  lead_time_days_min: number | null
  lead_time_days_max: number | null
  notes: string | null
  is_active: boolean
}

async function fetchFactories() {
  const { data, error } = await supabaseShared
    .from("factories")
    .select("id, name, city, specialties, verified_since, prior_orders_count, certifications, lead_time_days_min, lead_time_days_max, notes, is_active")
    .order("prior_orders_count", { ascending: false })
  if (error) console.error("shared.factories:", error.message)
  return (data ?? []) as FactoryRow[]
}

export default async function ChinaimportsFactoriesPage() {
  const rows = await fetchFactories()

  const activeCount = rows.filter((r) => r.is_active).length
  const certifiedCount = rows.filter((r) => r.certifications && r.certifications.length > 0).length
  const cities = new Set(rows.map((r) => r.city))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Factory directory"
        subtitle="Shared trust network across chinaproducts.in and chinaimports.in — vetted partners with prior-order history."
      />

      <KPIGrid>
        <MetricCard label="Total factories"  value={rows.length}     icon={Factory}     iconTone="blue" />
        <MetricCard label="Active"           value={activeCount}     icon={Factory}     iconTone="emerald" />
        <MetricCard label="Certified"        value={certifiedCount}  icon={ShieldCheck} iconTone="violet" hint="any compliance cert" />
        <MetricCard label="Cities"           value={cities.size}     icon={Globe}       iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Factories · ${rows.length}`}>
        {rows.length === 0 ? (
          <EmptyState icon={Factory} title="No factories yet" />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Factory</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">City</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Specialties</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Certifications</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Prior orders</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Lead time</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Verified</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold">{f.name}</td>
                    <td className="px-5 py-3 text-sm">{f.city}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(f.specialties ?? []).map((s) => (
                          <StatusBadge key={s} tone="slate">{s}</StatusBadge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(f.certifications ?? []).length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          (f.certifications ?? []).map((c) => <StatusBadge key={c} tone="violet">{c}</StatusBadge>)
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{f.prior_orders_count}</td>
                    <td className="px-5 py-3 text-sm tabular-nums">
                      {f.lead_time_days_min && f.lead_time_days_max ? `${f.lead_time_days_min}–${f.lead_time_days_max}d` : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{formatDate(f.verified_since)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={f.is_active ? "emerald" : "slate"}>{f.is_active ? "Active" : "Inactive"}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
