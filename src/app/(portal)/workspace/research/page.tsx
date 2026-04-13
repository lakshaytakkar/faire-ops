"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function ResearchRedirectInner() {
  useParamsPreservingRedirect("/workspace/research/dashboard")
  return null
}

export default function ResearchRedirect() {
  return (
    <Suspense fallback={null}>
      <ResearchRedirectInner />
    </Suspense>
  )
}
