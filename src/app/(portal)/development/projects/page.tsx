import { listProjects, type Project } from "@/lib/projects"
import { DevProjectCard } from "@/components/development/dev-project-card"
import { SectionHeader, ventureMeta } from "@/components/development/dev-primitives"
import { EtsListShell } from "@/app/(portal)/ets/_components/ets-ui"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Projects — Development | Suprans",
  description: "The full engineering portfolio — every landing, portal, and app.",
}

export default async function DevelopmentProjectsPage() {
  const projects = await listProjects()

  const byVenture = new Map<string, Project[]>()
  for (const p of projects) {
    const key = p.venture ?? "unassigned"
    const arr = byVenture.get(key) ?? []
    arr.push(p)
    byVenture.set(key, arr)
  }
  const sortedVentures = Array.from(byVenture.entries()).sort((a, b) => {
    const av = ventureMeta(a[0]).label
    const bv = ventureMeta(b[0]).label
    return av.localeCompare(bv)
  })

  return (
    <EtsListShell
      title="Projects"
      subtitle={`${projects.length} tracked properties across all ventures — every landing, portal, and app Suprans ships, grouped by the venture that funds it.`}
    >
      <div className="space-y-8">
        {sortedVentures.map(([venture, items]) => {
          const v = ventureMeta(venture)
          return (
            <div key={venture}>
              <SectionHeader
                eyebrow={v.label}
                title={`${items.length} ${items.length === 1 ? "property" : "properties"}`}
                description={ventureBlurb(venture)}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {items
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((p) => (
                    <DevProjectCard key={p.id} project={p} />
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </EtsListShell>
  )
}

function ventureBlurb(venture: string): string {
  switch (venture) {
    case "suprans":
      return "The multi-venture Suprans holding — its public site, admin backbone, and upcoming client-facing portal."
    case "ets":
      return "EazyToSell runs the 40+ store franchise retail network in India. Three surfaces at different build stages."
    case "legalnations":
      return "LegalNations is the US LLC formation service for Indian founders. 500+ customers served."
    case "usdrop-ai":
      return "USDrop AI is the AI-powered US dropshipping platform. 20,000 SKU catalog, Shopify-native, INR-settled."
    case "goyotours":
      return "GoyoTours is the China travel desk — Canton Fair and Yiwu trips."
    case "b2b-brands":
      return "Stand-alone landing pages for our wholesale brands — Gullee and Toyarina — for direct retailer access."
    case "cross-cutting":
      return "Internal platforms that serve every venture — HRMS, ATS, SOP knowledge base, public status page."
    case "teamsync-ai":
      return "The portal you're inside right now, productised for external teams. Same codebase, white-label-ready."
    default:
      return "Ventures grouped here share infrastructure but ship separately."
  }
}
