"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function B2BEcosystemIndexRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/b2b-ecosystem/overview")
  }, [router])
  return null
}
