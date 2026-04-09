"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RedirectPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/automations/overview") }, [router])
  return null
}
