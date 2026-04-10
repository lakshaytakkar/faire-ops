"use client"

import { useState, useEffect, useCallback } from "react"
import { supabaseB2B } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MetaCampaign {
  id: string
  account_id: string | null
  meta_campaign_id: string | null
  name: string
  objective: string
  status: string
  buying_type: string
  budget_type: string
  budget_cents: number
  spend_cents: number
  impressions: number
  clicks: number
  conversions: number
  revenue_cents: number
  ctr: number
  cpc_cents: number
  roas: number
  start_date: string | null
  end_date: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface MetaAdSet {
  id: string
  campaign_id: string
  meta_ad_set_id: string | null
  name: string
  status: string
  budget_type: string
  budget_cents: number
  spend_cents: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc_cents: number
  targeting: Record<string, unknown>
  placements: string[]
  optimization_goal: string | null
  bid_strategy: string
  schedule: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MetaAd {
  id: string
  ad_set_id: string
  meta_ad_id: string | null
  name: string
  status: string
  creative_id: string | null
  headline: string | null
  primary_text: string | null
  description: string | null
  cta_type: string
  destination_url: string | null
  image_url: string | null
  video_url: string | null
  spend_cents: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc_cents: number
  roas: number
  created_at: string
  updated_at: string
}

export interface MetaAdCreative {
  id: string
  name: string
  type: string
  status: string
  image_url: string | null
  video_url: string | null
  thumbnail_url: string | null
  headline: string | null
  primary_text: string | null
  description: string | null
  cta_type: string | null
  destination_url: string | null
  carousel_cards: unknown[]
  ai_generated: boolean
  ai_prompt: string | null
  tags: string[]
  notes: string | null
  performance_score: number | null
  created_at: string
  updated_at: string
}

export interface MetaAdReport {
  id: string
  entity_type: string
  entity_id: string
  report_date: string
  spend_cents: number
  impressions: number
  reach: number
  clicks: number
  link_clicks: number
  conversions: number
  revenue_cents: number
  ctr: number
  cpc_cents: number
  cpm_cents: number
  roas: number
  frequency: number
}

export interface MarketingBudget {
  id: string
  month: string
  channel: string
  planned_cents: number
  spent_cents: number
  revenue_cents: number
  notes: string | null
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseB2B
      .from("meta_campaigns")
      .select("*")
      .order("updated_at", { ascending: false })
    setCampaigns((data ?? []) as MetaCampaign[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { campaigns, loading, refetch: fetch }
}

export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseB2B.from("meta_campaigns").select("*").eq("id", id).single()
      .then(({ data }) => { setCampaign(data as MetaCampaign | null); setLoading(false) })
  }, [id])

  return { campaign, loading }
}

export function useAdSets(campaignId?: string) {
  const [adSets, setAdSets] = useState<MetaAdSet[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabaseB2B.from("meta_ad_sets").select("*").order("updated_at", { ascending: false })
    if (campaignId) query = query.eq("campaign_id", campaignId)
    const { data } = await query
    setAdSets((data ?? []) as MetaAdSet[])
    setLoading(false)
  }, [campaignId])

  useEffect(() => { fetch() }, [fetch])
  return { adSets, loading, refetch: fetch }
}

export function useAdSet(id: string) {
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseB2B.from("meta_ad_sets").select("*").eq("id", id).single()
      .then(({ data }) => { setAdSet(data as MetaAdSet | null); setLoading(false) })
  }, [id])

  return { adSet, loading }
}

export function useAds(adSetId?: string) {
  const [ads, setAds] = useState<MetaAd[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabaseB2B.from("meta_ads").select("*").order("updated_at", { ascending: false })
    if (adSetId) query = query.eq("ad_set_id", adSetId)
    const { data } = await query
    setAds((data ?? []) as MetaAd[])
    setLoading(false)
  }, [adSetId])

  useEffect(() => { fetch() }, [fetch])
  return { ads, loading, refetch: fetch }
}

export function useAd(id: string) {
  const [ad, setAd] = useState<MetaAd | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseB2B.from("meta_ads").select("*").eq("id", id).single()
      .then(({ data }) => { setAd(data as MetaAd | null); setLoading(false) })
  }, [id])

  return { ad, loading }
}

export function useCreatives() {
  const [creatives, setCreatives] = useState<MetaAdCreative[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseB2B
      .from("meta_ad_creatives")
      .select("*")
      .order("updated_at", { ascending: false })
    setCreatives((data ?? []) as MetaAdCreative[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { creatives, loading, refetch: fetch }
}

export function useAdReports(entityType?: string, entityId?: string, days = 30) {
  const [reports, setReports] = useState<MetaAdReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - days)

    let query = supabaseB2B
      .from("meta_ad_reports")
      .select("*")
      .gte("report_date", since.toISOString().split("T")[0])
      .order("report_date", { ascending: true })

    if (entityType) query = query.eq("entity_type", entityType)
    if (entityId) query = query.eq("entity_id", entityId)

    query.then(({ data }) => {
      setReports((data ?? []) as MetaAdReport[])
      setLoading(false)
    })
  }, [entityType, entityId, days])

  return { reports, loading }
}

export function useMarketingBudgets() {
  const [budgets, setBudgets] = useState<MarketingBudget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseB2B
      .from("marketing_budgets")
      .select("*")
      .order("month", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setBudgets((data ?? []) as MarketingBudget[])
        setLoading(false)
      })
  }, [])

  return { budgets, loading }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-emerald-50 text-emerald-700"
    case "PAUSED": return "bg-amber-50 text-amber-700"
    case "ARCHIVED": return "bg-slate-100 text-slate-600"
    case "DELETED": return "bg-red-50 text-red-700"
    case "draft": return "bg-zinc-100 text-zinc-600"
    case "approved": return "bg-blue-50 text-blue-700"
    case "active": return "bg-emerald-50 text-emerald-700"
    case "archived": return "bg-slate-100 text-slate-600"
    default: return "bg-muted text-muted-foreground"
  }
}

export const OBJECTIVES = [
  "OUTCOME_AWARENESS",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_TRAFFIC",
  "OUTCOME_LEADS",
  "OUTCOME_APP_PROMOTION",
  "OUTCOME_SALES",
] as const

export const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_ENGAGEMENT: "Engagement",
  OUTCOME_TRAFFIC: "Traffic",
  OUTCOME_LEADS: "Leads",
  OUTCOME_APP_PROMOTION: "App Promotion",
  OUTCOME_SALES: "Sales",
}

export const CTA_TYPES = [
  "SHOP_NOW", "LEARN_MORE", "SIGN_UP", "SUBSCRIBE", "CONTACT_US",
  "GET_OFFER", "ORDER_NOW", "BOOK_NOW", "DOWNLOAD", "GET_QUOTE",
] as const
