"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function RetailersRedirectInner() {
  useParamsPreservingRedirect("/retailers/directory")
  return null
}

export default function RetailersRedirect() {
  return (
    <Suspense fallback={null}>
      <RetailersRedirectInner />
    </Suspense>
  )
}
