import Link from "next/link"
import {
  ShoppingBag,
  Briefcase,
  Users,
  Package,
  Layers,
  ArrowUpRight,
  LineChart,
  Wallet,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { listSpaces, type Space } from "@/lib/spaces"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  Hero wallpaper                                                     */
/* ------------------------------------------------------------------ */

// Gemini-generated, served from Supabase Storage. Falls back to a CSS
// gradient if the image fails to load. Regenerate via POST /api/spaces/wallpaper.
const HERO_WALLPAPER_URL =
  "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/nexus-assets/homepage-hero.png"

/* ------------------------------------------------------------------ */
/*  Icon resolver                                                      */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  Briefcase,
  Users,
  Package,
  Layers,
  LineChart,
  Wallet,
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return Layers
  return ICON_MAP[name] ?? Layers
}

/* ------------------------------------------------------------------ */
/*  Coming-soon placeholders                                           */
/* ------------------------------------------------------------------ */

interface ComingSoonSpace {
  name: string
  tagline: string
  description: string
  icon: LucideIcon
  color: string
}

const COMING_SOON: ComingSoonSpace[] = [
  {
    name: "CRM & Sales Pipeline",
    tagline: "Lead capture, deals, forecasts",
    description:
      "Unified pipeline for inbound leads, deal stages, and revenue forecasting across every channel.",
    icon: LineChart,
    color: "#8b5cf6",
  },
  {
    name: "Agency Operations",
    tagline: "Client portals, retainers, deliverables",
    description:
      "Run a client services business with branded portals, retainer tracking, and deliverable reviews.",
    icon: Briefcase,
    color: "#f59e0b",
  },
  {
    name: "Finance & Accounting",
    tagline: "Books, invoicing, payouts, taxes",
    description:
      "Close the loop on money — automated bookkeeping, invoicing, payout reconciliation, and tax prep.",
    icon: Wallet,
    color: "#10b981",
  },
]

/* ------------------------------------------------------------------ */
/*  Live space card                                                    */
/* ------------------------------------------------------------------ */

function SpaceCard({ space }: { space: Space }) {
  const Icon = resolveIcon(space.icon)
  const color = space.color || "#3b82f6"

  return (
    <Link
      href={space.entry_url}
      className="group relative block rounded-xl bg-white/85 backdrop-blur-xl border border-white/70 shadow-[0_4px_20px_rgba(15,23,42,0.06)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(15,23,42,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Subtle color wash at the top */}
      <div
        className="absolute inset-x-0 top-0 h-20 opacity-60 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${color}22, transparent 70%)`,
        }}
      />

      <div className="relative p-5 flex flex-col gap-3 h-full">
        {/* Top row: icon + name + featured */}
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-black/[0.04] shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}26, ${color}10)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-bold font-heading text-slate-900 leading-tight truncate">
                {space.name}
              </h3>
              {space.is_featured ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{
                    color,
                    backgroundColor: `${color}12`,
                  }}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  Featured
                </span>
              ) : null}
            </div>
            {space.tagline ? (
              <p className="text-[12px] text-slate-600 leading-snug truncate mt-0.5">
                {space.tagline}
              </p>
            ) : null}
          </div>
        </div>

        {/* Description */}
        {space.description ? (
          <p className="text-[12.5px] leading-relaxed text-slate-700/90 line-clamp-2">
            {space.description}
          </p>
        ) : null}

        {/* Channels + Footer combined */}
        <div className="mt-auto pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {space.channels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {space.channels.map((channel) => (
                  <span
                    key={channel}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ring-1 ring-slate-200/60"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-900 shrink-0">
            Open
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Coming-soon card                                                   */
/* ------------------------------------------------------------------ */

function ComingSoonCard({ space }: { space: ComingSoonSpace }) {
  const Icon = space.icon
  return (
    <div className="relative rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-slate-900/5 text-slate-500 ring-1 ring-slate-200/70">
          Soon
        </span>
      </div>
      <div className="p-5 flex flex-col gap-3 h-full opacity-75">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center ring-1 ring-black/[0.04] shrink-0"
            style={{
              background: `linear-gradient(135deg, ${space.color}1a, ${space.color}08)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: space.color }} />
          </div>
          <div className="flex-1 min-w-0 pr-12">
            <h3 className="text-[15px] font-bold font-heading text-slate-900 leading-tight truncate">
              {space.name}
            </h3>
            <p className="text-[12px] text-slate-600 leading-snug truncate mt-0.5">
              {space.tagline}
            </p>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-slate-700/90 line-clamp-2">
          {space.description}
        </p>

        <div className="mt-auto pt-3 border-t border-slate-200/60 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-400">In the works</span>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.06)] p-16 flex flex-col items-center justify-center text-center gap-4">
      <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center">
        <Layers className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold font-heading text-slate-900">
        No spaces yet
      </h3>
      <p className="text-sm text-slate-600 max-w-sm">
        Once a space is activated it will appear here, ready to open.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function HomePage() {
  const spaces = await listSpaces()
  const activeSpaces = spaces.filter((s) => s.is_active)

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* ============== Background layers ============== */}
      {/* CSS gradient base — fallback in case the image fails */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #dbeafe 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, #ede9fe 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, #fef3c7 0%, transparent 65%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        }}
      />
      {/* Wallpaper — front and center, near full opacity */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_WALLPAPER_URL}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 -z-10 w-full h-full object-cover opacity-95 pointer-events-none select-none"
      />
      {/* Minimal contrast scrim — just enough to keep text legible without
          dimming the wallpaper. Very subtle. */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-white/15 via-transparent to-white/25 pointer-events-none" />

      {/* ============== Content ============== */}
      <div className="relative max-w-[1180px] mx-auto w-full px-5 md:px-8 py-8 md:py-12">
        {/* Hero — compact */}
        <header className="mb-10 md:mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 backdrop-blur-md ring-1 ring-slate-200/80 shadow-sm mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Business Suite
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold font-heading leading-[1.05] tracking-tight max-w-2xl drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            <span className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 bg-clip-text text-transparent">
              Every operation,{" "}
            </span>
            <span className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              one place.
            </span>
          </h1>

          <p className="mt-3 text-sm md:text-base text-slate-800 leading-relaxed max-w-xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
            NexusOS is the operating system for modern commerce — open a space to start working.
          </p>
        </header>

        {/* Live spaces */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[10px] font-bold font-heading uppercase tracking-[0.18em] text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              Your spaces
            </h2>
            <p className="text-[10px] text-slate-600 hidden sm:block drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              Click any card to enter
            </p>
          </div>

          {activeSpaces.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {activeSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </div>
          )}
        </section>

        {/* Coming soon */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[10px] font-bold font-heading uppercase tracking-[0.18em] text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              Coming soon
            </h2>
            <p className="text-[10px] text-slate-600 hidden sm:block drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
              On the roadmap
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {COMING_SOON.map((space) => (
              <ComingSoonCard key={space.name} space={space} />
            ))}
          </div>
        </section>

        {/* Footer mark */}
        <footer className="mt-12 pt-5 border-t border-white/40 flex items-center justify-between text-[10px] text-slate-700 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
          <span className="font-bold tracking-wide">NexusOS</span>
          <span>Crafted for businesses that ship</span>
        </footer>
      </div>
    </main>
  )
}
