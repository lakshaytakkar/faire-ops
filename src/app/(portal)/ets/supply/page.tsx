"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function EtsSupplyIndex() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ets/supply/launches")
  }, [router])
  return null
}
