import { TopNavigation } from "@/components/layout/top-navigation"
import { SpaceDock } from "@/components/layout/space-dock"
import { WorkspaceDock } from "@/components/layout/workspace-dock"
import { UtilityBar } from "@/components/layout/utility-bar"
import { BrandFilterPill } from "@/components/layout/brand-filter-pill"
import { BrandFilterProvider } from "@/lib/brand-filter-context"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BrandFilterProvider>
      <div className="flex h-screen w-full flex-col">
        {/* Dock + content row */}
        <div className="flex flex-1 min-h-0">
          {/* Left dock — space switcher (was: brand dock) */}
          <SpaceDock />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNavigation />
            <main className="flex-1 overflow-auto px-4 py-5 md:px-6 lg:px-8">
              {/* Pinned brand filter pill — visible only inside the b2b space */}
              <div className="mb-4 max-w-[1440px] mx-auto w-full">
                <BrandFilterPill />
              </div>
              {children}
            </main>
          </div>
          <WorkspaceDock />
        </div>

        {/* Full-width utility bar — pinned to the bottom of the viewport,
            spans across both docks. Acts as a global status / quick-actions
            strip. */}
        <UtilityBar />
      </div>
    </BrandFilterProvider>
  )
}
