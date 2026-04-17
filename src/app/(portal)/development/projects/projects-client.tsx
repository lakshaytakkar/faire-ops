"use client"

import { useMemo, useState } from "react"
import type { Project } from "@/lib/projects"
import { DevProjectCard } from "@/components/development/dev-project-card"
import { SectionHeader, ventureMeta } from "@/components/development/dev-primitives"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { FolderKanban } from "lucide-react"

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("")
  const [activeVenture, setActiveVenture] = useState("all")
  const [activeStatus, setActiveStatus] = useState("all")

  const ventures = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) if (p.venture) set.add(p.venture)
    return Array.from(set).sort()
  }, [projects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (activeVenture !== "all" && p.venture !== activeVenture) return false
      if (activeStatus !== "all" && p.status !== activeStatus) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [p.name, p.slug, p.description, p.owner_name, p.venture, ...(p.tech_stack ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [projects, activeVenture, activeStatus, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Project[]>()
    for (const p of filtered) {
      const key = p.venture ?? "unassigned"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      ventureMeta(a).label.localeCompare(ventureMeta(b).label),
    )
  }, [filtered])

  const statusTabs: FilterTab[] = [
    { id: "all", label: "All", count: projects.length },
    { id: "live", label: "Live", count: projects.filter((p) => p.status === "live").length },
    { id: "building", label: "Building", count: projects.filter((p) => p.status === "building").length },
    { id: "planning", label: "Planning", count: projects.filter((p) => p.status === "planning").length },
    { id: "on-hold", label: "On hold", count: projects.filter((p) => p.status === "on-hold").length },
  ]

  return (
    <>
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search project, tech, owner…" }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
        right={
          <select
            value={activeVenture}
            onChange={(e) => setActiveVenture(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All ventures</option>
            {ventures.map((v) => (
              <option key={v} value={v}>
                {ventureMeta(v).label}
              </option>
            ))}
          </select>
        }
      />

      {grouped.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match"
          description="Try clearing filters or search."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([venture, items]) => {
            const v = ventureMeta(venture)
            return (
              <div key={venture}>
                <SectionHeader
                  eyebrow={v.label}
                  title={`${items.length} ${items.length === 1 ? "property" : "properties"}`}
                  description={ventureBlurb(venture)}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {items
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => (
                      <DevProjectCard key={p.id} project={p} />
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function ventureBlurb(venture: string): string {
  switch (venture) {
    case "suprans":
      return "The multi-venture Suprans holding — its public site, admin backbone, and upcoming client-facing portal."
    case "ets":
      return "EazyToSell runs the 40+ store franchise retail network in India. Three surfaces at different build stages."
    case "legalnations":
      return "LegalNations is the US LLC formation service for Indian founders. 500+ customers served."
    case "usdrop-ai":
      return "USDrop AI is the AI-powered US dropshipping platform. 20,000 SKU catalog, Shopify-native, INR-settled."
    case "goyotours":
      return "GoyoTours is the China travel desk — Canton Fair and Yiwu trips."
    case "b2b-brands":
      return "Stand-alone landing pages for our wholesale brands — Gullee and Toyarina — for direct retailer access."
    case "cross-cutting":
      return "Internal platforms that serve every venture — HRMS, ATS, SOP knowledge base, public status page."
    case "teamsync-ai":
      return "The portal you're inside right now, productised for external teams. Same codebase, white-label-ready."
    default:
      return "Ventures grouped here share infrastructure but ship separately."
  }
}
