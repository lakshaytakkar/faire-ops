import Link from "next/link"
import { ListChecks } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Checklist templates — Development | Suprans" }

interface ProjectTypeRef {
  label: string | null
  key: string | null
}

interface TemplateRow {
  id: string
  version: number | null
  items: Array<unknown> | null
  created_at: string | null
  project_type_id: string | null
  project_types: ProjectTypeRef | ProjectTypeRef[] | null
}

function firstType(t: ProjectTypeRef | ProjectTypeRef[] | null): ProjectTypeRef | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

export default async function ChecklistTemplatesPage() {
  const { data } = await supabase
    .from("checklist_templates")
    .select("id, version, items, created_at, project_type_id, project_types(label, key)")
    .order("created_at", { ascending: true })

  const rows = (data ?? []) as TemplateRow[]
  const totalItems = rows.reduce((acc, r) => acc + (r.items?.length ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Checklist templates"
        subtitle="The canonical item sets each new project is measured against."
      />

      <KPIGrid>
        <MetricCard label="Templates" value={rows.length} icon={ListChecks} iconTone="blue" />
        <MetricCard label="Total items" value={totalItems} icon={ListChecks} iconTone="emerald" />
        <MetricCard
          label="Avg items"
          value={rows.length ? Math.round(totalItems / rows.length) : 0}
          icon={ListChecks}
          iconTone="violet"
        />
        <MetricCard label="Versions" value={rows.length} icon={ListChecks} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Templates (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No templates"
            description="Seed checklist_templates to get started."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const type = firstType(r.project_types)
                  return (
                    <TableRow key={r.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/development/checklists/${r.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {type?.label ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.items?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        v{r.version ?? 1}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
