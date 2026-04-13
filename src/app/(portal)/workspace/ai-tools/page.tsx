"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function AiToolsRedirectInner() {
  useParamsPreservingRedirect("/workspace/ai-tools/all")
  return null
}

export default function AiToolsRedirect() {
  return (
    <Suspense fallback={null}>
      <AiToolsRedirectInner />
    </Suspense>
  )
}
