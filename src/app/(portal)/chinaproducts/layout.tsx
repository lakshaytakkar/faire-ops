export const metadata = {
  title: "chinaproducts.in Rep Portal — Suprans",
  description:
    "Internal rep portal for chinaproducts.in — customer queue, orders, SKU browser, AI call scripts.",
}

// Pass-through. Sub-navigation is rendered by the shared TopNavigation
// when getActiveSpaceSlug(pathname) === "chinaproducts". See SPACE_PATTERN.md §2.
export default function ChinaproductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
