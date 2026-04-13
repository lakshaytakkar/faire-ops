"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function ReportsRedirectInner() {
  useParamsPreservingRedirect("/reports/all")
  return null
}

export default function ReportsRedirect() {
  return (
    <Suspense fallback={null}>
      <ReportsRedirectInner />
    </Suspense>
  )
}
