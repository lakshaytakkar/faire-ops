"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function EtsSalesIndex() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ets/sales/pipeline")
  }, [router])
  return null
}
