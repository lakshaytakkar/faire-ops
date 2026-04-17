"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search, TrendingUp, ListPlus, BarChart3, Play, Package, Plus, X, ExternalLink, Check, ChevronUp, Clock, Radar,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

/* ------------------------------------------------------------------ */
/*  Scraper categories & sources                                       */
/* ------------------------------------------------------------------ */

const SCRAPER_CATEGORIES = ["All Categories", "Home Decor", "Kitchen", "Toys & Games", "Beauty", "Pet Supplies", "Stationery", "Apparel", "Accessories"]
const SCRAPER_SOURCES = ["Minea", "AliExpress", "ToyNetwork", "WonATrading", "Alibaba", "Faire New Arrivals"]

interface ScraperProduct {
  id: string; name: string; source: string; category: string; trendSignal: string
  cogs: number; wsPrice: number; msrp: number; margin: number; signal: "high" | "medium" | "low"
}

const MOCK_SCRAPER_PRODUCTS: ScraperProduct[] = [
  { id: "sp1", name: "Boho Rattan Table Lamp", source: "Minea", category: "Home Decor", trendSignal: "Pinterest +340% MoM", cogs: 8.50, wsPrice: 24.00, msrp: 48.00, margin: 64.6, signal: "high" },
  { id: "sp2", name: "Silicone Kitchen Utensil Set", source: "AliExpress", category: "Kitchen", trendSignal: "TikTok Shop trending", cogs: 4.20, wsPrice: 14.00, msrp: 28.00, margin: 70.0, signal: "high" },
  { id: "sp3", name: "Magnetic Fidget Cube", source: "ToyNetwork", category: "Toys & Games", trendSignal: "Amazon BSR rising", cogs: 3.00, wsPrice: 9.00, msrp: 18.00, margin: 66.7, signal: "medium" },
  { id: "sp4", name: "Vitamin C Glow Serum", source: "Alibaba", category: "Beauty", trendSignal: "Google Trends +120%", cogs: 2.80, wsPrice: 12.00, msrp: 24.00, margin: 76.7, signal: "high" },
  { id: "sp5", name: "Eco Pet Waste Bags (300ct)", source: "WonATrading", category: "Pet Supplies", trendSignal: "Steady demand", cogs: 1.50, wsPrice: 6.00, msrp: 12.00, margin: 75.0, signal: "low" },
  { id: "sp6", name: "Washi Tape Variety Pack", source: "AliExpress", category: "Stationery", trendSignal: "Etsy trending", cogs: 1.80, wsPrice: 7.00, msrp: 14.00, margin: 74.3, signal: "medium" },
  { id: "sp7", name: "Cloud Shape LED Night Light", source: "Minea", category: "Home Decor", trendSignal: "Instagram Reels viral", cogs: 5.00, wsPrice: 16.00, msrp: 32.00, margin: 68.8, signal: "high" },
  { id: "sp8", name: "Bamboo Sunglasses", source: "Alibaba", category: "Accessories", trendSignal: "Seasonal uptick", cogs: 3.50, wsPrice: 12.00, msrp: 24.00, margin: 70.8, signal: "medium" },
]

const SIGNAL_STYLES: Record<string, string> = { high: "bg-amber-50 text-amber-700", medium: "bg-slate-100 text-slate-600", low: "bg-slate-100 text-slate-600" }

const SCRAPE_HISTORY = [
  { date: "Apr 3, 2026", source: "Minea", productsFound: 24, highSignal: 8, status: "completed" as const },
  { date: "Apr 2, 2026", source: "AliExpress", productsFound: 31, highSignal: 11, status: "completed" as const },
  { date: "Apr 1, 2026", source: "ToyNetwork", productsFound: 18, highSignal: 5, status: "completed" as const },
]

const SOURCE_ROTATION = ["Minea", "AliExpress", "ToyNetwork", "WonATrading", "Alibaba", "Faire New Arrivals"]
function getTodaysSource(): string { return SOURCE_ROTATION[new Date().getDay() % SOURCE_ROTATION.length] }

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBlueridgeSourcingPage() {
  const [scraperProducts] = useState<ScraperProduct[]>(MOCK_SCRAPER_PRODUCTS)
  const [sortKey, setSortKey] = useState("margin")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) { if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc") } }
  function SortIcon({ col }: { col: string }) { if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />; return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" /> }

  const [queuedIds, setQueuedIds] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState("All Categories")
  const [source, setSource] = useState("All Sources")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualUrl, setManualUrl] = useState("")
  const [manualCogs, setManualCogs] = useState("")
  const [manualTags, setManualTags] = useState("")

  const filtered = useMemo(() => scraperProducts.filter((p) => {
    if (category !== "All Categories" && p.category !== category) return false
    if (source !== "All Sources" && p.source !== source) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [scraperProducts, category, source, searchQuery])

  const totalFound = scraperProducts.length
  const highSignal = scraperProducts.filter((p) => p.signal === "high").length
  const queued = queuedIds.size
  const avgMargin = totalFound > 0 ? (scraperProducts.reduce((sum, p) => sum + p.margin, 0) / totalFound).toFixed(1) : "0.0"

  function handleRunScrape() { setIsRunning(true); setTimeout(() => setIsRunning(false), 1500) }
  function queueProduct(id: string) { setQueuedIds((prev) => new Set(prev).add(id)) }
  function handleManualAdd() { if (!manualName.trim()) return; queueProduct(`manual-${Date.now()}`); setManualName(""); setManualUrl(""); setManualCogs(""); setManualTags(""); setShowManualForm(false) }
  function handleClearQueue() { setQueuedIds(new Set()) }

  const todaysSource = getTodaysSource()
  const statCards = [
    { label: "Products Found", value: String(totalFound), trend: "From active scrape", icon: <Search className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "High Signal", value: String(highSignal), trend: "Trending products", icon: <TrendingUp className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    { label: "Queued", value: String(queued), trend: "Added to pipeline", icon: <ListPlus className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Avg Margin", value: `${avgMargin}%`, trend: "Across results", icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Sourcing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge product discovery</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm" onClick={() => setShowManualForm((v) => !v)}>
            {showManualForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} Add Manually
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-sm" onClick={handleRunScrape} disabled={isRunning}>
            <Play className="h-3.5 w-3.5" /> {isRunning ? "Scanning..." : "Run Scrape"}
          </Button>
        </div>
      </div>

      {showManualForm && (
        <div className="rounded-md border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Manual Product Import</h3>
            <button onClick={() => setShowManualForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Product Name</label><Input placeholder="e.g. Boho Rattan Lamp" className="h-8 text-sm" value={manualName} onChange={(e) => setManualName(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Source URL</label><Input placeholder="https://..." className="h-8 text-sm" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">COGS Estimate ($)</label><Input type="number" placeholder="0.00" className="h-8 text-sm" value={manualCogs} onChange={(e) => setManualCogs(e.target.value)} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Tags</label><Input placeholder="home, trending" className="h-8 text-sm" value={manualTags} onChange={(e) => setManualTags(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-8 text-sm gap-1.5" onClick={handleManualAdd} disabled={!manualName.trim()}><ListPlus className="h-3.5 w-3.5" /> Add to Queue</Button>
            <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={() => setShowManualForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">{card.label}</p><p className="text-2xl font-bold font-heading mt-2">{card.value}</p><p className="text-xs text-muted-foreground mt-1">{card.trend}</p></div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search products..." className="h-8 w-60 pl-8 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "All Categories")}><SelectTrigger className="h-8 w-44 text-sm"><SelectValue>{category}</SelectValue></SelectTrigger><SelectContent>{SCRAPER_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select>
            <Select value={source} onValueChange={(v) => setSource(v ?? "All Sources")}><SelectTrigger className="h-8 w-40 text-sm"><SelectValue>{source}</SelectValue></SelectTrigger><SelectContent><SelectItem value="All Sources">All Sources</SelectItem>{SCRAPER_SOURCES.map((src) => (<SelectItem key={src} value={src}>{src}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Radar className="h-3.5 w-3.5" /><span>Today&apos;s Source:</span><span className="font-medium text-foreground">{todaysSource}</span></div>
        </div>
        <div className="overflow-auto">
          <table className="w-full">
            <thead><tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Product</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Trend Signal</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">COGS</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("price")}><span className="flex items-center justify-end">WS Price <SortIcon col="price" /></span></th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">MSRP</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("margin")}><span className="flex items-center justify-end">Margin % <SortIcon col="margin" /></span></th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Signal</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Action</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (<tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No products found</td></tr>) : (
                [...filtered].sort((a, b) => { const dir = sortDir === "asc" ? 1 : -1; if (sortKey === "margin") return (a.margin - b.margin) * dir; if (sortKey === "price") return (a.wsPrice - b.wsPrice) * dir; return 0 }).map((product) => {
                  const isQueued = queuedIds.has(product.id)
                  return (
                    <tr key={product.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shrink-0"><Package className="size-3.5 text-amber-400" /></div><div className="flex items-center gap-2"><span className="font-medium">{product.name}</span><span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{product.source}</span></div></div></td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">{product.trendSignal}</td>
                      <td className="px-4 py-3.5 text-sm text-right">${product.cogs.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-right">${product.wsPrice.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-right">${product.msrp.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-right">{product.margin}%</td>
                      <td className="px-4 py-3.5 text-sm text-center"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${SIGNAL_STYLES[product.signal]}`}>{product.signal.charAt(0).toUpperCase() + product.signal.slice(1)}</span></td>
                      <td className="px-4 py-3.5 text-sm text-right">{isQueued ? (<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Check className="h-3 w-3" />Queued</span>) : (<Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => queueProduct(product.id)}>Queue</Button>)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b"><Clock className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Recent Scrapes</h3></div>
        <div className="overflow-auto">
          <table className="w-full"><thead><tr className="border-b bg-muted/40"><th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Date</th><th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Source</th><th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Products Found</th><th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">High Signal</th><th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Status</th></tr></thead>
            <tbody>{SCRAPE_HISTORY.map((entry, i) => (<tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"><td className="px-4 py-3.5 text-sm font-medium">{entry.date}</td><td className="px-4 py-3.5 text-sm text-muted-foreground">{entry.source}</td><td className="px-4 py-3.5 text-sm text-right">{entry.productsFound}</td><td className="px-4 py-3.5 text-sm text-right">{entry.highSignal}</td><td className="px-4 py-3.5 text-sm text-center"><span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Completed</span></td></tr>))}</tbody>
          </table>
        </div>
      </div>

      {queuedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 py-3">
            <p className="text-sm font-medium">{queuedIds.size} product{queuedIds.size !== 1 ? "s" : ""} queued</p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearQueue}>Clear Queue</Button>
              <Link href="/jsblueridge/catalog/publishing-queue" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">View Publishing Queue<ExternalLink className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
