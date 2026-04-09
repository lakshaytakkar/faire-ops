"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
export default function MarketingRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/marketing/dashboard") }, [router])
  return null
}
