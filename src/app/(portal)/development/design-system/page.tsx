"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { useTheme, THEMES } from "@/lib/theme-context"

/* ------------------------------------------------------------------ */
/*  UI Kit Definitions                                                 */
/* ------------------------------------------------------------------ */

type UIKit = "faire" | "usdrop" | "legalnations"

const UI_KITS: { id: UIKit; label: string; tag: string; description: string; swatch: string }[] = [
  {
    id: "faire",
    label: "Faire Wholesale",
    tag: "src/design-system/",
    description: "Dock-based layout, HSL colors, Plus Jakarta Sans, shared primitives (PageHeader, MetricCard, StatusBadge, FilterBar, DetailCard)",
    swatch: "hsl(223 83% 53%)",
  },
  {
    id: "usdrop",
    label: "USDrop AI",
    tag: "src/design-system-usdrop/",
    description: "Sidebar-based layout (18.08rem), OKLCH colors, DM Sans + CooperLtBt, shadcn/ui + CVA, elevation overlays, gradient animations",
    swatch: "hsl(262 70% 45%)",
  },
  {
    id: "legalnations",
    label: "LegalNations",
    tag: "src/design-system-legalnations/",
    description: "Light sidebar, deep emerald + warm gold, Inter, legal-grade trust UI — phase stepper, document vault, compliance alerts, payment ledger",
    swatch: "hsl(160 45% 22%)",
  },
]

/* ── Faire data ─────────────────────────────────────────────────── */

const faireColors = [
  { name: "--background", label: "Background", value: "hsl(0 0% 100%)" },
  { name: "--foreground", label: "Foreground", value: "hsl(225 47% 15%)" },
  { name: "--primary", label: "Primary", value: "hsl(223 83% 53%)" },
  { name: "--secondary", label: "Secondary", value: "hsl(226 42% 96%)" },
  { name: "--muted", label: "Muted", value: "hsl(226 30% 95%)" },
  { name: "--muted-foreground", label: "Muted FG", value: "hsl(224 15% 42%)" },
  { name: "--accent", label: "Accent", value: "hsl(226 42% 98%)" },
  { name: "--destructive", label: "Destructive", value: "hsl(0 85% 45%)" },
  { name: "--border", label: "Border", value: "hsl(226 30% 85%)" },
  { name: "--ring", label: "Ring", value: "hsl(223 83% 53%)" },
]

const faireStatusColors = [
  { name: "emerald", bg: "bg-emerald-100", fg: "text-emerald-700", dot: "bg-emerald-500" },
  { name: "amber", bg: "bg-amber-100", fg: "text-amber-700", dot: "bg-amber-500" },
  { name: "red", bg: "bg-red-100", fg: "text-red-700", dot: "bg-red-500" },
  { name: "blue", bg: "bg-blue-100", fg: "text-blue-700", dot: "bg-blue-500" },
  { name: "violet", bg: "bg-violet-100", fg: "text-violet-700", dot: "bg-violet-500" },
  { name: "slate", bg: "bg-slate-100", fg: "text-slate-700", dot: "bg-slate-500" },
]

const faireTypography = [
  { label: "H1", className: "text-2xl font-bold font-heading text-foreground", spec: "text-2xl font-bold font-heading", sample: "Page Heading" },
  { label: "H2", className: "text-[0.9375rem] font-semibold tracking-tight", spec: "text-[0.9375rem] font-semibold tracking-tight", sample: "Card Section Title" },
  { label: "H3", className: "text-sm font-semibold leading-snug", spec: "text-sm font-semibold leading-snug", sample: "Subsection Heading" },
  { label: "Eyebrow", className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", spec: "text-xs uppercase tracking-wider", sample: "Category Label" },
  { label: "Body", className: "text-sm", spec: "text-sm", sample: "Standard body copy used throughout the portal." },
  { label: "Metric", className: "text-2xl font-bold font-heading tabular-nums", spec: "text-2xl font-bold tabular-nums", sample: "12,847" },
  { label: "Mono", className: "font-mono text-xs", spec: "font-mono text-xs", sample: "commit_sha: a1b2c3d4e5f6" },
]

const faireComponents = [
  { name: "PageHeader", path: "shared/page-header", purpose: "Page title + subtitle + actions + breadcrumbs" },
  { name: "KPIGrid + MetricCard", path: "shared/kpi-grid, metric-card", purpose: "KPI strip above filter bar" },
  { name: "FilterBar", path: "shared/filter-bar", purpose: "Search + tabs + right-side selects" },
  { name: "StatusBadge", path: "shared/status-badge", purpose: "Toned pill badge (toneForStatus auto-mapper)" },
  { name: "DetailCard + InfoRow", path: "shared/detail-views", purpose: "Section cards + label-value rows" },
  { name: "HeroCard", path: "shared/hero-card", purpose: "Detail page hero banner" },
  { name: "LargeModal", path: "shared/detail-views", purpose: "max-w-2xl centered modal" },
  { name: "SubNav", path: "shared/sub-nav", purpose: "Horizontal tab sub-navigation" },
  { name: "KanbanBoard", path: "shared/kanban-board", purpose: "Status-grouped kanban columns" },
  { name: "TimelineList", path: "shared/timeline-list", purpose: "Chronological event feed" },
  { name: "EmptyState", path: "shared/empty-state", purpose: "Zero-result placeholder" },
  { name: "BackLink", path: "shared/back-link", purpose: "Arrow-left navigation" },
]

/* ── USDrop data ────────────────────────────────────────────────── */

const usdropColors = [
  { name: "--background", label: "Background", value: "oklch(1.0000 0 0)" },
  { name: "--foreground", label: "Foreground", value: "oklch(0.1206 0.0203 283)" },
  { name: "--primary", label: "Primary", value: "oklch(0.4099 0.2135 264)" },
  { name: "--secondary", label: "Secondary", value: "oklch(0.9601 0.0093 286)" },
  { name: "--muted", label: "Muted", value: "oklch(0.9601 0.0093 286)" },
  { name: "--muted-foreground", label: "Muted FG", value: "oklch(0.5503 0.0495 285)" },
  { name: "--accent", label: "Accent", value: "oklch(0.9601 0.0093 264)" },
  { name: "--destructive", label: "Destructive", value: "oklch(0.6292 0.1901 23)" },
  { name: "--border", label: "Border", value: "oklch(0.9209 0.0094 286)" },
  { name: "--ring", label: "Ring", value: "oklch(0.4099 0.2135 264)" },
]

const usdropTypography = [
  { label: "H1", className: "text-xl font-semibold tracking-tight text-foreground", spec: "text-xl font-semibold tracking-tight", sample: "Page Heading" },
  { label: "H2", className: "text-lg font-semibold", spec: "text-lg font-semibold", sample: "Section Title" },
  { label: "H3", className: "text-base font-semibold", spec: "text-base font-semibold", sample: "Card Title" },
  { label: "H4", className: "text-sm font-semibold", spec: "text-sm font-semibold", sample: "Sub-heading" },
  { label: "Body", className: "text-sm", spec: "text-sm", sample: "Standard body copy used throughout the portal." },
  { label: "Sidebar Label", className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", spec: "text-[11px] uppercase tracking-[0.08em]", sample: "MAIN MENU" },
  { label: "Stat Value", className: "text-2xl font-semibold", spec: "text-2xl font-semibold", sample: "42,847" },
  { label: "Micro Badge", className: "text-[10px] font-medium", spec: "text-[10px] font-medium", sample: "PRO" },
]

const usdropComponents = [
  { name: "Sidebar (18.08rem)", path: "ds-usdrop-sidebar", purpose: "Collapsible sidebar with groups, items, toggle (Ctrl+B)" },
  { name: "Topbar", path: "ds-usdrop-topbar", purpose: "Horizontal bar with breadcrumbs + actions" },
  { name: "Card (slots)", path: "ds-usdrop-card", purpose: "Header/title/description/action/content/footer slots, p-2 default" },
  { name: "Metric Card", path: "ds-usdrop-metric-card", purpose: "Icon box (9x9 border) + value + subtitle, custom shadow" },
  { name: "Profile Card", path: "ds-usdrop-profile-card", purpose: "Gradient primary→secondary bg, avatar circle" },
  { name: "Badge (4 variants)", path: "ds-usdrop-badge", purpose: "default/secondary/destructive/outline + success/warning/info/error" },
  { name: "Button (6 variants)", path: "ds-usdrop-btn", purpose: "default/destructive/outline/secondary/ghost/link + 6 sizes" },
  { name: "Input / Textarea / Select", path: "ds-usdrop-input", purpose: "Focus ring-[3px], aria-invalid error state" },
  { name: "Checkbox / Switch", path: "ds-usdrop-checkbox", purpose: "Checkbox + toggle switch with thumb" },
  { name: "Data Table", path: "ds-usdrop-table", purpose: "TanStack Table wrapper + toolbar + search + pagination" },
  { name: "Tabs", path: "ds-usdrop-tabs", purpose: "shadcn-style tabs with shadow on active" },
  { name: "Elevation Overlays", path: "ds-usdrop-hover-elevate", purpose: "hover-elevate / active-elevate rgba tint layer" },
  { name: "Gradient Text", path: "ds-usdrop-gradient-text", purpose: "Animated 300% gradient (pink→purple→blue→cyan)" },
  { name: "Shimmer", path: "ds-usdrop-shimmer", purpose: "Skeleton loading overlay animation" },
]

/* ── LegalNations data ──────────────────────────────────────────── */

const lnColors = [
  { name: "--background", label: "Background", value: "hsl(0 0% 99%)" },
  { name: "--foreground", label: "Foreground", value: "hsl(200 15% 12%)" },
  { name: "--primary", label: "Primary", value: "hsl(160 45% 22%)" },
  { name: "--secondary", label: "Secondary", value: "hsl(40 10% 95%)" },
  { name: "--muted", label: "Muted", value: "hsl(40 8% 95%)" },
  { name: "--muted-foreground", label: "Muted FG", value: "hsl(200 8% 46%)" },
  { name: "--accent", label: "Accent (Gold)", value: "hsl(42 80% 55%)" },
  { name: "--destructive", label: "Destructive", value: "hsl(0 65% 48%)" },
  { name: "--border", label: "Border", value: "hsl(40 10% 88%)" },
  { name: "--ring", label: "Ring", value: "hsl(160 45% 22%)" },
]

const lnTypography = [
  { label: "H1", className: "text-xl font-semibold text-foreground", spec: "text-xl font-semibold (Inter)", sample: "My Company Status" },
  { label: "H2", className: "text-[1.0625rem] font-semibold", spec: "text-[1.0625rem] font-semibold", sample: "Onboarding Progress" },
  { label: "H3", className: "text-[0.9375rem] font-semibold", spec: "text-[0.9375rem] font-semibold", sample: "Tax Filings" },
  { label: "Body", className: "text-sm leading-relaxed", spec: "text-sm leading-[1.6]", sample: "Your LLC registration is currently being processed by the Delaware Division of Corporations." },
  { label: "Legal Text", className: "font-serif text-[0.9375rem] leading-[1.8]", spec: "Georgia, 15px, line-height 1.8", sample: "ARTICLE I. The name of the limited liability company is..." },
  { label: "Eyebrow", className: "text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground", spec: "11px uppercase tracking-[0.06em]", sample: "LLC STATUS" },
  { label: "Stat", className: "text-2xl font-bold tabular-nums", spec: "text-2xl font-bold tabular-nums", sample: "$5,499" },
  { label: "Currency", className: "text-sm font-medium tabular-nums", spec: "tabular-nums font-medium", sample: "₹4,52,000.00" },
]

const lnComponents = [
  { name: "Light Sidebar (16rem)", path: "ds-ln-sidebar", purpose: "Warm light sidebar with brand, sections, user footer" },
  { name: "Topbar + Breadcrumbs", path: "ds-ln-topbar", purpose: "Page title + breadcrumbs + actions bar" },
  { name: "Phase Stepper", path: "ds-ln-stepper", purpose: "7-phase horizontal stepper (LLC → EIN → Bank → ...)" },
  { name: "Timeline (vertical)", path: "ds-ln-timeline", purpose: "Vertical timeline for onboarding/filing events" },
  { name: "Status Card", path: "ds-ln-status-card", purpose: "Icon + label + value for LLC/filing/payment status" },
  { name: "Document Card", path: "ds-ln-doc-card", purpose: "File row with icon, name, meta, download action" },
  { name: "Phase Card", path: "ds-ln-phase-card", purpose: "Phase summary with complete/active/pending states" },
  { name: "Hero Greeting", path: "ds-ln-hero", purpose: "Emerald gradient banner with client name + stats" },
  { name: "Alert Banners", path: "ds-ln-alert", purpose: "Info/success/warning/danger + full-width banner variants" },
  { name: "File Upload Zone", path: "ds-ln-upload", purpose: "Dashed border dropzone for document submission" },
  { name: "Payment Ledger Table", path: "ds-ln-table", purpose: "Table with amount columns, positive/due coloring" },
  { name: "Badge (Legal status)", path: "ds-ln-badge", purpose: "Delivered/Processing/Pending/On-hold + plan tiers" },
  { name: "Button (7 variants)", path: "ds-ln-btn", purpose: "Primary/accent(gold)/outline/secondary/ghost/destructive/link" },
  { name: "Progress Bar", path: "ds-ln-progress-bar", purpose: "Animated fill bar with gold variant" },
]

/* ── Comparison data ────────────────────────────────────────────── */

const comparisonRows = [
  { dim: "Layout", faire: "Dock (left+right+top bars)", usdrop: "Sidebar (18.08rem) + topbar inset", ln: "Light sidebar (16rem) + topbar" },
  { dim: "Color model", faire: "HSL", usdrop: "OKLCH", ln: "HSL" },
  { dim: "Primary color", faire: "Blue hsl(223 83% 53%)", usdrop: "Violet oklch(0.41 0.21 264)", ln: "Emerald hsl(160 45% 22%)" },
  { dim: "Font", faire: "Plus Jakarta Sans", usdrop: "DM Sans + CooperLtBt", ln: "Inter + Georgia (legal text)" },
  { dim: "Radius", faire: "0.375rem (6px)", usdrop: "0.75rem (12px)", ln: "0.5rem (8px)" },
  { dim: "Card padding", faire: "p-5 (20px)", usdrop: "p-2 (8px)", ln: "p-5 (20px) — comfortable" },
  { dim: "Page title", faire: "text-2xl font-bold", usdrop: "text-xl font-semibold", ln: "text-xl font-semibold" },
  { dim: "Metric grid", faire: "2-col → 4-col", usdrop: "1-col → 3-col", ln: "1-col → 3-col status" },
  { dim: "Shadow tint", faire: "Navy rgba(21,30,58)", usdrop: "Purple hsl(288 9.8% 10%)", ln: "Warm hsl(40 10% 20%)" },
  { dim: "Accent color", faire: "N/A (primary only)", usdrop: "N/A", ln: "Gold hsl(42 80% 55%)" },
  { dim: "Unique components", faire: "StatusBadge, KanbanBoard", usdrop: "Gradient text, Shimmer", ln: "Phase stepper, Document vault, Alerts" },
  { dim: "Target user", faire: "Internal ops team", usdrop: "SaaS customer (dropshipper)", ln: "Legal client (LLC applicant)" },
]

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function DesignSystemPage() {
  const { themeId, theme, setTheme } = useTheme()
  const [activeKit, setActiveKit] = useState<UIKit>("faire")

  const kit = UI_KITS.find((k) => k.id === activeKit)!
  const colors = activeKit === "faire" ? faireColors : activeKit === "usdrop" ? usdropColors : lnColors
  const typography = activeKit === "faire" ? faireTypography : activeKit === "usdrop" ? usdropTypography : lnTypography
  const components = activeKit === "faire" ? faireComponents : activeKit === "usdrop" ? usdropComponents : lnComponents

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Design System"
        subtitle="UI kit library, token reference, component classes, and theme management"
        breadcrumbs={[
          { label: "Development", href: "/development" },
          { label: "Design System" },
        ]}
      />

      {/* ── UI Kit Switcher ────────────────────────────────────────── */}
      <div className="flex gap-3">
        {UI_KITS.map((k) => (
          <button
            key={k.id}
            onClick={() => setActiveKit(k.id)}
            className={`flex-1 rounded-lg border p-4 text-left transition-all cursor-pointer ${
              activeKit === k.id
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border/80 hover:border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: k.swatch }}
              />
              <span className="text-sm font-semibold">{k.label}</span>
              {activeKit === k.id && (
                <span className="text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{k.description}</p>
            <code className="text-[10px] font-mono text-muted-foreground mt-1 block">{k.tag}</code>
          </button>
        ))}
      </div>

      {/* ── 1. Color Tokens ─────────────────────────────────────────── */}
      <DetailCard title={`Color Tokens — ${kit.label}`}>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Semantic Palette {activeKit === "usdrop" ? "(OKLCH)" : "(HSL)"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {colors.map((c) => (
                <div key={c.name} className="flex items-center gap-3 rounded-md border p-2.5">
                  <div
                    className="size-9 rounded-md shrink-0 border border-border/50"
                    style={{ backgroundColor: `var(${c.name})` }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activeKit === "faire" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Status Palette (Tailwind tones)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {faireStatusColors.map((s) => (
                  <div key={s.name} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-4 rounded-full ${s.dot}`} />
                      <span className="text-sm font-semibold capitalize">{s.name}</span>
                    </div>
                    <div className={`${s.bg} ${s.fg} rounded px-2 py-1 text-xs font-medium text-center`}>
                      {s.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeKit === "usdrop" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Status Badges (OKLCH semantic)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "Success", bg: "bg-emerald-50", fg: "text-emerald-700" },
                  { name: "Warning", bg: "bg-amber-50", fg: "text-amber-700" },
                  { name: "Info", bg: "bg-blue-50", fg: "text-blue-700" },
                  { name: "Error", bg: "bg-red-50", fg: "text-red-700" },
                ].map((s) => (
                  <div key={s.name} className={`${s.bg} ${s.fg} rounded-full px-3 py-1 text-xs font-medium text-center`}>
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeKit === "legalnations" && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal Status Badges
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { name: "Delivered", bg: "bg-emerald-50", fg: "text-emerald-700" },
                  { name: "Processing", bg: "bg-blue-50", fg: "text-blue-700" },
                  { name: "Pending", bg: "bg-amber-50", fg: "text-amber-700" },
                  { name: "On Hold", bg: "bg-slate-100", fg: "text-slate-600" },
                  { name: "Cancelled", bg: "bg-red-50", fg: "text-red-600" },
                ].map((s) => (
                  <div key={s.name} className={`${s.bg} ${s.fg} rounded px-3 py-1 text-xs font-medium text-center`}>
                    {s.name}
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-5">
                Plan Tiers
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-400 text-amber-950 rounded px-3 py-1 text-xs font-semibold text-center">Elite</div>
                <div className="bg-emerald-800 text-white rounded px-3 py-1 text-xs font-medium text-center">Pro</div>
                <div className="bg-blue-50 text-blue-700 rounded px-3 py-1 text-xs font-medium text-center">Starter</div>
                <div className="bg-slate-100 text-slate-600 rounded px-3 py-1 text-xs font-medium text-center">Basic</div>
              </div>
            </div>
          )}
        </div>
      </DetailCard>

      {/* ── 2. Typography Scale ─────────────────────────────────────── */}
      <DetailCard title={`Typography — ${kit.label}`}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-2">
            Font: {activeKit === "faire" ? "Plus Jakarta Sans" : activeKit === "usdrop" ? "DM Sans + CooperLtBt (brand)" : "Inter + Georgia (legal text)"}
          </p>
          {typography.map((t) => (
            <div key={t.label} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 border-b pb-3 last:border-b-0 last:pb-0">
              <div className="shrink-0 w-32">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={t.className}>{t.sample}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t.spec}</p>
              </div>
            </div>
          ))}
        </div>
      </DetailCard>

      {/* ── 3. Layout Comparison ────────────────────────────────────── */}
      <DetailCard title={`Layout — ${kit.label}`}>
        {activeKit === "faire" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Dock-based shell: left SpaceDock + top TopNavigation + right WorkspaceDock</p>
            <div className="border rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-[48px_1fr_176px] h-40">
                <div className="bg-foreground/90 text-background p-1 flex flex-col items-center gap-1 pt-2">
                  <div className="w-5 h-5 rounded bg-primary/80" />
                  <div className="w-5 h-5 rounded bg-background/20" />
                  <div className="w-5 h-5 rounded bg-background/20" />
                </div>
                <div className="flex flex-col">
                  <div className="bg-foreground/90 text-background px-3 py-2 flex gap-4 items-center">
                    <span className="bg-primary px-2 py-0.5 rounded text-[10px]">Orders</span>
                    <span className="text-background/70 text-[10px]">Catalog</span>
                    <span className="text-background/70 text-[10px]">Retailers</span>
                  </div>
                  <div className="flex-1 bg-muted/30 p-3 flex flex-col gap-1.5">
                    <div className="h-3 w-32 bg-foreground/10 rounded" />
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="h-8 bg-card border rounded" />
                      <div className="h-8 bg-card border rounded" />
                      <div className="h-8 bg-card border rounded" />
                      <div className="h-8 bg-card border rounded" />
                    </div>
                    <div className="flex-1 bg-card border rounded" />
                  </div>
                </div>
                <div className="bg-foreground/90 text-background p-1 flex flex-col items-center gap-1 pt-2">
                  <div className="w-6 h-6 rounded-full bg-background/30" />
                  <div className="w-5 h-5 rounded bg-background/20" />
                  <div className="w-5 h-5 rounded bg-background/20" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div>Container: max-w-[1440px]</div>
              <div>Card padding: p-5 (20px)</div>
              <div>Radius: 0.375rem (6px)</div>
            </div>
          </div>
        ) : activeKit === "usdrop" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sidebar-based shell: collapsible Sidebar (18.08rem) + Topbar + inset content</p>
            <div className="border rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-[180px_1fr] h-40">
                <div className="bg-muted/50 border-r flex flex-col p-2 gap-0.5">
                  <div className="h-6 flex items-center gap-1.5 px-1 mb-2">
                    <div className="w-4 h-4 rounded bg-primary/30" />
                    <span className="text-[10px] font-semibold">USDrop AI</span>
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-0.5">Main</div>
                  <div className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[10px]">Dashboard</div>
                  <div className="text-muted-foreground px-1.5 py-0.5 text-[10px]">Products</div>
                  <div className="text-muted-foreground px-1.5 py-0.5 text-[10px]">Orders</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mt-1 mb-0.5">Tools</div>
                  <div className="text-muted-foreground px-1.5 py-0.5 text-[10px] opacity-60">AI Studio</div>
                </div>
                <div className="flex flex-col">
                  <div className="h-8 border-b flex items-center px-3 gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <span className="text-[10px] font-medium">Categories</span>
                  </div>
                  <div className="flex-1 bg-muted/20 p-2 flex flex-col gap-1.5">
                    <div className="h-3 w-24 bg-foreground/10 rounded" />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="h-8 bg-card border rounded-lg" />
                      <div className="h-8 bg-card border rounded-lg" />
                      <div className="h-8 bg-card border rounded-lg" />
                    </div>
                    <div className="flex-1 bg-card border rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div>Container: full-width</div>
              <div>Card padding: p-2 (8px)</div>
              <div>Radius: 0.75rem (12px)</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Light sidebar + content shell — warm, approachable for legal clients</p>
            <div className="border rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-[160px_1fr] h-48">
                <div className="bg-amber-50/80 border-r flex flex-col p-2.5 gap-0.5">
                  <div className="flex items-center gap-2 px-1 mb-2 pb-2 border-b border-amber-200/50">
                    <div className="w-5 h-5 rounded bg-emerald-800 flex items-center justify-center text-[8px] text-white font-bold">LN</div>
                    <div>
                      <span className="text-[10px] font-semibold block">LegalNations</span>
                      <span className="text-[8px] text-muted-foreground">Elite Plan</span>
                    </div>
                  </div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-0.5">Your Company</div>
                  <div className="bg-emerald-800 text-white rounded px-2 py-0.5 text-[10px]">Dashboard</div>
                  <div className="text-muted-foreground px-2 py-0.5 text-[10px]">Onboarding</div>
                  <div className="text-muted-foreground px-2 py-0.5 text-[10px]">Documents</div>
                  <div className="text-muted-foreground px-2 py-0.5 text-[10px]">Payments</div>
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mt-1.5 mb-0.5">Compliance</div>
                  <div className="text-muted-foreground px-2 py-0.5 text-[10px]">Tax Filings</div>
                </div>
                <div className="flex flex-col">
                  <div className="h-9 border-b flex items-center px-3 bg-white">
                    <span className="text-[10px] text-muted-foreground">Home</span>
                    <span className="text-[10px] text-muted-foreground mx-1">/</span>
                    <span className="text-[10px] font-medium">Dashboard</span>
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-2">
                    <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 rounded-lg p-2.5 text-white">
                      <div className="text-[9px] opacity-70">Welcome back,</div>
                      <div className="text-[11px] font-semibold">Lakshay Takkar</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="border rounded-md p-1.5 text-center">
                        <div className="text-[9px] text-muted-foreground">LLC</div>
                        <div className="text-[10px] font-semibold text-emerald-700">Delivered</div>
                      </div>
                      <div className="border rounded-md p-1.5 text-center">
                        <div className="text-[9px] text-muted-foreground">EIN</div>
                        <div className="text-[10px] font-semibold text-blue-600">Processing</div>
                      </div>
                      <div className="border rounded-md p-1.5 text-center">
                        <div className="text-[9px] text-muted-foreground">Bank</div>
                        <div className="text-[10px] font-semibold text-amber-600">Pending</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div>Container: max-w-960px</div>
              <div>Card padding: p-5 (20px)</div>
              <div>Radius: 0.5rem (8px)</div>
            </div>
          </div>
        )}
      </DetailCard>

      {/* ── 4. Spacing & Radius ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="Spacing">
          {activeKit === "faire" ? (
            <div className="space-y-2">
              {[
                { label: "space-y-5", px: 80 }, { label: "p-5", px: 80 }, { label: "gap-4", px: 64 },
                { label: "gap-3", px: 48 }, { label: "p-3", px: 48 },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-20 shrink-0">{s.label}</span>
                  <div className="h-5 rounded bg-primary/20 border border-primary/30" style={{ width: s.px }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "gap-4 (section)", px: 64 }, { label: "p-2 (card)", px: 32 },
                { label: "gap-2 (internal)", px: 32 }, { label: "gap-1.5 (toolbar)", px: 24 },
                { label: "p-4 (metric)", px: 64 }, { label: "p-5 (profile)", px: 80 },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-28 shrink-0">{s.label}</span>
                  <div className="h-5 rounded bg-primary/20 border border-primary/30" style={{ width: s.px }} />
                </div>
              ))}
            </div>
          )}
        </DetailCard>

        <DetailCard title="Border Radius">
          <div className="flex flex-wrap gap-4">
            {(activeKit === "faire"
              ? [
                  { label: "rounded-sm", cls: "rounded-sm" }, { label: "rounded-md", cls: "rounded-md" },
                  { label: "rounded-lg", cls: "rounded-lg" }, { label: "rounded-xl", cls: "rounded-xl" },
                ]
              : [
                  { label: "radius-sm (8px)", cls: "rounded-lg" }, { label: "radius-md (10px)", cls: "rounded-[10px]" },
                  { label: "radius-lg (12px)", cls: "rounded-xl" }, { label: "radius-xl (16px)", cls: "rounded-2xl" },
                ]
            ).map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-1.5">
                <div className={`${r.cls} size-14 border-2 border-primary/40 bg-primary/10`} />
                <span className="text-[10px] font-mono text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        </DetailCard>
      </div>

      {/* ── 5. Shadow / Elevation ───────────────────────────────────── */}
      <DetailCard title={`Elevation — ${kit.label}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl", "shadow-2xl"].map((s) => (
            <div key={s} className={`${s} rounded-lg border bg-card p-5 flex items-center justify-center`}>
              <span className="text-xs font-medium font-mono">{s}</span>
            </div>
          ))}
          {activeKit === "usdrop" && (
            <>
              <div className="rounded-xl border bg-card p-5 flex flex-col items-center justify-center gap-1 relative overflow-hidden hover:after:absolute hover:after:inset-0 hover:after:bg-black/[0.03] hover:after:rounded-xl cursor-pointer transition-all">
                <span className="text-xs font-medium">hover-elevate</span>
                <span className="text-[10px] text-muted-foreground">rgba overlay</span>
              </div>
              <div className="rounded-xl p-5 flex items-center justify-center bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white">
                <span className="text-xs font-medium">gradient-text</span>
              </div>
            </>
          )}
        </div>
      </DetailCard>

      {/* ── 6. Theme Switcher ───────────────────────────────────────── */}
      <DetailCard title="Theme Switcher">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Active:</span>
            <span className="text-sm font-semibold">{theme.label}</span>
            <span className="text-xs text-muted-foreground">({themeId})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map((t) => {
              const isActive = t.id === themeId
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    isActive
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border/80 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="relative size-7 shrink-0">
                    <div className="absolute inset-0 rounded-full" style={{ backgroundColor: t.swatch }} />
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: t.swatchAlt, clipPath: "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{t.label}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </DetailCard>

      {/* ── 7. Component Reference ──────────────────────────────────── */}
      <DetailCard title={`Components — ${kit.label}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">Component</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">
                  {activeKit === "faire" ? "Import Path" : "CSS Class"}
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.name} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {c.path}
                    </code>
                  </td>
                  <td className="py-2">
                    <span className="text-xs text-muted-foreground">{c.purpose}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>

      {/* ── 8. Side-by-Side Comparison ──────────────────────────────── */}
      <DetailCard title="3-Way Comparison">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3 w-24">Dimension</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-500" /> Faire
                  </span>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-violet-500" /> USDrop
                  </span>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-600" /> LegalNations
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r) => (
                <tr key={r.dim} className="border-b last:border-b-0">
                  <td className="py-1.5 pr-3">
                    <span className="text-xs font-semibold text-foreground">{r.dim}</span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="text-[11px] text-muted-foreground">{r.faire}</span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="text-[11px] text-muted-foreground">{r.usdrop}</span>
                  </td>
                  <td className="py-1.5">
                    <span className="text-[11px] text-muted-foreground">{r.ln}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>
    </div>
  )
}
