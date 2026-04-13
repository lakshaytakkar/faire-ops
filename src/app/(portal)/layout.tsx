import { TopNavigation } from "@/components/layout/top-navigation"
import { SpaceDock } from "@/components/layout/space-dock"
import { WorkspaceDock } from "@/components/layout/workspace-dock"
import { BrandFilterProvider } from "@/lib/brand-filter-context"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "sonner"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <BrandFilterProvider>
        <div className="flex h-screen w-full">
          {/* Left dock — space switcher */}
          <SpaceDock />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNavigation />
            <main className="flex-1 overflow-auto px-4 py-5 md:px-6 lg:px-8">
              {children}
            </main>
          </div>
          {/* Right dock — workspace tools + user menu at top */}
          <WorkspaceDock />
        </div>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-plus-jakarta)",
            },
          }}
        />
      </BrandFilterProvider>
    </AuthProvider>
  )
}
