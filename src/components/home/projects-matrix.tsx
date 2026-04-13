"use client"

/**
 * Projects → production readiness matrix.
 *
 * Rows = projects (grouped by brand), columns = the 8 canonical
 * dimensions + an overall rollup. Cells render as percentage badges
 * color-coded by completion, with N/A shown as a muted dash. Clicking a
 * cell opens that project's detail view with the clicked dimension
 * pre-expanded.
 */

import {
  type Project,
  type ProjectWithChildren,
  DIMENSIONS,
  summarizeByDimension,
  summarizeChecklist,
} from "@/lib/projects"
import { cn } from "@/lib/utils"

type Tone = "light" | "glass"

interface ProjectsMatrixProps {
  projects: Project[]
  detailMap: Map<string, ProjectWithChildren>
  tone?: Tone
  onSelectSlug: (slug: string, dimension?: string) => void
}

function cellTone(percent: number | null, tone: Tone): string {
  if (percent === null) {
    return tone === "glass"
      ? "bg-white/5 text-white/30"
      : "bg-muted/40 text-muted-foreground/60"
  }
  if (percent >= 100) return "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
  if (percent >= 60) return "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
  if (percent >= 30) return "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
  if (percent > 0) return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
  return tone === "glass"
    ? "bg-white/8 text-white/50 ring-1 ring-white/10"
    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
}

function overallTone(percent: number, tone: Tone): string {
  if (percent >= 100) return "bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-500/50"
  if (percent >= 60) return "bg-blue-500/30 text-blue-200 ring-1 ring-blue-500/50"
  if (percent >= 30) return "bg-amber-500/30 text-amber-200 ring-1 ring-amber-500/50"
  if (percent > 0) return "bg-rose-500/30 text-rose-200 ring-1 ring-rose-500/50"
  return tone === "glass"
    ? "bg-white/10 text-white/60 ring-1 ring-white/15"
    : "bg-slate-200 text-slate-600 ring-1 ring-slate-300"
}

export function ProjectsMatrix({
  projects,
  detailMap,
  tone = "glass",
  onSelectSlug,
}: ProjectsMatrixProps) {
  // Group projects by brand while preserving sort_order.
  const byBrand = new Map<string, { label: string; color: string | null; items: Project[] }>()
  for (const p of projects) {
    const g = byBrand.get(p.brand) ?? {
      label: p.brand_label,
      color: p.color,
      items: [] as Project[],
    }
    g.items.push(p)
    byBrand.set(p.brand, g)
  }

  const headerClass =
    tone === "glass"
      ? "bg-black/40 text-white/80 border-white/10"
      : "bg-muted/60 text-foreground border-border/80"

  const rowHoverClass =
    tone === "glass"
      ? "hover:bg-white/5"
      : "hover:bg-muted/40"

  const brandHeaderClass =
    tone === "glass"
      ? "bg-white/5 text-white/60 border-white/10"
      : "bg-muted/30 text-muted-foreground border-border/60"

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border",
        tone === "glass" ? "border-white/10" : "border-border/80"
      )}
    >
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className={cn("border-b", headerClass)}>
            <th className="text-left font-semibold px-4 py-3 min-w-[260px]">
              Project
            </th>
            {DIMENSIONS.map((d) => (
              <th
                key={d.key}
                className="text-center font-semibold px-2 py-3 min-w-[96px] whitespace-nowrap"
                title={d.label}
              >
                {d.label}
              </th>
            ))}
            <th className="text-center font-semibold px-3 py-3 min-w-[80px]">
              Overall
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from(byBrand.entries()).map(([brand, group]) => (
            <>
              <tr key={`brand-${brand}`} className={cn("border-b", brandHeaderClass)}>
                <td colSpan={DIMENSIONS.length + 2} className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {group.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                </td>
              </tr>
              {group.items.map((p) => {
                const detail = detailMap.get(p.slug)
                const byDim = detail
                  ? summarizeByDimension(detail.checklist)
                  : DIMENSIONS.map((d) => ({
                      key: d.key,
                      label: d.label,
                      percent: null,
                      done: 0,
                      total: 0,
                    }))
                const overall = detail
                  ? summarizeChecklist(detail.checklist)
                  : { total: 0, done: 0, inProgress: 0, pending: 0, notApplicable: 0, percentComplete: 0 }
                return (
                  <tr
                    key={p.slug}
                    className={cn(
                      "border-b transition-colors",
                      tone === "glass" ? "border-white/5" : "border-border/60",
                      rowHoverClass
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectSlug(p.slug)}
                        className={cn(
                          "flex items-center gap-2 text-left w-full",
                          tone === "glass" ? "text-white" : "text-foreground"
                        )}
                      >
                        <span className="font-medium text-sm">{p.name}</span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset",
                            tone === "glass"
                              ? "bg-white/5 text-white/60 ring-white/10"
                              : "bg-muted/60 text-muted-foreground ring-border/60"
                          )}
                        >
                          {p.kind === "admin-portal"
                            ? "admin"
                            : p.kind === "client-portal"
                              ? "client"
                              : p.kind === "vendor-portal"
                                ? "vendor"
                                : "landing"}
                        </span>
                      </button>
                    </td>
                    {byDim.map((d) => (
                      <td key={d.key} className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectSlug(p.slug, d.key)}
                          className={cn(
                            "w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-transform hover:scale-[1.05]",
                            cellTone(d.percent, tone)
                          )}
                          title={
                            d.percent === null
                              ? "Not applicable"
                              : `${d.done}/${d.total} complete`
                          }
                        >
                          {d.percent === null ? "—" : `${d.percent}%`}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold",
                          overallTone(overall.percentComplete, tone)
                        )}
                      >
                        {overall.percentComplete}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
