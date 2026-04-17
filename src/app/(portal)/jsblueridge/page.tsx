"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function JSBlueridgeIndexRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/jsblueridge/overview")
  }, [router])
  return null
}
