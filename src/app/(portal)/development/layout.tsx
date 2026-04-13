export const metadata = {
  title: "Development — Suprans",
  description:
    "Every landing, portal, and app in the Suprans ecosystem. Project portfolio, sprints, deployments, roadmap, changelog.",
}

export default function DevelopmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The shared TopNavigation handles the dev sub-nav via PLACEHOLDER_DEVELOPMENT
  // when `useActiveSpace().slug === "development"`. Layout is just a content shell.
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1440px] mx-auto w-full p-6 md:p-8">
        {children}
      </div>
    </div>
  )
}
