"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function AutomationsRedirectInner() {
  useParamsPreservingRedirect("/automations/overview")
  return null
}

export default function AutomationsRedirect() {
  return (
    <Suspense fallback={null}>
      <AutomationsRedirectInner />
    </Suspense>
  )
}
