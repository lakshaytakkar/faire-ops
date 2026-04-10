import { listSpaces } from "@/lib/spaces"
import { HomeLauncher } from "@/components/home/home-launcher"

export const dynamic = "force-dynamic"

/**
 * Homepage — thin server wrapper. Fetches the list of active spaces from
 * Supabase and hands them to the <HomeLauncher> client component, which
 * owns the view state (Home / Plugins) and renders the wallpaper once so
 * it stays mounted as the user switches views.
 *
 * Only the "active" spaces (is_active = true) are surfaced on the home
 * launcher. The 4 coming-soon spaces (HQ, Legal, Goyo, USDrop) remain in
 * the DB and appear inside the portal as sub-spaces in the SpaceDock —
 * they are NOT separate apps on this launcher.
 */
export default async function HomePage() {
  const spaces = await listSpaces()
  const activeApps = spaces.filter((s) => s.is_active)
  return <HomeLauncher activeApps={activeApps} />
}
