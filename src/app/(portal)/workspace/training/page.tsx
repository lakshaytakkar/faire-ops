"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function TrainingRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/workspace/training/videos")
  }, [router])
  return null
}
