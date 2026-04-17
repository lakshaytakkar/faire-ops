export const metadata = {
  title: "chinaimports.in Ops Portal — Suprans",
  description:
    "Internal ops portal for chinaimports.in — RFQ queue, factory sourcing workspace, 9-stage order tracker.",
}

// Pass-through. Sub-navigation is rendered by the shared TopNavigation
// when getActiveSpaceSlug(pathname) === "chinaimports". See SPACE_PATTERN.md §2.
export default function ChinaimportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
