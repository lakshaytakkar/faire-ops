import Link from "next/link"
import { Check } from "lucide-react"
import type { Plugin, PluginCategory } from "@/lib/plugins-catalog"

/**
 * Presentational component that renders the plugins catalogue as a list of
 * category sections with grids of plugin cards. Used by:
 *
 *   - /plugins (standalone page)
 *   - <HomeLauncher> (inline plugins view on the homepage)
 *
 * Supports two tones:
 *   - "light": default light card styling for the /plugins route
 *   - "glass": white-on-wallpaper styling for the homepage overlay
 */

type Tone = "light" | "glass"

interface PluginsCatalogueProps {
  categories: PluginCategory[]
  totalInstalled: number
  totalPending: number
  tone?: Tone
}

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ")
}

function PluginCard({ plugin, tone }: { plugin: Plugin; tone: Tone }) {
  const Icon = plugin.icon
  const isInstalled = plugin.status === "installed"
  const isGlass = tone === "glass"

  const wrapperBase =
    "group flex items-start gap-3 rounded-lg p-3 transition-all shadow-sm border"

  const wrapperTone = isGlass
    ? isInstalled
      ? "bg-white/10 backdrop-blur-sm border-white/15 hover:bg-white/15 hover:border-white/30"
      : "bg-white/5 backdrop-blur-sm border-white/10 grayscale opacity-60 cursor-not-allowed"
    : isInstalled
      ? "bg-card border-border/80 hover:border-foreground/20 hover:shadow-md"
      : "bg-card border-border/80 grayscale opacity-70 cursor-not-allowed"

  const iconBg = isGlass
    ? isInstalled
      ? "bg-white/15 text-white ring-1 ring-white/20"
      : "bg-white/10 text-white/60 ring-1 ring-white/10"
    : isInstalled
      ? "bg-primary/10 text-primary ring-1 ring-black/[0.04]"
      : "bg-muted text-muted-foreground ring-1 ring-black/[0.04]"

  const titleColor = isGlass ? "text-white" : "text-foreground"
  const descColor = isGlass ? "text-white/70" : "text-muted-foreground"

  const pillInstalled = isGlass
    ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200"

  const pillPending = isGlass
    ? "border-white/15 bg-white/10 text-white/50"
    : "border-border/80 bg-muted/60 text-muted-foreground"

  const inner = (
    <div className={cx(wrapperBase, wrapperTone)}>
      <div
        className={cx(
          "flex items-center justify-center h-10 w-10 rounded-md shrink-0",
          iconBg
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className={cx(
            "text-sm font-semibold font-heading leading-tight truncate",
            titleColor
          )}
        >
          {plugin.name}
        </h3>
        <p
          className={cx(
            "text-[11px] leading-snug mt-0.5 line-clamp-2",
            descColor
          )}
        >
          {plugin.description}
        </p>
      </div>
      <div className="shrink-0">
        {isInstalled ? (
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
              pillInstalled
            )}
          >
            <Check className="h-3 w-3" />
            Installed
          </span>
        ) : (
          <span
            className={cx(
              "inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
              pillPending
            )}
          >
            Coming soon
          </span>
        )}
      </div>
    </div>
  )

  if (isInstalled && plugin.href) {
    return (
      <Link href={plugin.href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}

export function PluginsCatalogue({
  categories,
  totalInstalled,
  totalPending,
  tone = "light",
}: PluginsCatalogueProps) {
  const isGlass = tone === "glass"
  const headingColor = isGlass ? "text-white" : "text-foreground"
  const mutedColor = isGlass ? "text-white/70" : "text-muted-foreground"
  const dividerColor = isGlass ? "border-white/10" : "border-border/80"

  return (
    <div>
      {/* Header */}
      <div className="max-w-3xl">
        <h1
          className={cx(
            "text-3xl md:text-4xl font-bold font-heading tracking-tight",
            headingColor
          )}
        >
          Plugins
        </h1>
        <p
          className={cx(
            "mt-3 text-sm md:text-base leading-relaxed",
            mutedColor
          )}
        >
          Universal modules that can be installed into any space. Each space
          is isolated — install only what it needs. We already ship{" "}
          <span className={cx("font-semibold", headingColor)}>
            {totalInstalled}
          </span>{" "}
          modules, with{" "}
          <span className={cx("font-semibold", headingColor)}>
            {totalPending}
          </span>{" "}
          on the roadmap. Pending plugins are shown in grayscale.
        </p>
      </div>

      {/* Categories */}
      <div className="mt-10 space-y-10">
        {categories.map((category) => {
          const installedInCat = category.plugins.filter(
            (p) => p.status === "installed"
          ).length
          return (
            <section key={category.name}>
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <h2
                    className={cx(
                      "text-lg md:text-xl font-bold font-heading",
                      headingColor
                    )}
                  >
                    {category.name}
                  </h2>
                  <p className={cx("text-xs mt-0.5", mutedColor)}>
                    {category.blurb}
                  </p>
                </div>
                <div
                  className={cx(
                    "text-[10px] font-bold uppercase tracking-wider shrink-0",
                    mutedColor
                  )}
                >
                  {installedInCat} / {category.plugins.length} installed
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.plugins.map((plugin) => (
                  <PluginCard
                    key={category.name + plugin.name}
                    plugin={plugin}
                    tone={tone}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className={cx(
          "mt-16 pt-8 border-t text-xs",
          dividerColor,
          mutedColor
        )}
      >
        Total: {totalInstalled} installed · {totalPending} coming soon ·{" "}
        {categories.length} categories
      </div>
    </div>
  )
}
