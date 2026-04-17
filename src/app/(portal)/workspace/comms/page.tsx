"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function CommsRedirectInner() {
  useParamsPreservingRedirect("/workspace/comms/overview")
  return null
}

export default function CommsRedirect() {
  return (
    <Suspense fallback={null}>
      <CommsRedirectInner />
    </Suspense>
  )
}
