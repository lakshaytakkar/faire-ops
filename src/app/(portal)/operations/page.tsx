"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function OperationsRedirectInner() {
  useParamsPreservingRedirect("/operations/tasks")
  return null
}

export default function OperationsRedirect() {
  return (
    <Suspense fallback={null}>
      <OperationsRedirectInner />
    </Suspense>
  )
}
