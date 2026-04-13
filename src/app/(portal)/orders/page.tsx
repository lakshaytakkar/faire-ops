"use client"

import { Suspense } from "react"
import { useParamsPreservingRedirect } from "@/lib/use-params-preserving-redirect"

function OrdersRedirectInner() {
  useParamsPreservingRedirect("/orders/all")
  return null
}

export default function OrdersRedirect() {
  return (
    <Suspense fallback={null}>
      <OrdersRedirectInner />
    </Suspense>
  )
}
