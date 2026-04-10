import Link from "next/link"
import { ArrowUpRight, Globe, Lock, Shield, Truck } from "lucide-react"
import {
  type Project,
  type ProjectKind,
  type ChecklistSummary,
  kindLabel,
  versionLabel,
  versionColor,
} from "@/lib/projects"

/**
 * Presentational grid used by both `/projects` (light tone) and the inline
 * Projects view on the homepage (glass tone on top of the wallpaper).
 */

type Tone = "light" | "glass"

interface ProjectsGridProps {
  projects: Project[]
  summaries: Map<string, ChecklistSummary>
  tone?: Tone
}

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ")
}

function kindIcon(kind: ProjectKind) {
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

function ProjectCard({
  project,
  summary,
  tone,
}: {
  project: Project
  summary: ChecklistSummary | undefined
  tone: Tone
}) {
  const Icon = kindIcon(project.kind)
  const color = project.color || "#6366f1"
  const isGlass = tone === "glass"
  const pct = summary?.percentComplete ?? 0

  const wrapperTone = isGlass
    ? "bg-white/10 backdrop-blur-sm border-white/15 hover:bg-white/15 hover:border-white/30"
    : "bg-card border-border/80 hover:border-foreground/20 hover:shadow-md"

  const titleColor = isGlass ? "text-white" : "text-foreground"
  const descColor = isGlass ? "text-white/70" : "text-muted-foreground"
  const brandColor = isGlass ? "text-white/50" : "text-muted-foreground"
  const barBg = isGlass ? "bg-white/10" : "bg-muted/60"

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cx(
        "group relative flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition-all",
        wrapperTone
      )}
    >
      {/* Header: brand + kind + version + external */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="flex items-center justify-center h-10 w-10 rounded-md shrink-0 ring-1 ring-black/[0.04]"
            style={{
              background: `linear-gradient(135deg, ${color}33, ${color}14)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cx(
                "text-[10px] font-bold uppercase tracking-wider truncate",
                brandColor
              )}
            >
              {project.brand_label}
            </p>
            <h3
              className={cx(
                "text-sm font-semibold font-heading leading-tight truncate",
                titleColor
              )}
            >
              {project.name}
            </h3>
          </div>
        </div>
        <ArrowUpRight
          className={cx(
            "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            isGlass ? "text-white/60" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Kind + Version pills */}
      <div className="flex items-center gap-1.5">
        <span
          className={cx(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            isGlass
              ? "bg-white/10 text-white/80 ring-white/20"
              : "bg-muted/60 text-muted-foreground ring-border/60"
          )}
        >
          {kindLabel(project.kind)}
        </span>
        <span
          className={cx(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
            isGlass
              ? "bg-white/15 text-white ring-white/25"
              : versionColor(project.version)
          )}
        >
          {versionLabel(project.version)}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className={cx("text-xs leading-snug line-clamp-2", descColor)}>
          {project.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-[10px] font-medium mb-1">
          <span className={descColor}>
            {summary
              ? `${summary.done} / ${summary.total - summary.notApplicable} done`
              : "—"}
          </span>
          <span className={cx("font-bold", titleColor)}>{pct}%</span>
        </div>
        <div className={cx("h-1.5 rounded-full overflow-hidden", barBg)}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </Link>
  )
}

export function ProjectsGrid({
  projects,
  summaries,
  tone = "light",
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
            "text-3xl md:text-4xl font-bold font-heading tracking-tight",
            headingColor
          )}
        >
          Projects
        </h1>
        <p
          className={cx(
            "mt-3 text-sm md:text-base leading-relaxed",
            mutedColor
          )}
        >
          Every landing page, client portal, admin portal and vendor portal we
          build — grouped by brand, tracked with a 29-item delivery checklist,
          a version (MVP → Stable), and the list of pages and plugins shipped
          into each one.{" "}
          <span className={cx("font-semibold", headingColor)}>
            {totalProjects}
          </span>{" "}
          projects, {totalDone} / {totalItems} checklist items complete.
        </p>
      </div>

      {/* Brand sections */}
      <div className="mt-10 space-y-10">
        {Array.from(byBrand.entries()).map(([brandLabel, list]) => (
          <section key={brandLabel}>
            <h2
              className={cx(
                "text-lg md:text-xl font-bold font-heading mb-4",
                headingColor
              )}
            >
              {brandLabel}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  summary={summaries.get(project.id)}
                  tone={tone}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div
        className={cx(
          "mt-16 pt-8 border-t text-xs",
          dividerColor,
          mutedColor
        )}
      >
        {totalProjects} projects · {byBrand.size} brands · {totalDone} /{" "}
        {totalItems} checklist items complete
      </div>
    </div>
  )
}
