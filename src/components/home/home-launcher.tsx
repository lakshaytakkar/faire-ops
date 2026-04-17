"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShoppingBag,
  Briefcase,
  Users,
  Package,
  Layers,
  ArrowRight,
  ArrowUpRight,
  LineChart,
  Wallet,
  HelpCircle,
  Puzzle,
  Home as HomeIcon,
  Building2,
  Scale,
  Plane,
  Globe,
  Store,
  Truck,
  Code,
  ListChecks,
  Smartphone,
  Download,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Space } from "@/lib/spaces"
import { WallpaperSwitcher } from "@/components/home/wallpaper-switcher"
import { PluginsCatalogue } from "@/components/home/plugins-catalogue"
import {
  PLUGIN_CATEGORIES,
  countInstalled,
  countPending,
} from "@/lib/plugins-catalog"

/* ------------------------------------------------------------------ */
/*  Wallpapers                                                         */
/* ------------------------------------------------------------------ */

const WP_BASE =
  "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/nexus-assets"

const WALLPAPERS = [
  { id: "midnight-blue", name: "Midnight Blue", url: `${WP_BASE}/wallpaper-midnight-blue.png` },
  { id: "aurora-snowfield", name: "Aurora Snowfield", url: `${WP_BASE}/wallpaper-aurora-snowfield.png` },
  { id: "deep-sea-bioluminescence", name: "Bioluminescent Deep", url: `${WP_BASE}/wallpaper-deep-sea-bioluminescence.png` },
  { id: "nebula-galaxy", name: "Nebula Galaxy", url: `${WP_BASE}/wallpaper-nebula-galaxy.png` },
  { id: "moonlit-lake", name: "Moonlit Lake", url: `${WP_BASE}/wallpaper-moonlit-lake.png` },
  { id: "vestrahorn", name: "Vestrahorn Sunset", url: "/wallpaper-vestrahorn.jpg" },
  { id: "city-skyline-dusk", name: "City at Dusk", url: `${WP_BASE}/wallpaper-city-skyline-dusk.png` },
  { id: "firefly-forest", name: "Firefly Forest", url: `${WP_BASE}/wallpaper-firefly-forest.png` },
  { id: "volcano-glow", name: "Volcano Glow", url: `${WP_BASE}/wallpaper-volcano-glow.png` },
  { id: "indigo-geometric", name: "Indigo Geometric", url: `${WP_BASE}/wallpaper-indigo-geometric.png` },
  { id: "synthwave-grid", name: "Synthwave Grid", url: `${WP_BASE}/wallpaper-synthwave-grid.png` },
  { id: "liquid-marble", name: "Liquid Marble", url: `${WP_BASE}/wallpaper-liquid-marble.png` },
]

/* ------------------------------------------------------------------ */
/*  Icon resolver for DB-sourced spaces                                */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  Briefcase,
  Users,
  Package,
  Layers,
  LineChart,
  Wallet,
  Building2,
  Scale,
  Plane,
  Globe,
  Store,
  Truck,
  Code,
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return Layers
  return ICON_MAP[name] ?? Layers
}

/* ------------------------------------------------------------------ */
/*  External apps — separate deployments linked from the home launcher */
/* ------------------------------------------------------------------ */

interface ExternalApp {
  name: string
  domain: string
  url: string
  description: string
  category: "website" | "client-portal" | "vendor-portal"
  status: "live" | "building" | "planned"
  icon: LucideIcon
  color: string
}

const EXTERNAL_APPS: ExternalApp[] = [
  { name: "Suprans", domain: "suprans.in", url: "https://suprans-landing.vercel.app", description: "Ecosystem site led by Mr. Suprans", category: "website", status: "live", icon: Globe, color: "#f34147" },
  { name: "EazyToSell", domain: "ets-landing.vercel.app", url: "https://ets-landing.vercel.app", description: "Store Launch Program — Indian retailers", category: "website", status: "live", icon: Globe, color: "#10b981" },
  { name: "EazyToSell Portal", domain: "ets-client.vercel.app", url: "https://ets-client.vercel.app", description: "Partners + cashiers + vendors", category: "client-portal", status: "live", icon: Store, color: "#10b981" },
  { name: "LegalNations", domain: "legalnations.com", url: "https://legalnations.com", description: "US LLC formation for Indian founders", category: "website", status: "planned", icon: Globe, color: "#059669" },
  { name: "USDrop AI", domain: "usdrop.ai", url: "https://usdrop.ai", description: "AI dropshipping platform", category: "website", status: "planned", icon: Globe, color: "#2a5fb2" },
  { name: "USDrop App", domain: "app.usdrop.ai", url: "https://app.usdrop.ai", description: "The end-user SaaS — beta", category: "client-portal", status: "building", icon: Store, color: "#2a5fb2" },
  { name: "GoyoTours", domain: "goyotours.com", url: "https://goyotours.com", description: "China travel desk", category: "website", status: "planned", icon: Globe, color: "#f59e0b" },
]

/* ------------------------------------------------------------------ */
/*  Live space card                                                    */
/* ------------------------------------------------------------------ */

function ActiveSpaceCard({ space }: { space: Space }) {
  const Icon = resolveIcon(space.icon)
  const color = space.color || "#3b82f6"
  const isExternal = /^https?:\/\//i.test(space.entry_url)

  const inner = (
    <>
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}1f, ${color}08)` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {space.name}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
          {space.tagline}
        </p>
      </div>
      {isExternal ? (
        <ArrowUpRight className="h-4 w-4 text-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : (
        <ArrowRight className="h-4 w-4 text-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </>
  )

  const className =
    "group flex items-center gap-3 rounded-lg border border-border/80 bg-card shadow-sm px-3.5 py-2.5 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  if (isExternal) {
    return (
      <a href={space.entry_url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={space.entry_url} className={className}>
      {inner}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  External app card                                                  */
/* ------------------------------------------------------------------ */

function ExternalAppCard({ app }: { app: ExternalApp }) {
  const Icon = app.icon
  const isLive = app.status === "live"
  const statusLabel =
    app.status === "live" ? "Live" : app.status === "building" ? "Building" : "Planned"
  const statusClass =
    app.status === "live"
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : app.status === "building"
        ? "text-amber-700 bg-amber-50 ring-amber-200"
        : "text-muted-foreground bg-muted/60 ring-border/60"

  const Wrapper = isLive || app.status === "building" ? "a" : "div"
  const wrapperProps = (isLive || app.status === "building")
    ? { href: app.url, target: "_blank" as const, rel: "noopener noreferrer" }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex items-center gap-3 rounded-lg border border-border/80 bg-card shadow-sm px-3.5 py-2.5 ${
        isLive || app.status === "building"
          ? "hover:bg-muted/40 transition-colors"
          : "opacity-75 cursor-not-allowed select-none"
      }`}
      title={app.domain}
    >
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${app.color}1f, ${app.color}08)` }}
      >
        <Icon className="h-4 w-4" style={{ color: app.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {app.domain}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
          {app.description}
        </p>
      </div>
      {isLive || app.status === "building" ? (
        <ArrowUpRight className="h-4 w-4 text-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : (
        <span
          className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded ring-1 ring-inset ${statusClass}`}
        >
          {statusLabel}
        </span>
      )}
    </Wrapper>
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
      <h3 className="text-base font-semibold font-heading text-foreground">
        No spaces yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Once a space is activated it will appear here.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Deployment card — DB-driven, grouped by kind                       */
/* ------------------------------------------------------------------ */

export type DeploymentCard = {
  slug: string
  name: string
  brandLabel: string | null
  kind: "landing" | "client-portal" | "admin-portal" | "vendor-portal"
  url: string
  color: string | null
  venture: string | null
  status: "live" | "building"
}

const KIND_META: Record<
  DeploymentCard["kind"],
  { label: string; icon: LucideIcon }
> = {
  landing: { label: "Website", icon: Globe },
  "client-portal": { label: "Client portal", icon: Store },
  "admin-portal": { label: "Admin", icon: Building2 },
  "vendor-portal": { label: "Vendor portal", icon: Truck },
}

function DeploymentCardRow({ d }: { d: DeploymentCard }) {
  const Icon = KIND_META[d.kind].icon
  const color = d.color ?? "#64748b"
  return (
    <a
      href={d.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-border/80 bg-card shadow-sm px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
      title={d.url}
    >
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}1f, ${color}08)` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {d.brandLabel ?? d.name}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
          {d.url.replace(/^https?:\/\//, "")}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  )
}

function DeploymentSection({
  label,
  items,
}: {
  label: string
  items: DeploymentCard[]
}) {
  if (items.length === 0) return null
  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
        {label}
        <span className="ml-1.5 text-xs font-semibold text-white/50">{items.length}</span>
      </p>
      {items.map((d) => (
        <DeploymentCardRow key={d.slug} d={d} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile apps — static list of downloadable APKs / links             */
/* ------------------------------------------------------------------ */

const WP_STORAGE =
  "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/nexus-assets"

interface MobileApp {
  name: string
  description: string
  platform: "android" | "ios"
  downloadUrl: string
  color: string
}

const MOBILE_APPS: MobileApp[] = [
  {
    name: "Callsync",
    description: "Auto-sync call logs & recordings",
    platform: "android",
    downloadUrl: `${WP_STORAGE}/callsync-v1.apk`,
    color: "#6366f1",
  },
]

function MobileAppCard({ app }: { app: MobileApp }) {
  return (
    <a
      href={app.downloadUrl}
      download
      className="group flex items-center gap-3 rounded-lg border border-border/80 bg-card shadow-sm px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
    >
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${app.color}1f, ${app.color}08)` }}
      >
        <Smartphone className="h-4 w-4" style={{ color: app.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">
          {app.name}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">
          {app.description}
        </p>
      </div>
      <Download className="h-4 w-4 text-foreground shrink-0 transition-transform group-hover:translate-y-0.5" />
    </a>
  )
}

/* ------------------------------------------------------------------ */
/*  Home hero — 5-column grid                                          */
/* ------------------------------------------------------------------ */

function HomeHero({
  activeApps,
  deployments,
}: {
  activeApps: Space[]
  deployments: DeploymentCard[]
}) {
  const websites = deployments.filter((d) => d.kind === "landing")
  const clientApps = deployments.filter((d) => d.kind === "client-portal")
  const vendorPortals = deployments.filter((d) => d.kind === "vendor-portal")

  return (
    <div className="relative min-h-screen flex flex-col items-center px-5 py-20">
      <div className="w-full max-w-7xl flex flex-col items-center mt-16">
        <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-center text-white">
          Suprans<span className="text-primary"> HQ</span>
        </h1>
        <p className="mt-2 text-base text-white/90 text-center">
          TeamSync AI — every operation, one place.
        </p>

        {/* 5-column grid */}
        <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
          {/* Col 1: Spaces */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
              Spaces
              <span className="ml-1.5 text-xs font-semibold text-white/50">{activeApps.length}</span>
            </p>
            {activeApps.length === 0 ? (
              <EmptyState />
            ) : (
              activeApps.map((app) => (
                <ActiveSpaceCard key={app.id} space={app} />
              ))
            )}
          </div>

          {/* Col 2: Websites */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
              Websites
              <span className="ml-1.5 text-xs font-semibold text-white/50">{websites.length}</span>
            </p>
            {websites.map((d) => (
              <DeploymentCardRow key={d.slug} d={d} />
            ))}
          </div>

          {/* Col 3: Client Apps */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
              Client Apps
              <span className="ml-1.5 text-xs font-semibold text-white/50">{clientApps.length}</span>
            </p>
            {clientApps.map((d) => (
              <DeploymentCardRow key={d.slug} d={d} />
            ))}
          </div>

          {/* Col 4: Vendor Portals */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
              Vendor Portals
              <span className="ml-1.5 text-xs font-semibold text-white/50">{vendorPortals.length}</span>
            </p>
            {vendorPortals.map((d) => (
              <DeploymentCardRow key={d.slug} d={d} />
            ))}
          </div>

          {/* Col 5: Mobile Apps */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70 text-center mb-1">
              Mobile Apps
              <span className="ml-1.5 text-xs font-semibold text-white/50">{MOBILE_APPS.length}</span>
            </p>
            {MOBILE_APPS.map((app) => (
              <MobileAppCard key={app.name} app={app} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Plugins view                                                       */
/* ------------------------------------------------------------------ */

function PluginsView() {
  return (
    <div className="relative min-h-screen flex flex-col items-center px-5 py-20">
      <div className="w-full max-w-6xl rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-2xl p-6 md:p-10">
        <PluginsCatalogue
          categories={PLUGIN_CATEGORIES}
          totalInstalled={countInstalled()}
          totalPending={countPending()}
          tone="glass"
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Launcher root                                                      */
/* ------------------------------------------------------------------ */

type View = "home" | "plugins"

interface HomeLauncherProps {
  activeApps: Space[]
  deployments: DeploymentCard[]
}

export function HomeLauncher({ activeApps, deployments }: HomeLauncherProps) {
  const [view, setView] = useState<View>("home")
  const router = useRouter()

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="fixed inset-0 -z-20"
        style={{
          background: "linear-gradient(180deg, #fce7f3 0%, #f5d0fe 35%, #dcfce7 100%)",
        }}
      />
      <WallpaperSwitcher wallpapers={WALLPAPERS} />

      {/* Top-left: Home / Plugins toggle */}
      <div className="absolute top-4 left-4 z-10">
        <div className="inline-flex items-center gap-0.5 h-9 p-0.5 rounded-md border border-border/80 bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setView("home")}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors",
              view === "home"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            title="Home"
          >
            <HomeIcon className="h-4 w-4" />
            Home
          </button>
          <button
            type="button"
            onClick={() => setView("plugins")}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors",
              view === "plugins"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
            title="Plugins"
          >
            <Puzzle className="h-4 w-4" />
            Plugins
          </button>
          <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/40"
            title="Tasks"
          >
            <ListChecks className="h-4 w-4" />
            Tasks
          </button>
        </div>
      </div>

      {/* Top-right: Help */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        <Link
          href="/workspace/knowledge"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/80 bg-card shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
      </div>

      {view === "home" && <HomeHero activeApps={activeApps} deployments={deployments} />}
      {view === "plugins" && <PluginsView />}

      {view === "home" && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="rounded-md border border-border/80 bg-card shadow-sm px-3 py-2 max-w-[220px]">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Wallpaper
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Switch via the right-dock user menu.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
