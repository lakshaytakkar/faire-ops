export const metadata = {
  title: "USDrop AI — Admin | Suprans",
  description:
    "Back-office for USDrop AI — catalog, users, orders, courses, payouts, and every surface the client app touches.",
}

// Pass-through. Sub-navigation is rendered by the shared TopNavigation
// when getActiveSpaceSlug(pathname) === "usdrop" — see PLACEHOLDER_USDROP.
export default function UsdropLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
