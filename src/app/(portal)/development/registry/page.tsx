import Link from "next/link"
import { Building, Puzzle, Users, Globe, FolderKanban } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Project registry — Development | Suprans" }

interface ProjectTypeRef {
  label: string | null
  key: string | null
  icon: string | null
}

interface RegistryRow {
  id: string
  name: string | null
  venture: string | null
  status: string | null
  health: string | null
  repo_path: string | null
  last_deploy_at: string | null
  project_type_id: string | null
  project_types: ProjectTypeRef | ProjectTypeRef[] | null
}

type SearchParams = { type?: string }

const TYPE_TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "admin-space", label: "Admin Space" },
  { key: "plugin", label: "Plugin" },
  { key: "client-portal", label: "Client Portal" },
  { key: "mobile-app", label: "Mobile App" },
  { key: "landing-page", label: "Landing Page" },
]

function firstType(t: ProjectTypeRef | ProjectTypeRef[] | null): ProjectTypeRef | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

export default async function RegistryListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const activeType = sp.type ?? "all"

  const { data } = await supabase
    .from("projects")
    .select(
      "id, name, venture, status, health, repo_path, last_deploy_at, project_type_id, project_types(label, key, icon)",
    )
    .order("name", { ascending: true })

  const rows = (data ?? []) as RegistryRow[]

  const counts: Record<string, number> = {
    "admin-space": 0,
    plugin: 0,
    "client-portal": 0,
    "mobile-app": 0,
    "landing-page": 0,
  }
  for (const r of rows) {
    const key = firstType(r.project_types)?.key
    if (key && counts[key] !== undefined) counts[key]++
  }

  const filtered =
    activeType === "all"
      ? rows
      : rows.filter((r) => firstType(r.project_types)?.key === activeType)

  const base = "/development/registry"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Project registry"
        subtitle="Every in-flight project across faire-ops, categorized by type."
      />

      <KPIGrid>
        <MetricCard label="Admin Spaces" value={counts["admin-space"]} icon={Building} iconTone="blue" />
        <MetricCard label="Plugins" value={counts.plugin} icon={Puzzle} iconTone="violet" />
        <MetricCard label="Client Portals" value={counts["client-portal"]} icon={Users} iconTone="emerald" />
        <MetricCard label="Landing Pages" value={counts["landing-page"]} icon={Globe} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Projects (${filtered.length})`}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TYPE_TABS.map((t) => {
            const isActive = activeType === t.key
            const href = t.key === "all" ? base : `${base}?type=${t.key}`
            const n = t.key === "all" ? rows.length : counts[t.key] ?? 0
            return (
              <Link
                key={t.key}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{t.label}</span>
                <span className="tabular-nums opacity-75">{n}</span>
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects match"
            description="Try clearing the type filter to see all projects."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Venture</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last deploy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const type = firstType(r.project_types)
                  return (
                    <TableRow key={r.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/development/registry/${r.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {r.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {type?.label ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.venture ?? "—"}</TableCell>
                      <TableCell>
                        {r.status ? (
                          <StatusBadge tone={toneForStatus(r.status)}>
                            {r.status.replace(/_/g, " ")}
                          </StatusBadge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {r.health ? (
                          <StatusBadge tone={toneForStatus(r.health)}>{r.health}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formatDateTime(r.last_deploy_at)}
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
