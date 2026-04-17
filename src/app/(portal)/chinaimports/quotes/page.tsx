import Link from "next/link"
import { FileText, Star, Check } from "lucide-react"
import { supabaseChinaimports } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Quotes — chinaimports.in | Suprans" }

interface QuoteRow {
  id: string
  rfq_id: string
  factory_name: string
  factory_city: string | null
  unit_price_inr: number | string
  moq: number
  lead_time_days: number
  sample_cost_inr: number | string | null
  is_recommended: boolean
  is_approved_by_client: boolean
  sort_order: number
  created_at: string | null
}

interface RFQLite {
  id: string
  rfq_number: string
  buyer_company: string
}

async function fetchQuotes() {
  const [qRes, rfqRes] = await Promise.all([
    supabaseChinaimports
      .from("quote_options")
      .select("id, rfq_id, factory_name, factory_city, unit_price_inr, moq, lead_time_days, sample_cost_inr, is_recommended, is_approved_by_client, sort_order, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseChinaimports.from("rfqs").select("id, rfq_number, buyer_company"),
  ])

  const rfqMap = new Map<string, RFQLite>((rfqRes.data ?? []).map((r) => [r.id as string, r as RFQLite]))
  const rows = ((qRes.data ?? []) as QuoteRow[]).map((q) => ({ ...q, rfq: rfqMap.get(q.rfq_id) }))
  return rows
}

export default async function ChinaimportsQuotesPage() {
  const rows = await fetchQuotes()

  const recommendedCount = rows.filter((r) => r.is_recommended).length
  const approvedCount = rows.filter((r) => r.is_approved_by_client).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Quote options"
        subtitle="Every factory option shortlisted across all active RFQs."
      />

      <KPIGrid>
        <MetricCard label="Total quotes"   value={rows.length}       icon={FileText} iconTone="blue" />
        <MetricCard label="Recommended"    value={recommendedCount}  icon={Star}     iconTone="amber" />
        <MetricCard label="Client approved" value={approvedCount}    icon={Check}    iconTone="emerald" />
        <MetricCard label="RFQs covered"   value={new Set(rows.map((r) => r.rfq_id)).size} icon={FileText} iconTone="violet" />
      </KPIGrid>

      <DetailCard title={`Quotes · ${rows.length}`}>
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title="No quotes yet" description="Factory shortlists created inside an RFQ detail view land here." />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">RFQ</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Company</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Factory</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">City</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Unit price</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">MOQ</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Lead</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Sample</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/chinaimports/quotes/${r.id}`} className="text-sm font-mono font-semibold hover:text-primary">
                        {r.rfq?.rfq_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm">{r.rfq?.buyer_company ?? "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium">{r.factory_name}</td>
                    <td className="px-5 py-3 text-sm">{r.factory_city ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{formatCurrency(r.unit_price_inr)}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{r.moq}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{r.lead_time_days}d</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{r.sample_cost_inr ? formatCurrency(r.sample_cost_inr) : "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.is_recommended && <StatusBadge tone="amber">Recommended</StatusBadge>}
                        {r.is_approved_by_client && <StatusBadge tone="emerald">Approved</StatusBadge>}
                        {!r.is_recommended && !r.is_approved_by_client && <StatusBadge tone="slate">Shortlist</StatusBadge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{formatDate(r.created_at)}</td>
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
