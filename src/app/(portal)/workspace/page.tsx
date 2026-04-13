"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function WorkspaceRedirectInner() {
  useParamsPreservingRedirect("/workspace/team")
  return null
}

export default function WorkspaceRedirect() {
  return (
    <Suspense fallback={null}>
      <WorkspaceRedirectInner />
    </Suspense>
  )
}
