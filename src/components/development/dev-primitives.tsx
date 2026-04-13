import {
  Activity,
  CheckCircle2,
  CircleDashed,
  Hammer,
  MinusCircle,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import type { ProjectHealth, ProjectKind, ProjectStatus, ProjectVersion } from "@/lib/projects"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Status — what's happening with the project right now               */
/* ------------------------------------------------------------------ */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant; icon: LucideIcon; description: string }
> = {
  live: {
    label: "Live",
    variant: "default",
    icon: CheckCircle2,
    description: "Shipping to real users today",
  },
  building: {
    label: "Building",
    variant: "secondary",
    icon: Hammer,
    description: "Under active development",
  },
  planning: {
    label: "Planning",
    variant: "outline",
    icon: CircleDashed,
    description: "Scoped — not yet building",
  },
  "on-hold": {
    label: "On hold",
    variant: "outline",
    icon: PauseCircle,
    description: "Intentionally paused",
  },
  deprecated: {
    label: "Deprecated",
    variant: "destructive",
    icon: XCircle,
    description: "Sunset — do not build on",
  },
}

export function StatusPill({ status }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status]
  const Icon = m.icon
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon className="size-3" />
      {m.label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Health — signal dot for hoisted attention                          */
/* ------------------------------------------------------------------ */

export const HEALTH_META: Record<ProjectHealth, { label: string; dot: string }> = {
  green: { label: "Healthy", dot: "bg-emerald-500" },
  yellow: { label: "Watching", dot: "bg-amber-500" },
  red: { label: "At risk", dot: "bg-rose-500" },
  unknown: { label: "Unknown", dot: "bg-muted-foreground/40" },
}

export function HealthDot({ health, withLabel }: { health: ProjectHealth; withLabel?: boolean }) {
  const m = HEALTH_META[health]
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-block size-2 rounded-full", m.dot)} />
      {withLabel && <span className="text-xs text-muted-foreground">{m.label}</span>}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Kind label                                                          */
/* ------------------------------------------------------------------ */

export const KIND_META: Record<ProjectKind, { label: string }> = {
  landing: { label: "Landing" },
  "client-portal": { label: "Client Portal" },
  "admin-portal": { label: "Admin Portal" },
  "vendor-portal": { label: "Vendor Portal" },
}

export function KindPill({ kind }: { kind: ProjectKind }) {
  const m = KIND_META[kind]
  return <Badge variant="outline">{m.label}</Badge>
}

/* ------------------------------------------------------------------ */
/*  Version pill                                                       */
/* ------------------------------------------------------------------ */

export const VERSION_META: Record<ProjectVersion, { label: string; variant: BadgeVariant }> = {
  mvp: { label: "MVP", variant: "outline" },
  alpha: { label: "Alpha", variant: "outline" },
  beta: { label: "Beta", variant: "secondary" },
  stable: { label: "Stable", variant: "default" },
}

export function VersionPill({ version }: { version: ProjectVersion }) {
  const m = VERSION_META[version]
  return <Badge variant={m.variant}>{m.label}</Badge>
}

/* ------------------------------------------------------------------ */
/*  Tech stack chips                                                    */
/* ------------------------------------------------------------------ */

export function TechStack({ stack }: { stack: string[] }) {
  if (!stack || stack.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {stack.map((t) => (
        <Badge key={t} variant="outline">
          {t}
        </Badge>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Venture → display meta                                              */
/* ------------------------------------------------------------------ */

// Tailwind utility tints per venture — replaces inline hex backgrounds.
// Keep one canonical set in the codebase; pages refer to these classes.
export const VENTURE_META: Record<
  string,
  { label: string; short: string; chipClass: string; dotClass: string; gradientClass: string }
> = {
  suprans: {
    label: "Suprans",
    short: "S",
    chipClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dotClass: "bg-rose-500",
    gradientClass: "bg-gradient-to-br from-rose-500 to-rose-600",
  },
  ets: {
    label: "EazyToSell",
    short: "E",
    chipClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    gradientClass: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
  legalnations: {
    label: "LegalNations",
    short: "L",
    chipClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dotClass: "bg-emerald-600",
    gradientClass: "bg-gradient-to-br from-emerald-600 to-emerald-700",
  },
  "usdrop-ai": {
    label: "USDrop AI",
    short: "U",
    chipClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dotClass: "bg-blue-500",
    gradientClass: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  goyotours: {
    label: "GoyoTours",
    short: "G",
    chipClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dotClass: "bg-amber-500",
    gradientClass: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  eazysell: {
    label: "EazySell",
    short: "EZ",
    chipClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    dotClass: "bg-cyan-500",
    gradientClass: "bg-gradient-to-br from-cyan-500 to-cyan-600",
  },
  toysinbulk: {
    label: "ToysInBulk",
    short: "TB",
    chipClass: "bg-red-500/10 text-red-700 dark:text-red-400",
    dotClass: "bg-red-500",
    gradientClass: "bg-gradient-to-br from-red-500 to-red-600",
  },
  "b2b-brands": {
    label: "B2B Brands",
    short: "B",
    chipClass: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dotClass: "bg-violet-500",
    gradientClass: "bg-gradient-to-br from-violet-500 to-violet-600",
  },
  "cross-cutting": {
    label: "Cross-cutting",
    short: "X",
    chipClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    dotClass: "bg-indigo-500",
    gradientClass: "bg-gradient-to-br from-indigo-500 to-indigo-600",
  },
  "teamsync-ai": {
    label: "TeamSync AI",
    short: "TS",
    chipClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    dotClass: "bg-sky-500",
    gradientClass: "bg-gradient-to-br from-sky-500 to-sky-600",
  },
}

const FALLBACK_VENTURE = {
  label: "Unassigned",
  short: "?",
  chipClass: "bg-muted text-muted-foreground",
  dotClass: "bg-muted-foreground/40",
  gradientClass: "bg-gradient-to-br from-slate-500 to-slate-600",
}

export function ventureMeta(key: string | null | undefined) {
  if (!key) return FALLBACK_VENTURE
  return (
    VENTURE_META[key] ?? {
      ...FALLBACK_VENTURE,
      label: key,
      short: key.slice(0, 2).toUpperCase(),
    }
  )
}

export function VentureBadge({ venture }: { venture: string | null }) {
  const m = ventureMeta(venture)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium",
        m.chipClass,
      )}
    >
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", m.dotClass)} />
      {m.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Relative time                                                      */
/* ------------------------------------------------------------------ */

export function relativeTime(iso: string | null): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(diff)) return "—"
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.round(months / 12)
  return `${years}y ago`
}

/* ------------------------------------------------------------------ */
/*  Section header — same scale as ETS list shells                     */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string
  title: string
  description?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

export const MinusCircleIcon = MinusCircle
export const ActivityIcon = Activity
