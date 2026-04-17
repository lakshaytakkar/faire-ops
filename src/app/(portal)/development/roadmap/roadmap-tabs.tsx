"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Calendar, Sparkles, User2 } from "lucide-react"
import { VentureBadge } from "@/components/development/dev-primitives"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { LargeModal, DetailCard, InfoRow } from "@/components/shared/detail-views"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { cn } from "@/lib/utils"

export interface RoadmapRow {
  id: string
  quarter: string
  venture: string | null
  title: string
  description: string | null
  bullets: string[]
  owner: string | null
  target_date: string | null
  status: "planned" | "in_progress" | "shipped" | "at_risk" | "deferred"
  linked_project_id: string | null
  linked_project_slug: string | null
  linked_project_name: string | null
  sort_order: number
}

export interface ChangelogEntryRow {
  id: string
  entry_date: string
  venture: string | null
  title: string
  description: string | null
  linked_project_id: string | null
  linked_project_slug: string | null
  linked_project_name: string | null
  kind: "release" | "feature" | "fix" | "chore"
}

type TabId = "roadmap" | "changelog"

export function RoadmapTabs({
  roadmap,
  changelog,
}: {
  roadmap: RoadmapRow[]
  changelog: ChangelogEntryRow[]
}) {
  const [tab, setTab] = useState<TabId>("roadmap")
  const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapRow | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntryRow | null>(null)

  const tabs: FilterTab[] = [
    { id: "roadmap", label: "Roadmap", count: roadmap.length },
    { id: "changelog", label: "Changelog", count: changelog.length },
  ]

  const quarters = useMemo(() => {
    const map = new Map<string, RoadmapRow[]>()
    for (const r of roadmap) {
      if (!map.has(r.quarter)) map.set(r.quarter, [])
      map.get(r.quarter)!.push(r)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [roadmap])

  const monthGroups = useMemo(() => {
    const map = new Map<string, ChangelogEntryRow[]>()
    for (const e of changelog) {
      const d = new Date(e.entry_date)
      const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
  }, [changelog])

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "roadmap" && (
        <div className="space-y-8">
          {quarters.map(([quarter, items]) => (
            <section key={quarter} className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-heading text-[0.9375rem] font-semibold tracking-tight">{quarter}</h2>
                <span className="text-xs text-muted-foreground">{items.length} items</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRoadmap(item)}
                    className="text-left rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <VentureBadge venture={item.venture} />
                      <StatusBadge tone={toneForStatus(item.status)}>
                        {item.status.replace("_", " ")}
                      </StatusBadge>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                      )}
                    </div>
                    {item.bullets.length > 0 && (
                      <ul className="space-y-1.5">
                        {item.bullets.slice(0, 4).map((b) => (
                          <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="inline-block size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span className="line-clamp-2">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(item.owner || item.target_date) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                        {item.owner && (
                          <span className="inline-flex items-center gap-1">
                            <User2 className="size-3" /> {item.owner}
                          </span>
                        )}
                        {item.target_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(item.target_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "changelog" && (
        <div className="space-y-8">
          {monthGroups.map(([month, entries]) => (
            <section key={month} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h2 className="font-heading text-[0.9375rem] font-semibold tracking-tight">{month}</h2>
                <span className="text-xs text-muted-foreground">{entries.length} entries</span>
              </div>
              <ol className="relative space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                {entries.map((e) => (
                  <li key={e.id} className="relative pl-7">
                    <span
                      className={cn(
                        "absolute left-0 top-3 size-[15px] rounded-full border-2 border-background",
                        kindDotClass(e.kind),
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(e)}
                      className="w-full text-left rounded-lg border border-border/80 bg-card shadow-sm p-4 space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <VentureBadge venture={e.venture} />
                          <StatusBadge tone={kindTone(e.kind)}>{e.kind}</StatusBadge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(e.entry_date).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {e.linked_project_slug && (
                          <span className="text-xs font-medium text-primary">Open project →</span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold leading-snug">{e.title}</h3>
                      {e.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {selectedRoadmap && (
        <LargeModal title={selectedRoadmap.title} onClose={() => setSelectedRoadmap(null)}>
          <div className="space-y-4">
            <DetailCard title="Overview">
              <InfoRow label="Quarter" value={selectedRoadmap.quarter} />
              <InfoRow label="Venture" value={<VentureBadge venture={selectedRoadmap.venture} />} />
              <InfoRow
                label="Status"
                value={<StatusBadge tone={toneForStatus(selectedRoadmap.status)}>{selectedRoadmap.status.replace("_", " ")}</StatusBadge>}
              />
              <InfoRow label="Owner" value={selectedRoadmap.owner ?? "—"} />
              <InfoRow
                label="Target date"
                value={
                  selectedRoadmap.target_date
                    ? new Date(selectedRoadmap.target_date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              {selectedRoadmap.linked_project_slug && (
                <InfoRow
                  label="Linked project"
                  value={
                    <Link
                      href={`/development/projects/${selectedRoadmap.linked_project_slug}`}
                      className="text-primary hover:underline"
                    >
                      {selectedRoadmap.linked_project_name}
                    </Link>
                  }
                />
              )}
            </DetailCard>

            {selectedRoadmap.description && (
              <DetailCard title="Description">
                <p className="text-sm whitespace-pre-wrap">{selectedRoadmap.description}</p>
              </DetailCard>
            )}

            {selectedRoadmap.bullets.length > 0 && (
              <DetailCard title="Deliverables">
                <ul className="space-y-2">
                  {selectedRoadmap.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <span className="inline-block size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </DetailCard>
            )}
          </div>
        </LargeModal>
      )}

      {selectedEntry && (
        <LargeModal title={selectedEntry.title} onClose={() => setSelectedEntry(null)}>
          <div className="space-y-4">
            <DetailCard title="Overview">
              <InfoRow
                label="Date"
                value={new Date(selectedEntry.entry_date).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
              <InfoRow label="Venture" value={<VentureBadge venture={selectedEntry.venture} />} />
              <InfoRow label="Kind" value={<StatusBadge tone={kindTone(selectedEntry.kind)}>{selectedEntry.kind}</StatusBadge>} />
              {selectedEntry.linked_project_slug && (
                <InfoRow
                  label="Linked project"
                  value={
                    <Link
                      href={`/development/projects/${selectedEntry.linked_project_slug}`}
                      className="text-primary hover:underline"
                    >
                      {selectedEntry.linked_project_name}
                    </Link>
                  }
                />
              )}
            </DetailCard>
            {selectedEntry.description && (
              <DetailCard title="Notes">
                <p className="text-sm whitespace-pre-wrap">{selectedEntry.description}</p>
              </DetailCard>
            )}
          </div>
        </LargeModal>
      )}
    </>
  )
}

function kindTone(kind: ChangelogEntryRow["kind"]): StatusTone {
  switch (kind) {
    case "release":
      return "emerald"
    case "feature":
      return "blue"
    case "fix":
      return "amber"
    case "chore":
      return "slate"
  }
}

function kindDotClass(kind: ChangelogEntryRow["kind"]) {
  switch (kind) {
    case "release":
      return "bg-emerald-500"
    case "feature":
      return "bg-blue-500"
    case "fix":
      return "bg-amber-500"
    case "chore":
      return "bg-slate-400"
  }
}
