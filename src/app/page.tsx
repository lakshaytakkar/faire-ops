import Link from "next/link"
import {
  ShoppingBag,
  Briefcase,
  Users,
  Package,
  Layers,
  ArrowRight,
  LineChart,
  Wallet,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { listSpaces, type Space } from "@/lib/spaces"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  Hero wallpaper                                                     */
/* ------------------------------------------------------------------ */

// Gemini-generated cartoon wallpaper, served from Supabase Storage.
// Regenerate via POST /api/spaces/wallpaper.
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
  icon: LucideIcon
  color: string
}

const COMING_SOON: ComingSoonSpace[] = [
  {
    name: "CRM & Sales",
    tagline: "Leads, deals, forecasts",
    icon: LineChart,
    color: "#8b5cf6",
  },
  {
    name: "Agency Ops",
    tagline: "Clients & deliverables",
    icon: Briefcase,
    color: "#f59e0b",
  },
  {
    name: "Finance",
    tagline: "Books & invoicing",
    icon: Wallet,
    color: "#10b981",
  },
]

/* ------------------------------------------------------------------ */
/*  Live space card — solid white, hero feature                        */
/* ------------------------------------------------------------------ */

function ActiveSpaceCard({ space }: { space: Space }) {
  const Icon = resolveIcon(space.icon)
  const color = space.color || "#3b82f6"

  return (
    <Link
      href={space.entry_url}
      className="group relative flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)] hover:ring-slate-300 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
        style={{
          background: `linear-gradient(135deg, ${color}26, ${color}10)`,
        }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold font-heading text-slate-900 leading-tight truncate">
            {space.name}
          </h3>
          {space.is_featured ? (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{
                color,
                backgroundColor: `${color}14`,
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Live
            </span>
          ) : null}
        </div>
        <p className="text-[12px] text-slate-600 truncate mt-0.5">
          {space.tagline}
        </p>
      </div>

      <span
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-900 shrink-0"
        aria-hidden="true"
      >
        Open
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Coming-soon circular shortcut                                      */
/* ------------------------------------------------------------------ */

function ComingSoonShortcut({ space }: { space: ComingSoonSpace }) {
  const Icon = space.icon
  return (
    <div
      className="flex flex-col items-center gap-1.5 group cursor-not-allowed select-none"
      title={`${space.name} — coming soon`}
    >
      <div
        className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 grayscale opacity-70 transition-all"
        style={{
          background: `linear-gradient(135deg, white 0%, ${space.color}08 100%)`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color: space.color }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-700 leading-tight text-center max-w-[72px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
        {space.name}
      </span>
      <span className="text-[8px] uppercase tracking-wider text-slate-500 leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
        Soon
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 p-10 flex flex-col items-center justify-center text-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
        <Layers className="h-6 w-6 text-slate-400" />
      </div>
      <h3 className="text-base font-bold font-heading text-slate-900">
        No spaces yet
      </h3>
      <p className="text-xs text-slate-600 max-w-sm">
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
      {/* ============== Background ============== */}
      {/* Pastel gradient fallback */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #fce7f3 0%, #ede9fe 35%, #dcfce7 100%)",
        }}
      />
      {/* Cartoon wallpaper image — front and center, no scrim */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_WALLPAPER_URL}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 -z-10 w-full h-full object-cover pointer-events-none select-none"
      />

      {/* ============== Top corners ============== */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4">
        {/* Top-left: brand wordmark */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md ring-1 ring-slate-200/80 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            NexusOS
          </span>
        </div>

        {/* Top-right: minimal nav */}
        <div className="flex items-center gap-1">
          <Link
            href="/workspace/knowledge"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/90 backdrop-blur-md ring-1 ring-slate-200/80 shadow-sm text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ============== Centered content ============== */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-20">
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Wordmark */}
          <h1 className="text-5xl md:text-6xl font-bold font-heading tracking-tight text-center text-slate-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.7)]">
            Nexus<span className="text-blue-600">OS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-700 text-center drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            Every operation, one place.
          </p>

          {/* Active spaces — solid white cards inside a centered column */}
          <div className="mt-8 w-full flex flex-col gap-3">
            {activeSpaces.length === 0 ? (
              <EmptyState />
            ) : (
              activeSpaces.map((space) => (
                <ActiveSpaceCard key={space.id} space={space} />
              ))
            )}
          </div>

          {/* Coming soon — circular shortcuts row */}
          <div className="mt-8 flex items-start justify-center gap-5">
            {COMING_SOON.map((space) => (
              <ComingSoonShortcut key={space.name} space={space} />
            ))}
          </div>
        </div>
      </div>

      {/* ============== Bottom-left attribution card ============== */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg bg-white/90 backdrop-blur-md ring-1 ring-slate-200/80 shadow-sm px-3 py-2 max-w-[200px]">
          <p className="text-[10px] font-semibold text-slate-900 leading-tight">
            Floating friends
          </p>
          <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
            Wallpaper generated with Gemini
          </p>
        </div>
      </div>
    </main>
  )
}
