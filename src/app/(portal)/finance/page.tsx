"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function FinanceRedirectInner() {
  useParamsPreservingRedirect("/finance/banking")
  return null
}

export default function FinanceRedirect() {
  return (
    <Suspense fallback={null}>
      <FinanceRedirectInner />
    </Suspense>
  )
}
