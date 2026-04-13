"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function AnalyticsRedirectInner() {
  useParamsPreservingRedirect("/analytics/revenue")
  return null
}

export default function AnalyticsRedirect() {
  return (
    <Suspense fallback={null}>
      <AnalyticsRedirectInner />
    </Suspense>
  )
}
