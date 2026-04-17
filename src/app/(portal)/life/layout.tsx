export const metadata = {
  title: "Life AI — Suprans",
  description:
    "Mr. Suprans's personal operating system. Goals, journal, finance, health, growth, people, plans.",
}

// Pass-through. Portal main provides padding; TopNavigation renders sub-nav
// via PLACEHOLDER_LIFE when useActiveSpace().slug === "life".
export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
