"use client"

/**
 * Route guard — only renders children if the current user has access
 * to the named space. Used to wrap an entire space's pages.
 *
 * Usage:
 *   <SpaceGuard spaceSlug="hq">
 *     <HQOverviewPage />
 *   </SpaceGuard>
 *
 * If the user is not authenticated yet (loading), shows a small skeleton.
 * If the user does not have access, shows a NoAccess component (does NOT
 * client-side redirect — that would be jarring; instead it explains why).
 */

import { useAuth } from "@/lib/auth-context"
import { Lock, Layers } from "lucide-react"
import Link from "next/link"

interface SpaceGuardProps {
  spaceSlug: string
  children: React.ReactNode
}

export function SpaceGuard({ spaceSlug, children }: SpaceGuardProps) {
  const { hasSpaceAccess, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5 animate-pulse">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-muted" />
      </div>
    )
  }

  if (!hasSpaceAccess(spaceSlug)) {
    return (
      <div className="max-w-[640px] mx-auto w-full">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading">No access to this space</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You don&apos;t have permission to view <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{spaceSlug}</span>.
              Ask a workspace admin to grant you access.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card shadow-sm px-3 h-9 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Layers className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
