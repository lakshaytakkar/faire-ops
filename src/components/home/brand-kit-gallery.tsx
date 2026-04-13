"use client"

/**
 * Cross-project brand kit gallery. Renders one card per project
 * grouped by brand, showing the brand's palette, fonts, tagline, and
 * logo thumbnails so the CEO can eyeball design consistency across
 * every venture in one view.
 */

import { type Project, type ProjectWithChildren } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface BrandKitGalleryProps {
  projects: Project[]
  detailMap: Map<string, ProjectWithChildren>
  onSelectSlug: (slug: string) => void
}

export function BrandKitGallery({
  projects,
  detailMap,
  onSelectSlug,
}: BrandKitGalleryProps) {
  // Group by brand for visual sections
  const byBrand = new Map<string, { label: string; color: string | null; items: Project[] }>()
  for (const p of projects) {
    const g = byBrand.get(p.brand) ?? {
      label: p.brand_label,
      color: p.color,
      items: [] as Project[],
    }
    g.items.push(p)
    byBrand.set(p.brand, g)
  }

  return (
    <div className="space-y-6">
      {Array.from(byBrand.entries()).map(([brand, group]) => (
        <div key={brand} className="space-y-3">
          <div className="flex items-center gap-2">
            {group.color && (
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: group.color }}
              />
            )}
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
              {group.label}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((p) => {
              const detail = detailMap.get(p.slug)
              const kit = detail?.brand_kit
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => onSelectSlug(p.slug)}
                  className={cn(
                    "text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors",
                    "p-4 flex flex-col gap-3"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-white/50 truncate">
                        {p.kind === "admin-portal"
                          ? "Admin portal"
                          : p.kind === "client-portal"
                            ? "Client portal"
                            : p.kind === "vendor-portal"
                              ? "Vendor portal"
                              : "Landing"}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider text-white/60 bg-white/10 ring-1 ring-white/10 px-1.5 py-0.5 rounded"
                    >
                      {p.version}
                    </span>
                  </div>

                  {/* Color palette */}
                  <div className="flex items-center gap-1">
                    <ColorSwatch hex={kit?.primary_color ?? p.color ?? "#64748b"} label="Primary" />
                    <ColorSwatch hex={kit?.accent_color ?? null} label="Accent" />
                    <ColorSwatch hex={kit?.bg_color ?? null} label="BG" />
                    <ColorSwatch hex={kit?.text_color ?? null} label="Text" />
                  </div>

                  {/* Font sample */}
                  {(kit?.font_heading || kit?.font_body) && (
                    <div className="space-y-0.5">
                      <div
                        className="text-base text-white truncate"
                        style={{ fontFamily: kit?.font_heading ?? undefined }}
                      >
                        Aa {kit?.font_heading ?? "—"}
                      </div>
                      <div
                        className="text-xs text-white/60 truncate"
                        style={{ fontFamily: kit?.font_body ?? undefined }}
                      >
                        body · {kit?.font_body ?? "—"}
                      </div>
                    </div>
                  )}

                  {/* Tagline */}
                  {kit?.tagline && (
                    <p className="text-xs text-white/70 italic line-clamp-2">
                      "{kit.tagline}"
                    </p>
                  )}

                  {/* Logos */}
                  {(kit?.logo_full_url || kit?.logo_icon_url) && (
                    <div className="flex items-center gap-2 pt-1">
                      {kit.logo_icon_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={kit.logo_icon_url}
                          alt="icon"
                          className="h-8 w-8 object-contain bg-white/5 rounded"
                        />
                      )}
                      {kit.logo_full_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={kit.logo_full_url}
                          alt="full"
                          className="h-8 flex-1 object-contain bg-white/5 rounded"
                        />
                      )}
                    </div>
                  )}

                  {!kit && (
                    <p className="text-xs text-white/40 italic">
                      No brand kit yet — add colors, fonts, logos, tagline.
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ColorSwatch({ hex, label }: { hex: string | null; label: string }) {
  if (!hex) {
    return (
      <div className="flex-1 h-10 rounded-md bg-white/5 ring-1 ring-white/10 flex flex-col items-center justify-center">
        <span className="text-[9px] text-white/30">{label}</span>
      </div>
    )
  }
  return (
    <div
      className="flex-1 h-10 rounded-md ring-1 ring-white/10 flex flex-col items-center justify-center"
      style={{ backgroundColor: hex }}
      title={`${label}: ${hex}`}
    >
      <span className="text-[9px] font-mono text-white/90 drop-shadow-sm">
        {hex}
      </span>
    </div>
  )
}
