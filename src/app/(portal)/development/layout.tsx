export const metadata = {
  title: "Development — Suprans",
  description:
    "Every landing, portal, and app in the Suprans ecosystem. Project portfolio, sprints, deployments, roadmap, changelog.",
}

// Pass-through. Padding comes from the portal main wrapper; the shared
// TopNavigation handles dev sub-nav via PLACEHOLDER_DEVELOPMENT.
export default function DevelopmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
