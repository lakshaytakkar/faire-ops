"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function EtsCatalogIndex() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ets/catalog/products")
  }, [router])
  return null
}
