"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function MarketingRedirectInner() {
  useParamsPreservingRedirect("/marketing/dashboard")
  return null
}

export default function MarketingRedirect() {
  return (
    <Suspense fallback={null}>
      <MarketingRedirectInner />
    </Suspense>
  )
}
