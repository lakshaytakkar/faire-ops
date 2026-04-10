import Link from "next/link"
import { notFound } from "next/navigation"
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
  getProjectBySlug,
  summarizeChecklist,
  kindLabel,
  versionLabel,
  versionColor,
  type ChecklistItem,
  type ProjectPage,
  type ProjectKind,
} from "@/lib/projects"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: "Project not found — TeamSync AI" }
  return {
    title: `${project.name} — Projects — TeamSync AI`,
    description: project.description ?? undefined,
  }
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

function StatusIcon({ status }: { status: ChecklistItem["status"] }) {
  switch (status) {
    case "done":
      return <Check className="h-3.5 w-3.5 text-emerald-600" />
    case "in-progress":
      return <CircleDashed className="h-3.5 w-3.5 text-blue-600" />
    case "not-applicable":
      return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
    case "pending":
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
  }
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const labelClass =
    item.status === "done"
      ? "text-foreground"
      : item.status === "in-progress"
        ? "text-foreground"
        : item.status === "not-applicable"
          ? "text-muted-foreground line-through"
          : "text-muted-foreground"
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 shrink-0">
        <StatusIcon status={item.status} />
      </span>
      <span className={`text-xs ${labelClass} flex-1`}>{item.item_label}</span>
      {item.status !== "pending" && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
          {item.status === "done"
            ? "Done"
            : item.status === "in-progress"
              ? "WIP"
              : "N/A"}
        </span>
      )}
    </li>
  )
}

function PageRow({ page, depth = 0 }: { page: ProjectPage; depth?: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 py-1.5 text-xs"
        style={{ paddingLeft: depth * 14 }}
      >
        <StatusIcon status={page.status} />
        <span className="font-medium text-foreground truncate">
          {page.name}
        </span>
        {page.path && (
          <code className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded truncate">
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const summary = summarizeChecklist(project.checklist)
  const Icon = kindIcon(project.kind)
  const color = project.color || "#6366f1"

  // Group checklist items into three sections for easier scanning
  const done = project.checklist.filter((i) => i.status === "done")
  const inProgress = project.checklist.filter((i) => i.status === "in-progress")
  const pending = project.checklist.filter(
    (i) => i.status === "pending" || i.status === "not-applicable"
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1100px] mx-auto px-6 py-10 md:py-14">
        {/* Back */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to projects
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="flex items-center justify-center h-14 w-14 rounded-xl shrink-0 ring-1 ring-black/[0.04]"
            style={{
              background: `linear-gradient(135deg, ${color}33, ${color}14)`,
            }}
          >
            <Icon className="h-7 w-7" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {project.brand_label}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset bg-muted/60 text-muted-foreground ring-border/60`}
              >
                {kindLabel(project.kind)}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${versionColor(project.version)}`}
              >
                {versionLabel(project.version)}
              </span>
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {project.url}
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 rounded-lg border border-border/80 bg-card shadow-sm p-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Delivery progress
              </p>
              <p className="text-2xl font-bold font-heading text-foreground mt-0.5">
                {summary.percentComplete}%
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground leading-tight">
              <p>
                <span className="font-bold text-emerald-600">
                  {summary.done}
                </span>{" "}
                done
              </p>
              <p>
                <span className="font-bold text-blue-600">
                  {summary.inProgress}
                </span>{" "}
                in progress
              </p>
              <p>
                <span className="font-bold text-foreground">
                  {summary.pending}
                </span>{" "}
                pending
              </p>
              {summary.notApplicable > 0 && (
                <p>
                  <span className="font-bold text-muted-foreground">
                    {summary.notApplicable}
                  </span>{" "}
                  n/a
                </p>
              )}
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${summary.percentComplete}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>

        {/* Three-column content layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checklist */}
          <section className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-sm p-5">
            <h2 className="text-base font-bold font-heading text-foreground mb-1">
              Checklist
            </h2>
            <p className="text-[11px] text-muted-foreground mb-4">
              29 delivery items — edit in Supabase (table{" "}
              <code className="font-mono bg-muted/60 px-1 rounded">
                project_checklist
              </code>
              ) to update statuses.
            </p>

            {inProgress.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">
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
              <div className="mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
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
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
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
          <aside className="space-y-6">
            {/* Pages */}
            <section className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
              <h2 className="text-base font-bold font-heading text-foreground mb-1">
                Pages
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                {project.pages.length} top-level pages tracked
              </p>
              {project.pages.length > 0 ? (
                <ul>
                  {project.pages.map((p) => (
                    <PageRow key={p.id} page={p} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No pages tracked yet.
                </p>
              )}
            </section>

            {/* Plugins */}
            <section className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
              <h2 className="text-base font-bold font-heading text-foreground mb-1">
                Plugins
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                {project.plugins.length} modules installed
              </p>
              {project.plugins.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {project.plugins.map((pl) => (
                    <li
                      key={pl.id}
                      className="inline-flex items-center rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground"
                    >
                      {pl.plugin_label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No plugins installed yet.
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-border/60">
                <Link
                  href="/plugins"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Browse all plugins →
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
