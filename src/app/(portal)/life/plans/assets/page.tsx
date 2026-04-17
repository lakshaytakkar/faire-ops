import { Package, Wallet, Sparkles, Hash } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Physical assets — Life | Suprans" }

interface AssetRow {
  id: string
  name: string | null
  category: string | null
  current_value: number | null
  purchase_price: number | null
  purchase_date: string | null
  condition: string | null
}

async function fetchAssets() {
  const { data, error } = await supabaseLife
    .from("physical_assets")
    .select("id, name, category, current_value, purchase_price, purchase_date, condition")
    .order("current_value", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.physical_assets:", error.message)
  return (data ?? []) as AssetRow[]
}

export default async function LifeAssetsPage() {
  const rows = await fetchAssets()
  const totalValue = rows.reduce((s, r) => s + (r.current_value ?? 0), 0)
  const totalPurchase = rows.reduce((s, r) => s + (r.purchase_price ?? 0), 0)
  const categories = new Set(rows.map((r) => r.category).filter(Boolean)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="physical_assets"
            listHref="/life/plans/assets"
            title="New asset"
          />
        }
        title="Physical assets"
        subtitle={`${rows.length.toLocaleString("en-IN")} item${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total items" value={rows.length} icon={Package} iconTone="blue" />
        <MetricCard label="Total value" value={formatCurrency(totalValue)} icon={Wallet} iconTone="emerald" />
        <MetricCard label="Total spent" value={formatCurrency(totalPurchase)} icon={Sparkles} iconTone="violet" />
        <MetricCard label="Categories" value={categories} icon={Hash} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets logged"
          description="Phones, laptops, gear, jewelry, art — knowing what you own (and its value) matters at insurance and tax time."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current value</TableHead>
                <TableHead className="text-right">Purchased for</TableHead>
                <TableHead>Purchased on</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    {r.category ? <StatusBadge tone="blue">{r.category}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {formatCurrency(r.current_value)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.purchase_price)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.purchase_date)}</TableCell>
                  <TableCell>
                    {r.condition ? <StatusBadge tone="slate">{r.condition}</StatusBadge> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
