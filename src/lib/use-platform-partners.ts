"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"

export interface PlatformPartner {
  id: string
  space_slug: string
  platform: string
  role: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  calendly_url: string | null
  avatar_url: string | null
  notes: string | null
  is_pinned: boolean
  sort_order: number
}

export function usePinnedPartners(spaceSlug: string) {
  const [partners, setPartners] = useState<PlatformPartner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from("platform_partners")
      .select("*")
      .eq("space_slug", spaceSlug)
      .eq("is_pinned", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error("usePinnedPartners:", error)
        setPartners((data as PlatformPartner[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceSlug])

  return { partners, loading }
}
