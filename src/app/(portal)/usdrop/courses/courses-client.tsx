"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"

export interface CourseRow {
  id: string
  title: string | null
  slug: string | null
  instructor_id: string | null
  published: boolean | null
  featured: boolean | null
  is_onboarding: boolean | null
  lessons_count: number | null
  students_count: number | null
  duration_minutes: number | null
  level: string | null
  created_at: string | null
}

export function CoursesClient({
  rows,
  moduleCounts,
}: {
  rows: CourseRow[]
  moduleCounts: Record<string, number>
}) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  const tabs: FilterTab[] = useMemo(() => {
    const published = rows.filter((r) => r.published).length
    const onboarding = rows.filter((r) => r.is_onboarding).length
    const featured = rows.filter((r) => r.featured).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "published", label: "Published", count: published },
      { id: "draft", label: "Draft", count: rows.length - published },
      { id: "onboarding", label: "Onboarding", count: onboarding },
      { id: "featured", label: "Featured", count: featured },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab === "published" && !r.published) return false
      if (activeTab === "draft" && r.published) return false
      if (activeTab === "onboarding" && !r.is_onboarding) return false
      if (activeTab === "featured" && !r.featured) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.title, r.slug, r.level].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeTab, search])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, slug, level…",
        }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses match"
          description="Try a different search term or tab."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Level</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Modules</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Lessons</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Students</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/usdrop/courses/${c.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {c.title ?? "Untitled"}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1">
                      {c.is_onboarding && (
                        <StatusBadge tone="blue">Onboarding</StatusBadge>
                      )}
                      {c.featured && (
                        <StatusBadge tone="violet">Featured</StatusBadge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.level ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {moduleCounts[c.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {c.lessons_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {(c.students_count ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(c.published ? "live" : "inactive")}>
                      {c.published ? "Live" : "Draft"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
