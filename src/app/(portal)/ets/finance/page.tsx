"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function EtsFinanceIndex() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ets/finance/payments")
  }, [router])
  return null
}
