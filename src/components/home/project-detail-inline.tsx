"use client"

import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  CircleDashed,
  MinusCircle,
  Globe,
  Lock,
  Shield,
  Truck,
  type LucideIcon,
} from "lucide-react"
import {
  type ProjectWithChildren,
  type ProjectPage,
  type ChecklistItem,
  type ProjectKind,
  summarizeChecklist,
  kindLabel,
  versionLabel,
} from "@/lib/projects"

/**
 * Compact, glass-tone project detail used inside <HomeLauncher> so clicking
 * a row in the Projects tab stays on the homepage wallpaper. Mirrors the
 * standalone `/projects/[slug]` route but densely packed and dark.
 */

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

function StatusIcon({ status }: { status: ChecklistItem["status"] }) {
  switch (status) {
    case "done":
      return <Check className="h-3 w-3 text-emerald-400" />
    case "in-progress":
      return <CircleDashed className="h-3 w-3 text-blue-400" />
    case "not-applicable":
      return <MinusCircle className="h-3 w-3 text-white/30" />
    case "pending":
    default:
      return <Circle className="h-3 w-3 text-white/30" />
  }
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const labelClass =
    item.status === "done"
      ? "text-white/90"
      : item.status === "in-progress"
        ? "text-white/90 font-medium"
        : item.status === "not-applicable"
          ? "text-white/40 line-through"
          : "text-white/55"
  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-0.5 shrink-0">
        <StatusIcon status={item.status} />
      </span>
      <span className={`text-[11px] ${labelClass} flex-1`}>
        {item.item_label}
      </span>
    </li>
  )
}

function PageRow({ page, depth = 0 }: { page: ProjectPage; depth?: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 py-1 text-[11px]"
        style={{ paddingLeft: depth * 12 }}
      >
        <StatusIcon status={page.status} />
        <span className="font-medium text-white/90 truncate">{page.name}</span>
        {page.path && (
          <code className="text-[10px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded truncate">
            {page.path}
          </code>
        )}
      </div>
      {page.subpages && page.subpages.length > 0 && (
        <ul>
          {page.subpages.map((sub) => (
            <PageRow key={sub.id} page={sub} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

interface ProjectDetailInlineProps {
  project: ProjectWithChildren
  onBack: () => void
}

export function ProjectDetailInline({
  project,
  onBack,
}: ProjectDetailInlineProps) {
  const summary = summarizeChecklist(project.checklist)
  const Icon = kindIcon(project.kind)
  const color = project.color || "#6366f1"

  const done = project.checklist.filter((i) => i.status === "done")
  const inProgress = project.checklist.filter(
    (i) => i.status === "in-progress"
  )
  const pending = project.checklist.filter(
    (i) => i.status === "pending" || i.status === "not-applicable"
  )

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to projects
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center h-12 w-12 rounded-lg shrink-0 ring-1 ring-white/20"
          style={{
            background: `linear-gradient(135deg, ${color}44, ${color}22)`,
          }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            {project.brand_label}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold font-heading tracking-tight text-white">
              {project.name}
            </h1>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset bg-white/10 text-white/80 ring-white/20">
              {kindLabel(project.kind)}
            </span>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset bg-white/15 text-white ring-white/25">
              {versionLabel(project.version)}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-xs text-white/65 leading-snug max-w-2xl line-clamp-2">
              {project.description}
            </p>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-white/80 hover:text-white"
            >
              {project.url}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Inline progress chip */}
        <div className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
            Progress
          </p>
          <p className="text-2xl font-bold font-heading text-white leading-none mt-0.5">
            {summary.percentComplete}%
          </p>
          <p className="text-[9px] text-white/50 mt-1">
            {summary.done}/{summary.total - summary.notApplicable} done
          </p>
        </div>
      </div>

      {/* Slim progress bar */}
      <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${summary.percentComplete}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Content — two columns, compact */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Checklist */}
        <section className="lg:col-span-2 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-xs font-bold font-heading text-white mb-3">
            Checklist{" "}
            <span className="text-white/40 font-normal">
              · {summary.total} items
            </span>
          </h2>

          {inProgress.length > 0 && (
            <div className="mb-3">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">
                In progress ({inProgress.length})
              </h3>
              <ul>
                {inProgress.map((i) => (
                  <ChecklistRow key={i.id} item={i} />
                ))}
              </ul>
            </div>
          )}

          {done.length > 0 && (
            <div className="mb-3">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                Done ({done.length})
              </h3>
              <ul>
                {done.map((i) => (
                  <ChecklistRow key={i.id} item={i} />
                ))}
              </ul>
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-white/45 mb-0.5">
                Pending ({pending.length})
              </h3>
              <ul>
                {pending.map((i) => (
                  <ChecklistRow key={i.id} item={i} />
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Sidebar: pages + plugins */}
        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-xs font-bold font-heading text-white mb-1">
              Pages{" "}
              <span className="text-white/40 font-normal">
                · {project.pages.length}
              </span>
            </h2>
            {project.pages.length > 0 ? (
              <ul className="mt-2">
                {project.pages.map((p) => (
                  <PageRow key={p.id} page={p} />
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-white/45 italic mt-2">
                No pages tracked yet.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="text-xs font-bold font-heading text-white mb-1">
              Plugins{" "}
              <span className="text-white/40 font-normal">
                · {project.plugins.length}
              </span>
            </h2>
            {project.plugins.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {project.plugins.map((pl) => (
                  <li
                    key={pl.id}
                    className="inline-flex items-center rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/90"
                  >
                    {pl.plugin_label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-white/45 italic mt-2">
                No plugins installed yet.
              </p>
            )}
            <div className="mt-3 pt-2 border-t border-white/10">
              <Link
                href="/plugins"
                className="text-[11px] font-medium text-white/75 hover:text-white"
              >
                Browse all plugins →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
