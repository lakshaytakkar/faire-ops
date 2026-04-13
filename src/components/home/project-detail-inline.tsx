"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  CircleDashed,
  MinusCircle,
  Plus,
  Minus,
  Copy,
  ExternalLink,
  Sparkles,
  Palette,
  Lock as LockIcon,
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
  type ChecklistStatus,
  type ProjectKind,
  DIMENSIONS,
  summarizeChecklist,
  summarizeByDimension,
  kindLabel,
  versionLabel,
  cycleChecklistStatus,
  updateChecklistItemStatus,
} from "@/lib/projects"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

/**
 * Glass-tone six-section project detail used inside <HomeLauncher>.
 *
 * Sections:
 *   1. Header + progress
 *   2. Credentials  (github / supabase / vercel / URLs — mask anon key for non-superadmin)
 *   3. Checklist    (2-level, expandable per dimension; click a child status icon to cycle)
 *   4. Pages        (tree)
 *   5. Plugins      (tag grid)
 *   6. Brand kit    (colors, fonts, tagline, logos)
 *   7. V2 roadmap   (gated — shows a locked-state card until v1 is 100%)
 *
 * Text sizes bumped across the board compared to the previous dense layout.
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

function StatusIcon({ status }: { status: ChecklistStatus | "done" | "in-progress" | "pending" | "not-applicable" }) {
  switch (status) {
    case "done":
      return <Check className="h-4 w-4 text-emerald-400" />
    case "in-progress":
      return <CircleDashed className="h-4 w-4 text-blue-400" />
    case "not-applicable":
      return <MinusCircle className="h-4 w-4 text-white/30" />
    case "pending":
    default:
      return <Circle className="h-4 w-4 text-white/30" />
  }
}

function ClickableStatusIcon({
  item,
  onChange,
}: {
  item: ChecklistItem
  onChange: (next: ChecklistStatus) => void
}) {
  const disabled = !item.applicable
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(cycleChecklistStatus(item.status))
      }}
      className={cn(
        "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-white/10 cursor-pointer"
      )}
      title={
        disabled
          ? "Not applicable"
          : `Status: ${item.status} — click to advance`
      }
    >
      <StatusIcon status={item.applicable ? item.status : "not-applicable"} />
    </button>
  )
}

function PageRow({ page, depth = 0 }: { page: ProjectPage; depth?: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 py-1 text-sm"
        style={{ paddingLeft: depth * 16 }}
      >
        <StatusIcon status={page.status} />
        <span className="font-medium text-white/90 truncate">{page.name}</span>
        {page.path && (
          <code className="text-xs font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded truncate">
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

function CopyableField({
  label,
  value,
  href,
  masked,
}: {
  label: string
  value: string | null
  href?: string | null
  masked?: boolean
}) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const display = masked
    ? value.length > 16
      ? `${value.slice(0, 6)}…${value.slice(-4)}`
      : "••••"
    : value
  async function copy() {
    try {
      await navigator.clipboard.writeText(value!)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="text-white/50 text-xs font-semibold uppercase tracking-wider w-28 shrink-0">
        {label}
      </span>
      <span className="flex-1 text-white/85 font-mono text-xs truncate">
        {display}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          title="Open"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      {copied && (
        <span className="text-[10px] text-emerald-400 font-medium">
          copied
        </span>
      )}
    </div>
  )
}

interface ProjectDetailInlineProps {
  project: ProjectWithChildren
  onBack: () => void
  initialExpandedDimension?: string | null
}

export function ProjectDetailInline({
  project,
  onBack,
  initialExpandedDimension = null,
}: ProjectDetailInlineProps) {
  const { isSuperadmin } = useAuth()
  const [items, setItems] = useState<ChecklistItem[]>(project.checklist)
  const summary = summarizeChecklist(items)
  const Icon = kindIcon(project.kind)
  const color = project.color || "#6366f1"

  // Expanded state per dimension — persisted per-project in localStorage.
  const storageKey = `teamops:project-expanded:${project.slug}`
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (initialExpandedDimension) return new Set([initialExpandedDimension])
    return new Set()
  })
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (initialExpandedDimension) {
      setHydrated(true)
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as string[]
        setExpanded(new Set(parsed))
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [storageKey, initialExpandedDimension])
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(expanded)))
    } catch {
      /* ignore */
    }
  }, [expanded, storageKey, hydrated])

  function toggleDim(dim: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dim)) next.delete(dim)
      else next.add(dim)
      return next
    })
  }

  async function handleStatusChange(id: string, nextStatus: ChecklistStatus) {
    const prev = items
    // Optimistic update
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, status: nextStatus } : it))
    )
    const ok = await updateChecklistItemStatus(id, nextStatus)
    if (!ok) {
      // Rollback
      setItems(prev)
    }
  }

  const dimSummaries = summarizeByDimension(items)
  const v2Unlocked = summary.percentComplete >= 100

  return (
    <div>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex items-center justify-center h-14 w-14 rounded-xl shrink-0 ring-1 ring-white/20"
          style={{
            background: `linear-gradient(135deg, ${color}44, ${color}22)`,
          }}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
            {project.brand_label}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-white">
              {project.name}
            </h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset bg-white/10 text-white/80 ring-white/20">
              {kindLabel(project.kind)}
            </span>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset bg-white/15 text-white ring-white/25">
              {versionLabel(project.version)}
            </span>
          </div>
          {project.description && (
            <p className="mt-1.5 text-sm text-white/70 leading-snug max-w-3xl">
              {project.description}
            </p>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
            >
              {project.url}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Progress chip */}
        <div className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            v1 progress
          </p>
          <p className="text-3xl font-bold font-heading text-white leading-none mt-1">
            {summary.percentComplete}%
          </p>
          <p className="text-xs text-white/50 mt-1">
            {summary.done}/{summary.total - summary.notApplicable} done
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${summary.percentComplete}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Section 1 — Credentials */}
      <Section title="Credentials" icon={LockIcon}>
        {project.credentials ? (
          <div className="space-y-0.5">
            <CopyableField
              label="GitHub"
              value={project.credentials.github_repo_slug ?? project.credentials.github_url}
              href={project.credentials.github_url}
            />
            <CopyableField
              label="Supabase"
              value={project.credentials.supabase_project_url}
              href={project.credentials.supabase_dashboard_url ?? project.credentials.supabase_project_url}
            />
            <CopyableField
              label="Anon key"
              value={project.credentials.supabase_anon_key}
              masked={!isSuperadmin}
            />
            <CopyableField
              label="Vercel"
              value={project.credentials.vercel_project_slug}
              href={project.credentials.vercel_dashboard_url}
            />
            <CopyableField
              label="Production"
              value={project.credentials.production_url}
              href={project.credentials.production_url}
            />
            <CopyableField
              label="Staging"
              value={project.credentials.staging_url}
              href={project.credentials.staging_url}
            />
            <CopyableField
              label="Figma"
              value={project.credentials.figma_url}
              href={project.credentials.figma_url}
            />
          </div>
        ) : (
          <p className="text-sm text-white/50 italic">
            No credentials recorded yet. Add GitHub, Supabase, Vercel and deploy URLs.
          </p>
        )}
      </Section>

      {/* Section 2 — Checklist (2-level) */}
      <Section
        title="Checklist · v1 release gate"
        icon={Check}
        right={
          <span className="text-xs text-white/50">
            Click a status icon to cycle
          </span>
        }
      >
        <div className="space-y-1">
          {DIMENSIONS.map((dim) => {
            const parent = items.find(
              (i) => i.dimension === dim.key && i.parent_key === null
            )
            const children = items
              .filter((i) => i.dimension === dim.key && i.parent_key !== null)
              .sort((a, b) => a.sort_order - b.sort_order)
            const applicable = children.some((c) => c.applicable)
            const dimSum = dimSummaries.find((s) => s.key === dim.key)
            const isExpanded = expanded.has(dim.key)

            return (
              <div
                key={dim.key}
                className={cn(
                  "rounded-lg border border-white/10",
                  applicable ? "bg-white/5" : "bg-white/[0.02] opacity-60"
                )}
              >
                <button
                  type="button"
                  onClick={() => applicable && toggleDim(dim.key)}
                  disabled={!applicable}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left",
                    applicable ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed"
                  )}
                >
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded text-white/70">
                    {!applicable ? (
                      <MinusCircle className="h-4 w-4" />
                    ) : isExpanded ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-white flex-1">
                    {parent?.item_label ?? dim.label}
                  </span>
                  {applicable && dimSum && dimSum.percent !== null && (
                    <>
                      <span className="text-xs text-white/60 font-mono">
                        {dimSum.done}/{dimSum.total}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-md ring-1 ring-inset",
                          dimSum.percent >= 100
                            ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
                            : dimSum.percent >= 60
                              ? "bg-blue-500/20 text-blue-300 ring-blue-500/40"
                              : dimSum.percent >= 30
                                ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
                                : dimSum.percent > 0
                                  ? "bg-rose-500/20 text-rose-300 ring-rose-500/40"
                                  : "bg-white/5 text-white/60 ring-white/10"
                        )}
                      >
                        {dimSum.percent}%
                      </span>
                    </>
                  )}
                  {!applicable && (
                    <span className="text-xs text-white/40 italic">N/A</span>
                  )}
                </button>
                {isExpanded && applicable && (
                  <ul className="px-3 pb-2 pt-0.5 space-y-0.5">
                    {children.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-white/5"
                      >
                        <ClickableStatusIcon
                          item={item}
                          onChange={(next) => handleStatusChange(item.id, next)}
                        />
                        <span
                          className={cn(
                            "text-sm flex-1 leading-relaxed",
                            item.status === "done"
                              ? "text-white/90 line-through"
                              : item.status === "in-progress"
                                ? "text-white/95 font-medium"
                                : item.status === "not-applicable"
                                  ? "text-white/40 line-through"
                                  : "text-white/70"
                          )}
                        >
                          {item.item_label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Section 3 — Pages */}
      <Section
        title={`Pages · ${project.pages.length}`}
        icon={Globe}
      >
        {project.pages.length > 0 ? (
          <ul className="space-y-0.5">
            {project.pages.map((p) => (
              <PageRow key={p.id} page={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50 italic">
            No pages tracked yet.
          </p>
        )}
      </Section>

      {/* Section 4 — Plugins */}
      <Section
        title={`Plugins · ${project.plugins.length}`}
        icon={Sparkles}
      >
        {project.plugins.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {project.plugins.map((pl) => (
              <li
                key={pl.id}
                className={cn(
                  "inline-flex items-center rounded-md ring-1 ring-inset px-2 py-1 text-xs font-medium",
                  pl.status === "installed"
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : pl.status === "configured"
                      ? "bg-blue-500/15 text-blue-300 ring-blue-500/30"
                      : "bg-white/10 text-white/70 ring-white/15"
                )}
              >
                {pl.plugin_label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50 italic">
            No plugins installed yet.
          </p>
        )}
        <div className="mt-3 pt-2 border-t border-white/10">
          <Link
            href="/plugins"
            className="text-sm font-medium text-white/75 hover:text-white"
          >
            Browse all plugins →
          </Link>
        </div>
      </Section>

      {/* Section 5 — Brand kit */}
      <Section title="Brand kit" icon={Palette}>
        {project.brand_kit ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ColorChip hex={project.brand_kit.primary_color} label="Primary" />
              <ColorChip hex={project.brand_kit.accent_color} label="Accent" />
              <ColorChip hex={project.brand_kit.bg_color} label="Background" />
              <ColorChip hex={project.brand_kit.text_color} label="Text" />
            </div>
            {(project.brand_kit.font_heading || project.brand_kit.font_body) && (
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-white/50 text-xs uppercase tracking-wider">
                    Heading
                  </span>
                  <div
                    className="text-white font-semibold text-base mt-0.5"
                    style={{ fontFamily: project.brand_kit.font_heading ?? undefined }}
                  >
                    {project.brand_kit.font_heading ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="text-white/50 text-xs uppercase tracking-wider">
                    Body
                  </span>
                  <div
                    className="text-white/80 text-sm mt-0.5"
                    style={{ fontFamily: project.brand_kit.font_body ?? undefined }}
                  >
                    {project.brand_kit.font_body ?? "—"}
                  </div>
                </div>
              </div>
            )}
            {project.brand_kit.tagline && (
              <blockquote className="text-sm text-white/85 italic border-l-2 border-white/20 pl-3">
                "{project.brand_kit.tagline}"
              </blockquote>
            )}
            {(project.brand_kit.logo_full_url ||
              project.brand_kit.logo_icon_url) && (
              <div className="flex items-center gap-2">
                {project.brand_kit.logo_icon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.brand_kit.logo_icon_url}
                    alt="icon"
                    className="h-12 w-12 object-contain bg-white/5 rounded"
                  />
                )}
                {project.brand_kit.logo_full_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.brand_kit.logo_full_url}
                    alt="full logo"
                    className="h-12 flex-1 object-contain bg-white/5 rounded"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/50 italic">
            No brand kit yet. Add colors, fonts, logos, tagline.
          </p>
        )}
      </Section>

      {/* Section 6 — V2 roadmap */}
      <Section
        title="V2 Roadmap"
        icon={Sparkles}
        right={
          v2Unlocked ? (
            <span className="text-xs text-emerald-400 font-medium">
              Unlocked
            </span>
          ) : (
            <span className="text-xs text-white/50">
              Complete v1 to unlock
            </span>
          )
        }
      >
        {v2Unlocked ? (
          <p className="text-sm text-white/70">
            v1 is ready for production. Add items tagged{" "}
            <code className="text-xs bg-white/10 px-1 py-0.5 rounded">
              release_phase = v2
            </code>{" "}
            here.
          </p>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
            <LockIcon className="h-6 w-6 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/60">
              {summary.percentComplete}% done — complete the v1 checklist to unlock
              the v2 roadmap.
            </p>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string
  icon: LucideIcon
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold font-heading text-white flex items-center gap-2">
          <Icon className="h-4 w-4 text-white/70" />
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function ColorChip({ hex, label }: { hex: string | null; label: string }) {
  if (!hex) {
    return (
      <div className="flex-1 rounded-md bg-white/5 ring-1 ring-white/10 py-3 px-2 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          {label}
        </div>
        <div className="text-xs text-white/30 font-mono mt-1">—</div>
      </div>
    )
  }
  return (
    <div
      className="flex-1 rounded-md ring-1 ring-white/15 py-3 px-2 text-center"
      style={{ backgroundColor: hex }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/90 drop-shadow">
        {label}
      </div>
      <div className="text-xs font-mono text-white/95 mt-1 drop-shadow">
        {hex}
      </div>
    </div>
  )
}
