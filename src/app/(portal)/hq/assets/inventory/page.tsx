import { Package, AlertTriangle, PackageX, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Assets → Office Inventory (list). Spec §5.4. Server-rendered.
// Table is empty today; full skeleton in place and EmptyState shown.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Office Inventory — Assets | HQ | Suprans",
}

const CONDITION_TONE: Record<string, StatusTone> = {
  new: "emerald",
  good: "emerald",
  fair: "amber",
  damaged: "red",
  broken: "red",
  retired: "slate",
}

interface InventoryRow {
  id: string
  item: string | null
  category: string | null
  qty: number | null
  location: string | null
  condition: string | null
  last_audited: string | null
}

async function fetchInventory(): Promise<InventoryRow[]> {
  const { data } = await supabaseHq
    .from("office_inventory")
    .select("id, item, category, qty, location, condition, last_audited")
    .order("item", { ascending: true })
  return (data ?? []) as InventoryRow[]
}

export default async function HqOfficeInventoryPage() {
  const items = await fetchInventory()

  const totalItems = items.reduce((acc, i) => acc + (i.qty ?? 0), 0)
  const damaged = items.filter(
    (i) => i.condition === "damaged" || i.condition === "broken",
  ).length
  const lowStock = items.filter((i) => (i.qty ?? 0) <= 2).length

  // Last audit across all items — most recent date.
  let lastAudit: string | null = null
  for (const i of items) {
    if (!i.last_audited) continue
    if (!lastAudit || new Date(i.last_audited) > new Date(lastAudit)) {
      lastAudit = i.last_audited
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Office Inventory"
        subtitle="Consumables, furniture, and supplies across all locations."
        actions={
          <Button size="sm" disabled>
            + Add Item
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total items"
          value={totalItems}
          icon={Package}
          iconTone="blue"
        />
        <MetricCard
          label="Damaged"
          value={damaged}
          icon={AlertTriangle}
          iconTone="red"
        />
        <MetricCard
          label="Low stock"
          value={lowStock}
          icon={PackageX}
          iconTone="amber"
        />
        <MetricCard
          label="Last audit"
          value={lastAudit ? formatDate(lastAudit) : "—"}
          icon={Calendar}
          iconTone="slate"
        />
      </KPIGrid>

      <DetailCard title="All items">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items yet"
            description="Add your first item to start tracking office supplies and furniture."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Last Audited</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.item ?? "—"}</TableCell>
                  <TableCell className="text-sm">{i.category ?? "—"}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {i.qty ?? 0}
                  </TableCell>
                  <TableCell className="text-sm">{i.location ?? "—"}</TableCell>
                  <TableCell>
                    {i.condition ? (
                      <StatusBadge tone={CONDITION_TONE[i.condition] ?? "slate"}>
                        {i.condition}
                      </StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(i.last_audited)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
