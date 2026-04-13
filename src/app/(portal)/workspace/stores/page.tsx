"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function StoresRedirectInner() {
  useParamsPreservingRedirect("/workspace/stores/all")
  return null
}

export default function StoresRedirect() {
  return (
    <Suspense fallback={null}>
      <StoresRedirectInner />
    </Suspense>
  )
}
