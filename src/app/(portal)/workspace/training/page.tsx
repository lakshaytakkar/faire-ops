"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function TrainingRedirectInner() {
  useParamsPreservingRedirect("/workspace/training/videos")
  return null
}

export default function TrainingRedirect() {
  return (
    <Suspense fallback={null}>
      <TrainingRedirectInner />
    </Suspense>
  )
}
