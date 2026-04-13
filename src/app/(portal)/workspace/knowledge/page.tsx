"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function KnowledgeRedirectInner() {
  useParamsPreservingRedirect("/workspace/knowledge/articles")
  return null
}

export default function KnowledgeRedirect() {
  return (
    <Suspense fallback={null}>
      <KnowledgeRedirectInner />
    </Suspense>
  )
}
