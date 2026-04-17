import Link from "next/link"
import { Rocket } from "lucide-react"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { ventureMeta } from "@/components/development/dev-primitives"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Ventures — Development | Suprans",
  description: "Engineering portfolio grouped by the venture that funds each project.",
}

type VentureRoll = {
  live: number
  building: number
  planning: number
  total: number
  projects: Project[]
}

export default async function VenturesPage() {
  const projects: Project[] = await listProjects()

  const byVenture = new Map<string, VentureRoll>()
  for (const p of projects) {
    const key = p.venture ?? "unassigned"
    const cur = byVenture.get(key) ?? {
      live: 0,
      building: 0,
      planning: 0,
      total: 0,
      projects: [],
    }
    cur.total++
    cur.projects.push(p)
    if (p.status === "live") cur.live++
    else if (p.status === "building") cur.building++
    else if (p.status === "planning") cur.planning++
    byVenture.set(key, cur)
  }

  const rows = Array.from(byVenture.entries())
    .filter(([v]) => v !== "unassigned")
    .sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Ventures"
        subtitle={`${rows.length} ventures funding ${projects.length} tracked projects — each venture below rolls up its landings, portals, and apps.`}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No ventures yet"
          description="Assign a venture to each row in public.projects to populate this view."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {rows.map(([venture, roll]) => {
            const v = ventureMeta(venture)
            const sorted = roll.projects
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
            return (
              <DetailCard
                key={venture}
                title={v.label}
                actions={
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {roll.total} {roll.total === 1 ? "project" : "projects"}
                  </span>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-11 rounded-md flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                        v.gradientClass,
                      )}
                      aria-hidden
                    >
                      {v.short}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {roll.live > 0 && (
                        <StatusBadge tone="emerald">{roll.live} live</StatusBadge>
                      )}
                      {roll.building > 0 && (
                        <StatusBadge tone="amber">{roll.building} building</StatusBadge>
                      )}
                      {roll.planning > 0 && (
                        <StatusBadge tone="blue">{roll.planning} planning</StatusBadge>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1 border-t pt-3">
                    {sorted.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/development/projects/${p.slug}`}
                          className="flex items-center justify-between gap-3 py-1.5 hover:text-primary group"
                        >
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          <StatusBadge tone={toneForProjectStatus(p.status)}>
                            {p.status}
                          </StatusBadge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function toneForProjectStatus(
  status: Project["status"],
): "emerald" | "amber" | "blue" | "slate" {
  switch (status) {
    case "live":
      return "emerald"
    case "building":
      return "amber"
    case "planning":
      return "blue"
    default:
      return "slate"
  }
}
