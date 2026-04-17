import { Pill, AlertCircle, Calendar, ShoppingCart } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Supplements — Life | Suprans" }

interface SupplementRow {
  id: string
  name: string | null
  active: boolean | null
  dosage: string | null
  timing: string | null
  stock_qty: number | null
  reorder_date: string | null
  purpose: string | null
}

async function fetchSupplements() {
  const { data, error } = await supabaseLife
    .from("supplements")
    .select("id, name, active, dosage, timing, stock_qty, reorder_date, purpose")
    .order("name", { ascending: true })
    .limit(200)
  if (error) console.error("life.supplements:", error.message)
  return (data ?? []) as SupplementRow[]
}

export default async function LifeSupplementsPage() {
  const rows = await fetchSupplements()
  const active = rows.filter((r) => r.active === true).length
  const needReorder = rows.filter((r) => {
    if (r.stock_qty === null) return false
    return r.stock_qty <= 5
  }).length
  const reorderSoon = rows.filter((r) => {
    if (!r.reorder_date) return false
    const d = new Date(r.reorder_date)
    const in60 = new Date(Date.now() + 60 * 86400000)
    return d <= in60
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Supplements"
        subtitle={`${rows.length.toLocaleString("en-IN")} item${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="supplements"
            listHref="/life/health/supplements"
            title="New supplement"
            defaults={{ active: true }}
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Active" value={active} icon={Pill} iconTone="emerald" />
        <MetricCard label="Need reorder" value={needReorder} icon={ShoppingCart} iconTone="amber" />
        <MetricCard label="Reorder due (60d)" value={reorderSoon} icon={AlertCircle} iconTone="red" />
        <MetricCard label="Total tracked" value={rows.length} icon={Calendar} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No supplements"
          description="Track what you take, the dose, and the schedule — so refills and tapers don't sneak up on you."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Reorder by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.active ? "active" : "paused")}>
                      {r.active ? "yes" : "no"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.dosage ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.timing ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.stock_qty ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.reorder_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
