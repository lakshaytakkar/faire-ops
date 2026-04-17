"use client"

import { X, Layers, GitBranch, Database, Link2, Shield, Box } from "lucide-react"
import type { TaskDetail, PluginSpec } from "../_data/task-details"

type TabKey = "tasks" | "ideas" | "bugs" | "plugins"

interface Props {
  title: string
  tab: TabKey
  detail: TaskDetail | undefined
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-emerald-100 text-emerald-700",
  idea: "bg-violet-100 text-violet-700",
  built: "bg-blue-100 text-blue-700",
  stable: "bg-emerald-100 text-emerald-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  med: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color} capitalize`}>
      {label.replace(/_/g, " ")}
    </span>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 list-disc pl-5 marker:text-muted-foreground/50">
      {items.map((it, i) => (
        <li key={i} className="leading-relaxed">{it}</li>
      ))}
    </ul>
  )
}

function Meta({ detail }: { detail: TaskDetail }) {
  const pills: Array<{ label: string; color: string }> = []
  if (detail.status) pills.push({ label: detail.status, color: STATUS_COLORS[detail.status] ?? "bg-slate-100 text-slate-700" })
  if (detail.priority) pills.push({ label: `priority: ${detail.priority}`, color: PRIORITY_COLORS[detail.priority] ?? "bg-slate-100 text-slate-700" })
  if (detail.severity) pills.push({ label: `severity: ${detail.severity}`, color: SEVERITY_COLORS[detail.severity] ?? "bg-slate-100 text-slate-700" })
  if (detail.impact) pills.push({ label: `impact: ${detail.impact}`, color: "bg-teal-100 text-teal-700" })
  if (detail.effort) pills.push({ label: `effort: ${detail.effort}`, color: "bg-sky-100 text-sky-700" })
  if (detail.plugin?.status) pills.push({ label: detail.plugin.status, color: STATUS_COLORS[detail.plugin.status] ?? "bg-slate-100 text-slate-700" })
  if (detail.owner) pills.push({ label: detail.owner, color: "bg-indigo-100 text-indigo-700" })
  if (detail.space) pills.push({ label: detail.space, color: "bg-pink-100 text-pink-700" })

  if (pills.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((p, i) => <Pill key={i} label={p.label} color={p.color} />)}
    </div>
  )
}

function PluginBody({ plugin }: { plugin: PluginSpec }) {
  return (
    <div className="space-y-5">
      {plugin.purpose && (
        <Section title="Purpose" icon={Box}>
          <p className="leading-relaxed">{plugin.purpose}</p>
        </Section>
      )}

      {plugin.screens && plugin.screens.length > 0 && (
        <Section title={`Screens & pages (${plugin.screens.length})`} icon={Layers}>
          <div className="space-y-3">
            {plugin.screens.map((s, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <code className="text-[11px] text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded">{s.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.purpose}</p>
                  </div>
                </div>
                {s.subpages && s.subpages.length > 0 && (
                  <div className="mt-2.5 pl-3 border-l-2 border-border/60 space-y-1.5">
                    {s.subpages.map((sp, j) => (
                      <div key={j}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">{sp.name}</span>
                          <code className="text-[11px] text-muted-foreground bg-background/70 px-1.5 py-0.5 rounded">{sp.path}</code>
                        </div>
                        <p className="text-sm text-muted-foreground">{sp.purpose}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {plugin.flows && plugin.flows.length > 0 && (
        <Section title={`Flows (${plugin.flows.length})`} icon={GitBranch}>
          <div className="space-y-2">
            {plugin.flows.map((f, i) => (
              <div key={i} className="rounded-md border border-border/60 p-2.5">
                <div className="text-sm font-medium">{f.name}</div>
                <div className="text-sm text-muted-foreground">{f.description}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {plugin.dataModel && plugin.dataModel.length > 0 && (
        <Section title="Data model" icon={Database}>
          <div className="flex flex-wrap gap-1.5">
            {plugin.dataModel.map((t, i) => (
              <code key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded">{t}</code>
            ))}
          </div>
        </Section>
      )}

      {plugin.apis && plugin.apis.length > 0 && (
        <Section title="APIs" icon={Link2}>
          <div className="space-y-0.5">
            {plugin.apis.map((a, i) => (
              <code key={i} className="block text-[11px] bg-muted px-2 py-0.5 rounded w-fit">{a}</code>
            ))}
          </div>
        </Section>
      )}

      {plugin.integrations && plugin.integrations.length > 0 && (
        <Section title="Depends on" icon={Link2}>
          <div className="flex flex-wrap gap-1.5">
            {plugin.integrations.map((t, i) => (
              <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </Section>
      )}

      {plugin.permissions && plugin.permissions.length > 0 && (
        <Section title="Permissions" icon={Shield}>
          <BulletList items={plugin.permissions} />
        </Section>
      )}

      {plugin.widgets && plugin.widgets.length > 0 && (
        <Section title="Widgets (right-dock / inline)">
          <BulletList items={plugin.widgets} />
        </Section>
      )}
    </div>
  )
}

function TaskBody({ detail }: { detail: TaskDetail }) {
  return (
    <div className="space-y-4">
      {detail.objective && (
        <Section title="Objective">
          <p className="leading-relaxed">{detail.objective}</p>
        </Section>
      )}
      {detail.acceptance && detail.acceptance.length > 0 && (
        <Section title="Acceptance criteria">
          <BulletList items={detail.acceptance} />
        </Section>
      )}
      {detail.steps && detail.steps.length > 0 && (
        <Section title="Steps">
          <ol className="space-y-1 list-decimal pl-5 marker:text-muted-foreground/60">
            {detail.steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
          </ol>
        </Section>
      )}
      {detail.blockers && detail.blockers.length > 0 && (
        <Section title="Blockers">
          <BulletList items={detail.blockers} />
        </Section>
      )}
      {detail.estimate && (
        <Section title="Estimate">
          <p>{detail.estimate}</p>
        </Section>
      )}
    </div>
  )
}

function IdeaBody({ detail }: { detail: TaskDetail }) {
  return (
    <div className="space-y-4">
      {detail.problem && (
        <Section title="Problem">
          <p className="leading-relaxed">{detail.problem}</p>
        </Section>
      )}
      {detail.valueProp && (
        <Section title="Value prop">
          <p className="leading-relaxed">{detail.valueProp}</p>
        </Section>
      )}
      {detail.hypothesis && (
        <Section title="Hypothesis">
          <p className="leading-relaxed">{detail.hypothesis}</p>
        </Section>
      )}
      {detail.successMetric && (
        <Section title="Success metric">
          <p>{detail.successMetric}</p>
        </Section>
      )}
    </div>
  )
}

function BugBody({ detail }: { detail: TaskDetail }) {
  return (
    <div className="space-y-4">
      {detail.area && (
        <Section title="Area">
          <p>{detail.area}</p>
        </Section>
      )}
      {detail.affectedPaths && detail.affectedPaths.length > 0 && (
        <Section title="Affected paths">
          <div className="space-y-0.5">
            {detail.affectedPaths.map((p, i) => (
              <code key={i} className="block text-[11px] bg-muted px-2 py-0.5 rounded w-fit">{p}</code>
            ))}
          </div>
        </Section>
      )}
      {detail.repro && detail.repro.length > 0 && (
        <Section title="Steps to reproduce">
          <ol className="space-y-1 list-decimal pl-5 marker:text-muted-foreground/60">
            {detail.repro.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
          </ol>
        </Section>
      )}
      {detail.expected && (
        <Section title="Expected">
          <p className="leading-relaxed">{detail.expected}</p>
        </Section>
      )}
      {detail.actual && (
        <Section title="Actual">
          <p className="leading-relaxed">{detail.actual}</p>
        </Section>
      )}
      {detail.suspectedCause && (
        <Section title="Suspected cause">
          <p className="leading-relaxed">{detail.suspectedCause}</p>
        </Section>
      )}
      {detail.fixPlan && detail.fixPlan.length > 0 && (
        <Section title="Fix plan">
          <BulletList items={detail.fixPlan} />
        </Section>
      )}
    </div>
  )
}

export function TaskDetailModal({ title, tab, detail, onClose }: Props) {
  const d: TaskDetail = detail ?? {}

  let body: React.ReactNode = null
  if (tab === "plugins") {
    body = d.plugin ? <PluginBody plugin={d.plugin} /> : (
      <EmptyDetail message="No plugin spec yet. Add screens, pages, and flows in src/app/tasks/_data/task-details.ts." />
    )
  } else if (tab === "bugs") {
    body = hasAny(d, ["area", "affectedPaths", "repro", "expected", "actual", "suspectedCause", "fixPlan"])
      ? <BugBody detail={d} />
      : <EmptyDetail message="No bug detail seeded yet — add one in _data/task-details.ts." />
  } else if (tab === "ideas") {
    body = hasAny(d, ["problem", "valueProp", "hypothesis", "successMetric"])
      ? <IdeaBody detail={d} />
      : <EmptyDetail message="No idea detail seeded yet — add one in _data/task-details.ts." />
  } else {
    body = hasAny(d, ["objective", "acceptance", "steps", "blockers", "estimate"])
      ? <TaskBody detail={d} />
      : <EmptyDetail message="No task detail seeded yet — add one in _data/task-details.ts." />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-xl my-4 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug">{title}</h3>
            {d.summary && <p className="text-xs text-muted-foreground mt-0.5">{d.summary}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors shrink-0">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-5">
          <Meta detail={d} />
          {body}
        </div>
      </div>
    </div>
  )
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed py-2">{message}</div>
  )
}

function hasAny(d: TaskDetail, keys: Array<keyof TaskDetail>): boolean {
  return keys.some((k) => {
    const v = d[k]
    if (v === undefined || v === null) return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "string") return v.length > 0
    return true
  })
}
