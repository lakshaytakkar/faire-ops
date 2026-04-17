import { Sparkles, Calendar, User2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { ventureMeta, VentureBadge } from "@/components/development/dev-primitives"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Roadmap by venture — Development | Suprans",
  description: "In-flight roadmap work grouped by the venture that owns it.",
}

type Item = {
  id: string
  quarter: string
  venture: string | null
  title: string
  description: string | null
  bullets: string[]
  owner: string | null
  target_date: string | null
  status: "planned" | "in_progress" | "shipped" | "at_risk" | "deferred"
  linked_project_name: string | null
  linked_project_slug: string | null
}

type Group = {
  venture: string
  inflight: number
  items: Item[]
}

export default async function RoadmapByVenturePage() {
  const [{ data: raw }, projects] = await Promise.all([
    supabase
      .from("roadmap_items")
      .select("id, quarter, venture, title, description, bullets, owner, target_date, status, linked_project_id, sort_order")
      .neq("status", "shipped")
      .order("quarter", { ascending: true })
      .order("sort_order", { ascending: true }),
    listProjects(),
  ])

  const projectById = new Map<string, Project>(projects.map((p) => [p.id, p]))

  const items: Item[] = (raw ?? []).map((r) => {
    const linkedId = (r.linked_project_id as string | null) ?? null
    const linked = linkedId ? projectById.get(linkedId) ?? null : null
    return {
      id: r.id as string,
      quarter: r.quarter as string,
      venture: (r.venture as string | null) ?? null,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      bullets: Array.isArray(r.bullets) ? (r.bullets as string[]) : [],
      owner: (r.owner as string | null) ?? null,
      target_date: (r.target_date as string | null) ?? null,
      status: (r.status as Item["status"]) ?? "planned",
      linked_project_name: linked?.name ?? null,
      linked_project_slug: linked?.slug ?? null,
    }
  })

  const groups = new Map<string, Group>()
  for (const item of items) {
    const key = item.venture ?? "unassigned"
    const cur = groups.get(key) ?? { venture: key, inflight: 0, items: [] }
    cur.items.push(item)
    if (item.status === "in_progress" || item.status === "at_risk") cur.inflight++
    groups.set(key, cur)
  }

  const sorted = Array.from(groups.values())
    .filter((g) => g.items.length > 0)
    .sort((a, b) => {
      if (b.inflight !== a.inflight) return b.inflight - a.inflight
      return b.items.length - a.items.length
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Roadmap by venture"
        subtitle={`${items.length} items in-flight across ${sorted.length} ${sorted.length === 1 ? "venture" : "ventures"} — grouped by ownership, not by quarter.`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing planned"
          description="No unshipped roadmap items. Add rows to public.roadmap_items."
        />
      ) : (
        <div className="space-y-5">
          {sorted.map((group) => {
            const v = ventureMeta(group.venture)
            return (
              <DetailCard
                key={group.venture}
                title={v.label}
                actions={
                  <div className="flex items-center gap-2">
                    {group.inflight > 0 && (
                      <StatusBadge tone="amber">{group.inflight} in-flight</StatusBadge>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                }
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border bg-background p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.quarter}
                        </span>
                        <StatusBadge tone={toneForStatus(item.status)}>
                          {item.status.replace("_", " ")}
                        </StatusBadge>
                      </div>
                      <h4 className="text-sm font-semibold leading-snug">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {(item.owner || item.target_date) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                          {item.owner && (
                            <span className="inline-flex items-center gap-1">
                              <User2 className="size-3" /> {item.owner}
                            </span>
                          )}
                          {item.target_date && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Calendar className="size-3" />
                              {new Date(item.target_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className={cn("mt-3 flex items-center gap-2")}>
                  <VentureBadge venture={group.venture === "unassigned" ? null : group.venture} />
                </div>
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
