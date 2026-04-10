"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
export default function ResearchRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/workspace/research/dashboard") }, [router])
  return null
}
