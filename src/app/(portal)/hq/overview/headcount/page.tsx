import { createClient } from "@supabase/supabase-js"
import { Users, UserCog, CalendarOff } from "lucide-react"

import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Headcount — Suprans HQ",
  description: "Active employees by department and vertical.",
}

/**
 * Headcount (`/hq/overview/headcount`) — spec §1.3.
 *
 * Data source: `hq.v_headcount_by_dept_vertical`.
 * Falls back to aggregating `public.team_members` by department/space_slug
 * when the view is empty (fresh environments).
 */

interface HeadcountRow {
  department: string
  vertical: string
  active: number
  probation: number
  on_leave: number
  terminated: number
  total: number
}

// The `hq` schema isn't the default on the shared client, so bind to it here.
// (Kept local to avoid touching src/lib/supabase.ts while sibling agents edit it.)
const supabaseHq = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  { db: { schema: "hq" } },
)

async function loadHeadcount(): Promise<HeadcountRow[]> {
  try {
    const { data, error } = await supabaseHq
      .from("v_headcount_by_dept_vertical")
      .select("department, vertical, active, probation, on_leave, terminated, total")
    if (error) return []
    const rows = (data ?? []) as HeadcountRow[]
    if (rows.length > 0) return rows
  } catch {
    // fall through to fallback
  }

  // Fallback: synthesize from public.team_members so the page still renders
  // in local/empty environments (matches how /hq/overview already treats it).
  try {
    const fallback = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    )
    const { data } = await fallback
      .from("team_members")
      .select("department, space_slug")
    if (!data) return []
    const buckets = new Map<string, HeadcountRow>()
    for (const row of data as Array<{ department: string | null; space_slug: string | null }>) {
      const dept = row.department?.trim() || "Unassigned"
      const vert = row.space_slug?.trim() || "hq"
      const key = `${dept}::${vert}`
      const entry =
        buckets.get(key) ??
        ({
          department: dept,
          vertical: vert,
          active: 0,
          probation: 0,
          on_leave: 0,
          terminated: 0,
          total: 0,
        } as HeadcountRow)
      entry.active += 1
      entry.total += 1
      buckets.set(key, entry)
    }
    return Array.from(buckets.values())
  } catch {
    return []
  }
}

export default async function HqHeadcountPage() {
  const rows = (await loadHeadcount()).slice().sort((a, b) => b.total - a.total)

  const totals = rows.reduce(
    (acc, r) => {
      acc.active += r.active ?? 0
      acc.probation += r.probation ?? 0
      acc.on_leave += r.on_leave ?? 0
      acc.total += r.total ?? 0
      return acc
    },
    { active: 0, probation: 0, on_leave: 0, total: 0 },
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/overview" label="Overview" />

      <PageHeader
        title="Headcount"
        subtitle="Active employees by department and vertical."
        actions={
          <Button variant="outline" size="sm" disabled>
            + Add Employee
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Active"
          value={formatNumber(totals.active)}
          icon={Users}
          iconTone="emerald"
        />
        <MetricCard
          label="On probation"
          value={formatNumber(totals.probation)}
          icon={UserCog}
          iconTone="amber"
        />
        <MetricCard
          label="On leave"
          value={formatNumber(totals.on_leave)}
          icon={CalendarOff}
          iconTone="blue"
        />
        <MetricCard
          label="Total"
          value={formatNumber(totals.total)}
          icon={Users}
          iconTone="slate"
        />
      </KPIGrid>

      <DetailCard title="By department × vertical">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No headcount yet"
            description="Add team members in People to start tracking department × vertical rollups."
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Department
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Probation
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    On leave
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((row) => (
                  <tr
                    key={`${row.department}::${row.vertical}`}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-2.5 font-medium text-foreground">
                      {row.department}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {row.vertical}
                    </td>
                    <td className="px-5 py-2.5">
                      {row.active > 0 ? (
                        <StatusBadge tone="emerald">{formatNumber(row.active)}</StatusBadge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">0</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {row.probation > 0 ? (
                        <StatusBadge tone="amber">{formatNumber(row.probation)}</StatusBadge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">0</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {row.on_leave > 0 ? (
                        <StatusBadge tone="blue">{formatNumber(row.on_leave)}</StatusBadge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">0</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 font-semibold tabular-nums text-foreground">
                      {formatNumber(row.total)}
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
