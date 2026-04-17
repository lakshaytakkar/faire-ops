import Link from "next/link"
import { AlertTriangle, Activity, CheckCircle2, CircleDashed } from "lucide-react"
import { listProjects, type Project, type ProjectHealth } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { HealthDot, ventureMeta } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Health — Development | Suprans",
  description: "At-a-glance health signal across every tracked engineering project.",
}

const HEALTH_PRIORITY: Record<ProjectHealth, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  unknown: 3,
}

export default async function DevelopmentHealthPage() {
  const projects: Project[] = await listProjects()

  const counts: Record<ProjectHealth, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    unknown: 0,
  }
  for (const p of projects) counts[p.health]++

  const sorted = projects
    .slice()
    .sort((a, b) => {
      const hp = HEALTH_PRIORITY[a.health] - HEALTH_PRIORITY[b.health]
      if (hp !== 0) return hp
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Health"
        subtitle={`Health signal across ${projects.length} tracked projects — sorted at-risk first so you know where to look.`}
      />

      <KPIGrid>
        <MetricCard
          label="At risk"
          value={counts.red}
          icon={AlertTriangle}
          iconTone="red"
          hint="needs attention"
        />
        <MetricCard
          label="Watching"
          value={counts.yellow}
          icon={Activity}
          iconTone="amber"
          hint="soft signal"
        />
        <MetricCard
          label="Healthy"
          value={counts.green}
          icon={CheckCircle2}
          iconTone="emerald"
          hint="shipping clean"
        />
        <MetricCard
          label="Unknown"
          value={counts.unknown}
          icon={CircleDashed}
          iconTone="slate"
          hint="no signal yet"
        />
      </KPIGrid>

      <DetailCard title="All projects by health">
        {sorted.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No projects tracked"
            description="Add rows to public.projects to see them here."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Project</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Venture</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Health</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Last deploy</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const v = ventureMeta(p.venture)
                return (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="py-2.5">
                      <Link
                        href={`/development/projects/${p.slug}`}
                        className="inline-flex items-center gap-2 hover:text-primary"
                      >
                        <span
                          className={cn(
                            "size-6 rounded flex items-center justify-center text-white text-xs font-semibold",
                            v.gradientClass,
                          )}
                        >
                          {v.short}
                        </span>
                        <span className="text-sm font-medium">{p.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 text-sm text-muted-foreground">{v.label}</td>
                    <td className="py-2.5">
                      <HealthDot health={p.health} withLabel />
                    </td>
                    <td className="py-2.5">
                      <StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge>
                    </td>
                    <td className="py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {relativeTime(p.last_deploy_at)}
                    </td>
                    <td className="py-2.5 text-sm">{p.owner_name ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </DetailCard>
    </div>
  )
}
