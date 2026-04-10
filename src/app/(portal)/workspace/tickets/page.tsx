"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
export default function TicketsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/workspace/tickets/dashboard") }, [router])
  return null
}
