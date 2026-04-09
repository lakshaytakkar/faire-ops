"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function KnowledgeRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/workspace/knowledge/articles") }, [router])
  return null
}
