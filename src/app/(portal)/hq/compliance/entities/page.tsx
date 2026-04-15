import Link from "next/link"
import { Building2, Globe2, MapPin, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Entity Registry (list). See suprans-hq-full-spec.md §8.2
// and SPACE_PATTERN.md §3. Server-rendered; sorted by name.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Entity Registry — HQ | Suprans",
}

interface EntityRow {
  id: string
  name: string | null
  country: string | null
  type: string | null
  reg_no: string | null
  currency: string | null
  incorporated_at: string | null
  is_active: boolean | null
}

async function fetchEntities(): Promise<EntityRow[]> {
  const { data } = await supabaseHq
    .from("entities")
    .select("id, name, country, type, reg_no, currency, incorporated_at, is_active")
    .order("name", { ascending: true })
  return (data ?? []) as EntityRow[]
}

export default async function HqEntityRegistryPage() {
  const entities = await fetchEntities()

  const total = entities.length
  const active = entities.filter((e) => e.is_active !== false).length
  const india = entities.filter(
    (e) => (e.country ?? "").toLowerCase() === "india" || (e.country ?? "").toLowerCase() === "in",
  ).length
  const foreign = total - india

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Entity Registry"
        subtitle="Legal entities across the group."
        actions={
          <Button variant="outline" size="sm" disabled>
            + Add Entity
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={total} icon={Building2} iconTone="blue" />
        <MetricCard label="Active" value={active} icon={Flag} iconTone="emerald" />
        <MetricCard label="India" value={india} icon={MapPin} iconTone="amber" />
        <MetricCard label="Foreign" value={foreign} icon={Globe2} iconTone="violet" />
      </KPIGrid>

      <DetailCard title="All entities">
        {entities.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No entities yet"
            description="Add your first legal entity to get started."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reg No</TableHead>
                <TableHead>Incorporation Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Key Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((e) => {
                const status = e.is_active === false ? "inactive" : "active"
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link
                        href={`/hq/compliance/entities/${e.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {e.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{e.country ?? "—"}</TableCell>
                    <TableCell className="text-sm">{e.type ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {e.reg_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(e.incorporated_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={toneForStatus(status)}>{status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{e.currency ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
