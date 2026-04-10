"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
export default function QARedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/workspace/qa/dashboard") }, [router])
  return null
}
