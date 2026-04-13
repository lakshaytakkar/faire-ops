"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function EtsIndexRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ets/dashboard")
  }, [router])
  return null
}
