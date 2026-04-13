"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function CatalogRedirectInner() {
  useParamsPreservingRedirect("/catalog/listings")
  return null
}

export default function CatalogRedirect() {
  return (
    <Suspense fallback={null}>
      <CatalogRedirectInner />
    </Suspense>
  )
}
