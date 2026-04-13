"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function EmailsRedirectInner() {
  useParamsPreservingRedirect("/workspace/emails/dashboard")
  return null
}

export default function EmailsRedirect() {
  return (
    <Suspense fallback={null}>
      <EmailsRedirectInner />
    </Suspense>
  )
}
