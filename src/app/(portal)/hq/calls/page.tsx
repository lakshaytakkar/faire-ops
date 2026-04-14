"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function QaRedirectInner() {
  useParamsPreservingRedirect("/hq/calls/dashboard")
  return null
}

export default function QaRedirect() {
  return (
    <Suspense fallback={null}>
      <QaRedirectInner />
    </Suspense>
  )
}
