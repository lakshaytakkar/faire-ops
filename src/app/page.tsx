import { listSpaces } from "@/lib/spaces"
import { supabase } from "@/lib/supabase"
import { HomeLauncher, type DeploymentCard } from "@/components/home/home-launcher"

export const dynamic = "force-dynamic"

/**
 * Homepage — thin server wrapper. Passes active spaces + live deployments
 * from `public.projects` to the client launcher. "All active deployments for
 * all clients" is grouped on the hero so the dock stays clean.
 */
export default async function HomePage() {
  const [spaces, { data: projectsRaw }] = await Promise.all([
    listSpaces(),
    supabase
      .from("projects")
      .select("slug, name, brand, brand_label, kind, url, color, venture, status")
      .in("status", ["live", "building"])
      .not("url", "is", null)
      .order("venture", { ascending: true })
      .order("sort_order", { ascending: true }),
  ])

  const activeApps = spaces.filter((s) => s.is_active)

  const deployments: DeploymentCard[] = (projectsRaw ?? [])
    .filter((p) => typeof p.url === "string" && p.url.startsWith("http"))
    .map((p) => ({
      slug: p.slug as string,
      name: (p.name as string) ?? (p.brand_label as string) ?? (p.slug as string),
      brandLabel: (p.brand_label as string | null) ?? null,
      kind: (p.kind as "landing" | "client-portal" | "admin-portal" | "vendor-portal") ?? "landing",
      url: p.url as string,
      color: (p.color as string | null) ?? null,
      venture: (p.venture as string | null) ?? null,
      status: (p.status as "live" | "building") ?? "live",
    }))

  return <HomeLauncher activeApps={activeApps} deployments={deployments} />
}
