"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function TicketsRedirectInner() {
  useParamsPreservingRedirect("/workspace/tickets/dashboard")
  return null
}

export default function TicketsRedirect() {
  return (
    <Suspense fallback={null}>
      <TicketsRedirectInner />
    </Suspense>
  )
}
