"use client"

import Link from "next/link"
import { Globe, Lock, Shield, Truck, type LucideIcon } from "lucide-react"
import {
  type Project,
  type ProjectKind,
  type ChecklistSummary,
  kindLabel,
  versionLabel,
  versionColor,
} from "@/lib/projects"

/**
 * Compact index-style list of projects. Used by both `/projects` (light
 * tone, rows are Links to `/projects/[slug]`) and the inline Projects tab
 * on the homepage (glass tone, rows are buttons that call `onSelectSlug`
 * to open the detail view inline on the same wallpaper).
 */

type Tone = "light" | "glass"

interface ProjectsGridProps {
  projects: Project[]
  summaries: Map<string, ChecklistSummary>
  tone?: Tone
  /**
   * Optional — when provided, rows render as buttons and call this handler
   * instead of navigating. This is how the homepage inline view swaps to
   * the inline detail view without leaving the page.
   */
  onSelectSlug?: (slug: string) => void
}

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ")
}

function kindIcon(kind: ProjectKind): LucideIcon {
  switch (kind) {
    case "landing":
      return Globe
    case "client-portal":
      return Lock
    case "admin-portal":
      return Shield
    case "vendor-portal":
      return Truck
  }
}

function ProjectRow({
  project,
  summary,
  tone,
  onSelectSlug,
}: {
  project: Project
  summary: ChecklistSummary | undefined
  tone: Tone
  onSelectSlug?: (slug: string) => void
}) {
  const Icon = kindIcon(project.kind)
  const color = project.color || "#6366f1"
  const isGlass = tone === "glass"
  const pct = summary?.percentComplete ?? 0

  const rowTone = isGlass
    ? "bg-white/5 border-white/10 hover:bg-white/12 hover:border-white/25"
    : "bg-card border-border/80 hover:border-foreground/20 hover:shadow-sm"

  const titleColor = isGlass ? "text-white" : "text-foreground"
  const mutedColor = isGlass ? "text-white/55" : "text-muted-foreground"
  const barBg = isGlass ? "bg-white/10" : "bg-muted/60"

  const inner = (
    <div
      className={cx(
        "group flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
        rowTone
      )}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center h-8 w-8 rounded-md shrink-0 ring-1 ring-black/[0.04]"
        style={{
          background: `linear-gradient(135deg, ${color}33, ${color}14)`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>

      {/* Brand / name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "text-sm font-semibold font-heading leading-tight truncate",
              titleColor
            )}
          >
            {project.name}
          </span>
          <span
            className={cx(
              "text-[10px] font-bold uppercase tracking-wider shrink-0",
              mutedColor
            )}
          >
            {project.brand_label}
          </span>
        </div>
      </div>

      {/* Kind pill */}
      <span
        className={cx(
          "hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset shrink-0",
          isGlass
            ? "bg-white/10 text-white/75 ring-white/20"
            : "bg-muted/60 text-muted-foreground ring-border/60"
        )}
      >
        {kindLabel(project.kind)}
      </span>

      {/* Version pill */}
      <span
        className={cx(
          "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset shrink-0",
          isGlass
            ? "bg-white/15 text-white ring-white/25"
            : versionColor(project.version)
        )}
      >
        {versionLabel(project.version)}
      </span>

      {/* Progress */}
      <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
        <div className={cx("flex-1 h-1 rounded-full overflow-hidden", barBg)}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span
          className={cx("text-[10px] font-bold tabular-nums w-8 text-right", titleColor)}
        >
          {pct}%
        </span>
      </div>
    </div>
  )

  // Callback mode — inline click handler (homepage tab)
  if (onSelectSlug) {
    return (
      <button
        type="button"
        onClick={() => onSelectSlug(project.slug)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-md"
      >
        {inner}
      </button>
    )
  }

  // Link mode — standalone /projects route
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
    >
      {inner}
    </Link>
  )
}

export function ProjectsGrid({
  projects,
  summaries,
  tone = "light",
  onSelectSlug,
}: ProjectsGridProps) {
  const isGlass = tone === "glass"
  const headingColor = isGlass ? "text-white" : "text-foreground"
  const mutedColor = isGlass ? "text-white/70" : "text-muted-foreground"
  const dividerColor = isGlass ? "border-white/10" : "border-border/80"

  // Group by brand for section headers
  const byBrand = new Map<string, Project[]>()
  for (const p of projects) {
    const arr = byBrand.get(p.brand_label) ?? []
    arr.push(p)
    byBrand.set(p.brand_label, arr)
  }

  const totalProjects = projects.length
  const totalDone = Array.from(summaries.values()).reduce(
    (acc, s) => acc + s.done,
    0
  )
  const totalItems = Array.from(summaries.values()).reduce(
    (acc, s) => acc + (s.total - s.notApplicable),
    0
  )

  return (
    <div>
      {/* Header */}
      <div className="max-w-3xl">
        <h1
          className={cx(
            "text-2xl md:text-3xl font-bold font-heading tracking-tight",
            headingColor
          )}
        >
          Projects
        </h1>
        <p className={cx("mt-2 text-xs md:text-sm leading-relaxed", mutedColor)}>
          Every landing page, client portal, admin portal and vendor portal we
          build — grouped by brand, tracked with a 29-item delivery checklist.{" "}
          <span className={cx("font-semibold", headingColor)}>
            {totalProjects}
          </span>{" "}
          projects, {totalDone} / {totalItems} items complete.
        </p>
      </div>

      {/* Brand sections */}
      <div className="mt-6 space-y-6">
        {Array.from(byBrand.entries()).map(([brandLabel, list]) => (
          <section key={brandLabel}>
            <h2
              className={cx(
                "text-[11px] font-bold uppercase tracking-wider mb-2",
                mutedColor
              )}
            >
              {brandLabel}
            </h2>
            <div className="flex flex-col gap-1">
              {list.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  summary={summaries.get(project.id)}
                  tone={tone}
                  onSelectSlug={onSelectSlug}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div
        className={cx(
          "mt-8 pt-4 border-t text-[11px]",
          dividerColor,
          mutedColor
        )}
      >
        {totalProjects} projects · {byBrand.size} brands · {totalDone} /{" "}
        {totalItems} items complete
      </div>
    </div>
  )
}
