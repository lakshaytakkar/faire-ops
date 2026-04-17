import { Suspense } from "react"
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
          {/* Left dock — space switcher. Wrapped in Suspense because
              useActiveSpace() reads useSearchParams which requires a
              boundary during static prerender. */}
          <Suspense fallback={<div className="w-12 bg-dock shrink-0" />}>
            <SpaceDock />
          </Suspense>
          <div className="flex flex-1 flex-col overflow-hidden">
            <Suspense fallback={<div className="h-12 bg-dock shrink-0" />}>
              <TopNavigation />
            </Suspense>
            <main className="flex-1 overflow-auto px-3 py-3 md:px-5 md:py-4 lg:px-6">
              {children}
            </main>
          </div>
          {/* Right dock — workspace tools + user menu at top */}
          <Suspense fallback={<div className="w-12 bg-dock shrink-0" />}>
            <WorkspaceDock />
          </Suspense>
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
