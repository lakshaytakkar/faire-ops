import { TopNavigation } from "@/components/layout/top-navigation"
import { BrandDock } from "@/components/layout/brand-dock"
import { BrandFilterProvider } from "@/lib/brand-filter-context"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BrandFilterProvider>
      <div className="flex h-screen w-full">
        <BrandDock />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNavigation />
          <main className="flex-1 overflow-auto px-4 py-5 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </BrandFilterProvider>
  )
}
