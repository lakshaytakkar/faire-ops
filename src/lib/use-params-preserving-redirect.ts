"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function useParamsPreservingRedirect(target: string) {
  const router = useRouter()
  const params = useSearchParams()
  useEffect(() => {
    const qs = params.toString()
    router.replace(`${target}${qs ? `?${qs}` : ""}`)
  }, [router, params, target])
}
