import { type LucideIcon } from "lucide-react"

/**
 * Shared placeholder used by sub-sections of HQ (People, Finance, Compliance)
 * and anywhere else we need to stub a page while the real module is being
 * built. Onbrand — uses the portal design tokens and the same layout shape
 * so readers see what the finished page will roughly look like.
 */

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  breadcrumb?: string
  description: string
  tint?: string
  sections?: Array<{ label: string; desc: string }>
}

export function ComingSoon({
  icon: Icon,
  title,
  breadcrumb,
  description,
  tint = "#6366f1",
  sections = [],
}: ComingSoonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
          style={{
            background: `linear-gradient(135deg, ${tint}33, ${tint}14)`,
          }}
        >
          <Icon className="h-6 w-6" style={{ color: tint }} />
        </div>
        <div className="min-w-0 flex-1">
          {breadcrumb && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {breadcrumb}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
              {title}
            </h1>
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-200">
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {description}
          </p>
        </div>
      </div>

      {/* Section preview tiles */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((section) => (
            <div
              key={section.label}
              className="rounded-lg border border-dashed border-border/60 bg-card/60 p-4"
            >
              <p className="text-sm font-semibold font-heading text-foreground">
                {section.label}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                {section.desc}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
