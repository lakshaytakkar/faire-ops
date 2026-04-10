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
  type LucideIcon,
} from "lucide-react"
import { listSpaces, type Space } from "@/lib/spaces"
import { WallpaperSwitcher } from "@/components/home/wallpaper-switcher"
import { InstallButton } from "@/components/home/install-button"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  Hero wallpapers — first one is the default. Add more as desired.  */
/* ------------------------------------------------------------------ */

// All wallpapers live in the public Supabase Storage bucket `nexus-assets`.
// The first one is the default; the shuffle button cycles through them all.
// To add more, generate via scripts/generate-wallpapers.mjs and append here.
const WP_BASE =
  "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/nexus-assets"

const WALLPAPERS = [
  { id: "vestrahorn", name: "Vestrahorn Sunset", url: "/wallpaper-vestrahorn.jpg" },
]

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
  { name: "CRM & Sales", tagline: "Leads, deals, forecasts", icon: LineChart, color: "#8b5cf6" },
  { name: "Agency Ops", tagline: "Clients & deliverables", icon: Briefcase, color: "#f59e0b" },
  { name: "Finance", tagline: "Books & invoicing", icon: Wallet, color: "#10b981" },
]

/* ------------------------------------------------------------------ */
/*  Live space card — portal standard chrome                           */
/* ------------------------------------------------------------------ */

function ActiveSpaceCard({ space }: { space: Space }) {
  const Icon = resolveIcon(space.icon)
  const color = space.color || "#3b82f6"

  return (
    <Link
      href={space.entry_url}
      className="group flex items-center gap-4 rounded-lg border border-border/80 bg-card shadow-sm px-5 py-4 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="h-10 w-10 rounded-md flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
        style={{
          background: `linear-gradient(135deg, ${color}26, ${color}10)`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold font-heading text-foreground leading-tight truncate">
          {space.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {space.tagline}
        </p>
      </div>

      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground shrink-0">
        Open
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Coming-soon shortcut — portal standard chrome                      */
/* ------------------------------------------------------------------ */

function ComingSoonShortcut({ space }: { space: ComingSoonSpace }) {
  const Icon = space.icon
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card shadow-sm px-3 py-2 opacity-75 select-none"
      title={`${space.name} — coming soon`}
    >
      <div
        className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
        style={{
          background: `linear-gradient(135deg, ${space.color}1a, ${space.color}08)`,
        }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: space.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight truncate">
          {space.name}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
          {space.tagline}
        </p>
      </div>
      <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
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
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-8 flex flex-col items-center justify-center text-center gap-3">
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold font-heading text-foreground">
        No spaces yet
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm">
        Once a space is activated it will appear here.
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
      {/* Pastel fallback gradient — visible if any wallpaper fails */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #fce7f3 0%, #f5d0fe 35%, #dcfce7 100%)",
        }}
      />
      {/* Wallpaper switcher (client) — renders the active wallpaper plus a
          shuffle button pinned to the top-right corner of the viewport. */}
      <WallpaperSwitcher wallpapers={WALLPAPERS} />

      {/* Top-right corner — Help button. The wallpaper shuffle button is
          rendered by <WallpaperSwitcher> just to the left of this. */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <Link
          href="/workspace/knowledge"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/80 bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
      </div>

      {/* Centered content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-20">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Wordmark */}
          <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-center text-white">
            TeamSync<span className="text-primary"> AI</span>
          </h1>
          <p className="mt-1.5 text-sm text-white/90 text-center">
            Every operation, one place.
          </p>

          {/* Active spaces */}
          <div className="mt-6 w-full flex flex-col gap-3">
            {activeSpaces.length === 0 ? (
              <EmptyState />
            ) : (
              activeSpaces.map((space) => (
                <ActiveSpaceCard key={space.id} space={space} />
              ))
            )}
          </div>

          {/* Coming soon */}
          <div className="mt-5 w-full flex flex-col gap-2">
            {COMING_SOON.map((space) => (
              <ComingSoonShortcut key={space.name} space={space} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom-left attribution */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-md border border-border/80 bg-card shadow-sm px-3 py-2 max-w-[220px]">
          <p className="text-[11px] font-semibold text-foreground leading-tight">
            Vestrahorn Sunset
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            Iceland · Stokksnes
          </p>
        </div>
      </div>

      {/* Bottom-right install / download button (client) */}
      <InstallButton />
    </main>
  )
}
