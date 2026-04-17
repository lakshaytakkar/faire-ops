"use client"

import { useMemo, useState, useCallback, Fragment } from "react"
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  ShoppingBag,
  Package,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useJSBProducts } from "@/lib/use-jsblueridge-data"
import { generateText, isGeminiConfigured } from "@/lib/gemini"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(value: number): string {
  return `$${value.toFixed(2)}`
}

function calcMargin(retail: number, wholesale: number): number {
  if (retail === 0) return 0
  return ((retail - wholesale) / retail) * 100
}

function marginBadgeCls(m: number): string {
  if (m > 60) return "bg-emerald-50 text-emerald-700"
  if (m >= 40) return "bg-amber-50 text-amber-700"
  return "bg-red-50 text-red-700"
}

function statColor(m: number): { bg: string; color: string } {
  if (m > 50) return { bg: "rgba(16,185,129,0.1)", color: "#10B981" }
  if (m > 35) return { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" }
  return { bg: "rgba(239,68,68,0.1)", color: "#EF4444" }
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function PricingSkeleton() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-24 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 h-28" />
        ))}
      </div>
      <div className="rounded-md border bg-card h-96" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBlueridgePricingPage() {
  const { products: faireProducts, loading } = useJSBProducts()

  const count = faireProducts.length

  const stats = useMemo(() => {
    if (count === 0)
      return { avgMargin: 0, avgWholesale: 0, avgRetail: 0, totalRetail: 0 }
    const margins = faireProducts.map((p: Row) =>
      calcMargin((p.retail_price_cents ?? 0) / 100, (p.wholesale_price_cents ?? 0) / 100),
    )
    const avgMargin = margins.reduce((s: number, m: number) => s + m, 0) / count
    const avgWholesale =
      faireProducts.reduce((s: number, p: Row) => s + (p.wholesale_price_cents ?? 0), 0) / count / 100
    const avgRetail =
      faireProducts.reduce((s: number, p: Row) => s + (p.retail_price_cents ?? 0), 0) / count / 100
    const totalRetail =
      faireProducts.reduce((s: number, p: Row) => s + (p.retail_price_cents ?? 0), 0) / 100
    return { avgMargin, avgWholesale, avgRetail, totalRetail }
  }, [faireProducts, count])

  type SortKey = "margin" | "price"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("margin")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const sortedProducts = useMemo(() => {
    return [...faireProducts].sort((a: Row, b: Row) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "margin":
          return dir * (calcMargin((a.retail_price_cents ?? 0) / 100, (a.wholesale_price_cents ?? 0) / 100) - calcMargin((b.retail_price_cents ?? 0) / 100, (b.wholesale_price_cents ?? 0) / 100))
        case "price":
          return dir * ((a.wholesale_price_cents ?? 0) - (b.wholesale_price_cents ?? 0))
        default:
          return 0
      }
    })
  }, [faireProducts, sortKey, sortDir])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const allSelected = count > 0 && selected.size === count
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(faireProducts.map((p: Row) => p.id)))
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiVisible, setAiVisible] = useState(false)

  const runAiOptimizer = useCallback(async () => {
    setAiLoading(true)
    setAiVisible(true)
    const lowMargin = faireProducts
      .filter((p: Row) => calcMargin((p.retail_price_cents ?? 0) / 100, (p.wholesale_price_cents ?? 0) / 100) < 50)
      .map((p: Row) => {
        const ws = (p.wholesale_price_cents ?? 0) / 100
        const rt = (p.retail_price_cents ?? 0) / 100
        return `- ${p.name}: WS $${ws.toFixed(2)}, Retail $${rt.toFixed(2)}, margin ${calcMargin(rt, ws).toFixed(1)}%`
      })
      .join("\n")
    const prompt = `You are a wholesale pricing analyst for a Faire marketplace seller. Analyze these low-margin products and provide 3-5 specific pricing recommendations to improve margins while remaining competitive.\n\nLow-margin products:\n${lowMargin || "No low-margin products found."}\n\nFor each recommendation include:\n1. Product name\n2. Current margin\n3. Suggested new wholesale price\n4. Expected new margin\n5. Brief rationale\n\nKeep it concise and actionable.`
    const result = await generateText(prompt)
    setAiResult(result)
    setAiLoading(false)
  }, [faireProducts])

  const distribution = useMemo(() => {
    const high = faireProducts.filter(
      (p: Row) => calcMargin((p.retail_price_cents ?? 0) / 100, (p.wholesale_price_cents ?? 0) / 100) > 60,
    ).length
    const med = faireProducts.filter((p: Row) => {
      const m = calcMargin((p.retail_price_cents ?? 0) / 100, (p.wholesale_price_cents ?? 0) / 100)
      return m >= 40 && m <= 60
    }).length
    const low = faireProducts.filter(
      (p: Row) => calcMargin((p.retail_price_cents ?? 0) / 100, (p.wholesale_price_cents ?? 0) / 100) < 40,
    ).length
    return { high, med, low }
  }, [faireProducts])

  const maxDist = Math.max(distribution.high, distribution.med, distribution.low, 1)

  if (loading) return <PricingSkeleton />

  const marginSc = statColor(stats.avgMargin)
  const statCards = [
    { label: "Avg Margin %", value: `${stats.avgMargin.toFixed(1)}%`, trend: `Across ${count} products`, icon: <TrendingUp className="h-4 w-4" />, bg: marginSc.bg, color: marginSc.color },
    { label: "Avg Wholesale", value: fmt(stats.avgWholesale), trend: "Wholesale average", icon: <DollarSign className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Avg Retail", value: fmt(stats.avgRetail), trend: "Retail average", icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "Total Portfolio Retail Value", value: fmt(stats.totalRetail), trend: `${count} products`, icon: <ShoppingBag className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Pricing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            JS Blueridge wholesale pricing analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAiOptimizer}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            AI Optimize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input accent-primary" />
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left w-10" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Product</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("price")}>
                  <span className="flex items-center justify-end">Wholesale <SortIcon col="price" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Retail</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none" onClick={() => toggleSort("margin")}>
                  <span className="flex items-center justify-center">Margin % <SortIcon col="margin" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Markup</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {faireProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No pricing data found</td>
                </tr>
              ) : (
                sortedProducts.map((p: Row) => {
                  const ws = (p.wholesale_price_cents ?? 0) / 100
                  const rt = (p.retail_price_cents ?? 0) / 100
                  const margin = calcMargin(rt, ws)
                  const markup = ws > 0 ? (rt / ws).toFixed(2) : "0.00"
                  const expanded = expandedRows.has(p.id)

                  return (
                    <Fragment key={p.id}>
                      <tr className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => toggleExpand(p.id)}>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                            <Package className="size-3.5 text-muted-foreground/50" />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <span className="truncate max-w-[250px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm">
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {(() => { try { const parsed = JSON.parse(p.category ?? ""); return parsed?.name ?? p.category } catch { return p.category ?? "--" } })()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-right font-medium">{fmt(ws)}</td>
                        <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{fmt(rt)}</td>
                        <td className="px-4 py-3.5 text-sm text-center">
                          <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${marginBadgeCls(margin)}`}>{margin.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-center text-muted-foreground font-medium">{markup}x</td>
                        <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{p.total_inventory ?? 0}</td>
                      </tr>
                      {expanded && (
                        <tr className="bg-muted/10">
                          <td colSpan={9} className="px-8 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div><p className="text-xs text-muted-foreground">Variants</p><p className="font-medium">{p.variant_count ?? 0}</p></div>
                              <div><p className="text-xs text-muted-foreground">Min Order Qty</p><p className="font-medium">{p.minimum_order_quantity ?? 0}</p></div>
                              <div><p className="text-xs text-muted-foreground">Made In</p><p className="font-medium">{p.made_in_country ?? "--"}</p></div>
                              <div><p className="text-xs text-muted-foreground">Sale State</p><p className="font-medium">{p.sale_state ?? "--"}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {aiVisible && (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Pricing Recommendations</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Powered by Gemini</p>
            </div>
            <button onClick={runAiOptimizer} disabled={aiLoading} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Sparkles className="h-3.5 w-3.5" />
              Analyze Margins
            </button>
          </div>
          {aiLoading ? (
            <div className="h-32 rounded-md bg-muted animate-pulse" />
          ) : aiResult ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-wrap leading-relaxed text-foreground">{aiResult}</div>
          ) : null}
        </div>
      )}

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
        <h3 className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-4">Margin Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 shrink-0">High (&gt;60%)</span>
            <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(distribution.high / maxDist) * 100}%` }} />
            </div>
            <span className="text-sm font-bold w-10 text-right shrink-0">{distribution.high}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 shrink-0">Medium (40-60%)</span>
            <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(distribution.med / maxDist) * 100}%` }} />
            </div>
            <span className="text-sm font-bold w-10 text-right shrink-0">{distribution.med}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 shrink-0">Low (&lt;40%)</span>
            <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(distribution.low / maxDist) * 100}%` }} />
            </div>
            <span className="text-sm font-bold w-10 text-right shrink-0">{distribution.low}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">Showing {faireProducts.length} products</p>
    </div>
  )
}
