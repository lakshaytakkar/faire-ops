"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
import { MapPin, Building2, Globe, Trophy, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabase } from "@/lib/supabase"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
const STATE_PAGE_SIZE = 20
const CITY_PAGE_SIZE = 15

const COUNTRY_CODES: Record<string, string> = {
  "United States": "US", "USA": "US", "US": "US",
  "Canada": "CA", "United Kingdom": "GB", "UK": "GB",
  "Australia": "AU", "Germany": "DE", "France": "FR",
  "Japan": "JP", "India": "IN", "China": "CN",
  "Mexico": "MX", "Brazil": "BR", "Italy": "IT",
  "Spain": "ES", "Netherlands": "NL", "Sweden": "SE",
  "Norway": "NO", "Denmark": "DK", "Finland": "FI",
  "Switzerland": "CH", "Austria": "AT", "Belgium": "BE",
  "Ireland": "IE", "New Zealand": "NZ", "South Korea": "KR",
  "Singapore": "SG", "Hong Kong": "HK", "Taiwan": "TW",
  "Portugal": "PT", "Poland": "PL", "Czech Republic": "CZ",
  "Israel": "IL", "South Africa": "ZA", "Argentina": "AR",
  "Chile": "CL", "Colombia": "CO", "Peru": "PE",
  "Philippines": "PH", "Thailand": "TH", "Malaysia": "MY",
  "Indonesia": "ID", "Vietnam": "VN", "Turkey": "TR",
  "Greece": "GR", "Romania": "RO", "Hungary": "HU",
  "Croatia": "HR", "Slovakia": "SK", "Slovenia": "SI",
  "Latvia": "LV", "Lithuania": "LT", "Estonia": "EE",
  "Iceland": "IS", "Luxembourg": "LU", "Malta": "MT",
  "Cyprus": "CY", "Bulgaria": "BG", "Serbia": "RS",
  "Ukraine": "UA", "Russia": "RU", "Egypt": "EG",
  "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH",
  "Morocco": "MA", "Tunisia": "TN", "Saudi Arabia": "SA",
  "UAE": "AE", "United Arab Emirates": "AE", "Qatar": "QA",
  "Kuwait": "KW", "Bahrain": "BH", "Oman": "OM",
  "Pakistan": "PK", "Bangladesh": "BD", "Sri Lanka": "LK",
  "Nepal": "NP", "Myanmar": "MM", "Cambodia": "KH",
  "Laos": "LA",
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderRow {
  shipping_address: Record<string, unknown> | null
  total_cents: number
  store_id: string
}

interface CityAgg {
  orders: number
  revenue: number
}

interface StateAgg {
  orders: number
  revenue: number
  cities: Record<string, CityAgg>
}

type TabView = "state" | "city"
type StateSortField = "rank" | "state" | "orders" | "revenue" | "cities" | "avgOrder" | "share"
type CitySortField = "city" | "state" | "orders" | "revenue" | "avgOrder"
type SortDirection = "asc" | "desc"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return `$${dollars.toFixed(0)}`
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "\u{1F310}"
  return countryCode
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
}

function getCountryCode(name: string): string {
  return COUNTRY_CODES[name] || COUNTRY_CODES[name.toUpperCase()] || ""
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortableHeader<F extends string>({
  field,
  label,
  align = "left",
  currentField,
  currentDir,
  onClick,
}: {
  field: F
  label: string
  align?: "left" | "right"
  currentField: F
  currentDir: SortDirection
  onClick: (f: F) => void
}) {
  return (
    <th
      className={`px-3 py-2 text-[11px] font-medium text-muted-foreground tracking-wide uppercase cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onClick(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {currentField === field && (
          <ArrowUpDown className="size-3" />
        )}
      </span>
    </th>
  )
}

function Pagination({ page, pageCount, setPage }: { page: number; pageCount: number; setPage: (p: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t">
      <p className="text-xs text-muted-foreground">
        Page {page + 1} of {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="inline-flex items-center justify-center h-7 w-7 rounded border text-xs disabled:opacity-40 hover:bg-muted cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => {
          const pageNum = pageCount <= 7 ? i : (
            page < 4 ? i :
            page > pageCount - 5 ? pageCount - 7 + i :
            page - 3 + i
          )
          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-medium cursor-pointer transition-colors ${
                page === pageNum ? "bg-primary text-white" : "border hover:bg-muted"
              }`}
            >
              {pageNum + 1}
            </button>
          )
        })}
        <button
          onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
          disabled={page === pageCount - 1}
          className="inline-flex items-center justify-center h-7 w-7 rounded border text-xs disabled:opacity-40 hover:bg-muted cursor-pointer transition-colors"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function GeographyAnalyticsPage() {
  const { activeBrand, storesLoading } = useBrandFilter()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [tabView, setTabView] = useState<TabView>("state")
  const [expandedState, setExpandedState] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number; orders: number } | null>(null)

  // State table sort
  const [stateSort, setStateSort] = useState<StateSortField>("orders")
  const [stateSortDir, setStateSortDir] = useState<SortDirection>("desc")

  // City table sort + pagination
  const [citySort, setCitySort] = useState<CitySortField>("orders")
  const [citySortDir, setCitySortDir] = useState<SortDirection>("desc")
  const [cityPage, setCityPage] = useState(0)

  /* ---- Fetch all orders with batching ---- */
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const batchSize = 1000
      const all: OrderRow[] = []
      let from = 0
      let hasMore = true
      while (hasMore) {
        const { data } = await supabase
          .from("faire_orders")
          .select("shipping_address, total_cents, store_id")
          .range(from, from + batchSize - 1)
        if (data && data.length > 0) {
          all.push(...(data as OrderRow[]))
          from += batchSize
          if (data.length < batchSize) hasMore = false
        } else {
          hasMore = false
        }
      }
      setOrders(all)
      setLoading(false)
    }
    fetchAll()
  }, [])

  /* ---- Filter by store if brand selected ---- */
  const filteredOrders = useMemo(() => {
    if (activeBrand === "all") return orders
    return orders.filter((o) => o.store_id === activeBrand)
  }, [orders, activeBrand])

  /* ---- Compute aggregates ---- */
  const { stateData, internationalOrders } = useMemo(() => {
    const sd: Record<string, StateAgg> = {}
    const intl: Record<string, { orders: number; revenue: number }> = {}

    for (const order of filteredOrders) {
      const addr = order.shipping_address as Record<string, unknown> | null
      if (!addr) continue

      const country = (addr.country as string) || "US"
      const state = (addr.state as string) || (addr.state_code as string) || "Unknown"
      const city = (addr.city as string) || "Unknown"

      const isUS = country === "US" || country === "United States" || country === "USA"

      if (isUS) {
        if (!sd[state]) sd[state] = { orders: 0, revenue: 0, cities: {} }
        sd[state].orders++
        sd[state].revenue += order.total_cents ?? 0
        if (!sd[state].cities[city]) sd[state].cities[city] = { orders: 0, revenue: 0 }
        sd[state].cities[city].orders++
        sd[state].cities[city].revenue += order.total_cents ?? 0
      } else {
        if (!intl[country]) intl[country] = { orders: 0, revenue: 0 }
        intl[country].orders++
        intl[country].revenue += order.total_cents ?? 0
      }
    }

    return { stateData: sd, internationalOrders: intl }
  }, [filteredOrders])

  /* ---- Derived stats ---- */
  const maxOrders = useMemo(() => {
    let m = 0
    for (const s of Object.values(stateData)) {
      if (s.orders > m) m = s.orders
    }
    return m || 1
  }, [stateData])

  const totalStates = Object.keys(stateData).length
  const totalCities = useMemo(() => {
    const all = new Set<string>()
    for (const s of Object.values(stateData)) {
      for (const c of Object.keys(s.cities)) all.add(c)
    }
    return all.size
  }, [stateData])

  const domesticRevenue = useMemo(
    () => Object.values(stateData).reduce((s, d) => s + d.revenue, 0),
    [stateData],
  )

  const intlRevenue = useMemo(
    () => Object.values(internationalOrders).reduce((s, d) => s + d.revenue, 0),
    [internationalOrders],
  )

  const totalRevenue = domesticRevenue + intlRevenue

  const topStateName = useMemo(() => {
    let best = ""
    let bestOrders = 0
    for (const [name, d] of Object.entries(stateData)) {
      if (d.orders > bestOrders) {
        bestOrders = d.orders
        best = name
      }
    }
    return best || "--"
  }, [stateData])

  const intlCountryCount = Object.keys(internationalOrders).length

  /* ---- State rankings (top 20) ---- */
  const stateRankings = useMemo(() => {
    const entries = Object.entries(stateData).map(([name, d]) => ({
      name,
      orders: d.orders,
      revenue: d.revenue,
      cities: Object.keys(d.cities).length,
      avgOrder: d.orders > 0 ? d.revenue / d.orders : 0,
      share: domesticRevenue > 0 ? (d.revenue / domesticRevenue) * 100 : 0,
    }))

    entries.sort((a, b) => b.orders - a.orders)
    const ranked = entries.slice(0, STATE_PAGE_SIZE).map((e, i) => ({ ...e, rank: i + 1 }))

    const dir = stateSortDir === "asc" ? 1 : -1
    ranked.sort((a, b) => {
      switch (stateSort) {
        case "rank": return dir * (a.rank - b.rank)
        case "state": return dir * a.name.localeCompare(b.name)
        case "orders": return dir * (a.orders - b.orders)
        case "revenue": return dir * (a.revenue - b.revenue)
        case "cities": return dir * (a.cities - b.cities)
        case "avgOrder": return dir * (a.avgOrder - b.avgOrder)
        case "share": return dir * (a.share - b.share)
        default: return 0
      }
    })

    return ranked
  }, [stateData, stateSort, stateSortDir, domesticRevenue])

  /* ---- City list (top 30) ---- */
  const cityList = useMemo(() => {
    const entries: { city: string; state: string; orders: number; revenue: number; avgOrder: number }[] = []
    for (const [stateName, sd] of Object.entries(stateData)) {
      for (const [cityName, cd] of Object.entries(sd.cities)) {
        entries.push({
          city: cityName,
          state: stateName,
          orders: cd.orders,
          revenue: cd.revenue,
          avgOrder: cd.orders > 0 ? cd.revenue / cd.orders : 0,
        })
      }
    }
    entries.sort((a, b) => b.orders - a.orders)
    const top30 = entries.slice(0, 30)

    const dir = citySortDir === "asc" ? 1 : -1
    top30.sort((a, b) => {
      switch (citySort) {
        case "city": return dir * a.city.localeCompare(b.city)
        case "state": return dir * a.state.localeCompare(b.state)
        case "orders": return dir * (a.orders - b.orders)
        case "revenue": return dir * (a.revenue - b.revenue)
        case "avgOrder": return dir * (a.avgOrder - b.avgOrder)
        default: return 0
      }
    })

    return top30
  }, [stateData, citySort, citySortDir])

  const cityPageCount = Math.ceil(cityList.length / CITY_PAGE_SIZE)
  const cityPageItems = cityList.slice(cityPage * CITY_PAGE_SIZE, (cityPage + 1) * CITY_PAGE_SIZE)

  /* ---- International orders list ---- */
  const intlList = useMemo(() => {
    return Object.entries(internationalOrders)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.orders - a.orders)
  }, [internationalOrders])

  /* ---- Top 5 states for mini leaderboard ---- */
  const top5States = useMemo(() => {
    return Object.entries(stateData)
      .map(([name, d]) => ({ name, orders: d.orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
  }, [stateData])

  const top5Max = top5States.length > 0 ? top5States[0].orders : 1

  /* ---- Sort handlers ---- */
  function handleStateSort(field: StateSortField) {
    if (stateSort === field) {
      setStateSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setStateSort(field)
      setStateSortDir("desc")
    }
  }

  function handleCitySort(field: CitySortField) {
    if (citySort === field) {
      setCitySortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setCitySort(field)
      setCitySortDir("desc")
    }
    setCityPage(0)
  }

  /* ---- Tooltip handlers ---- */
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, stateName: string) => {
      const data = stateData[stateName]
      setTooltip({
        name: stateName,
        x: e.clientX,
        y: e.clientY,
        orders: data?.orders ?? 0,
      })
    },
    [stateData],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  /* ---- Inline expansion: get top 5 cities for a state ---- */
  function getTopCitiesForState(stateName: string) {
    const cities = stateData[stateName]?.cities ?? {}
    return Object.entries(cities)
      .map(([name, d]) => ({ name, orders: d.orders, revenue: d.revenue }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
  }

  /* ================================================================ */
  /*  Loading skeleton                                                 */
  /* ================================================================ */

  if (loading || storesLoading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-[400px] rounded-md" />
            <Skeleton className="h-48 rounded-md" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[280px] rounded-md" />
            <Skeleton className="h-48 rounded-md" />
            <Skeleton className="h-24 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  Stats cards                                                      */
  /* ================================================================ */

  const STATS = [
    {
      label: "States Active",
      value: totalStates.toLocaleString(),
      sub: "With orders",
      icon: MapPin,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Cities Reached",
      value: totalCities.toLocaleString(),
      sub: "Unique cities",
      icon: Building2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Top State",
      value: topStateName,
      sub: stateData[topStateName] ? `${stateData[topStateName].orders.toLocaleString()} orders` : "N/A",
      icon: Trophy,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "International",
      value: intlCountryCount > 0 ? `${intlCountryCount} ${intlCountryCount === 1 ? "country" : "countries"}` : "0",
      sub: intlCountryCount > 0 ? `${Object.values(internationalOrders).reduce((s, d) => s + d.orders, 0)} orders` : "Domestic only",
      icon: Globe,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ]

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Geographic Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sales distribution by state, city, and country
        </p>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-md border bg-card p-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold font-heading mt-1">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`size-3.5 ${s.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ---- Main Layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ========== Left Column ========== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: State / City Performance */}
          <div className="rounded-md border bg-card overflow-hidden">
            {/* Tab pills */}
            <div className="px-3 py-2.5 border-b flex items-center gap-2">
              <button
                onClick={() => { setTabView("state"); setCityPage(0) }}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  tabView === "state" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                State
              </button>
              <button
                onClick={() => { setTabView("city"); setCityPage(0) }}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                  tabView === "city" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                City
              </button>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {tabView === "state" ? `Top ${STATE_PAGE_SIZE}` : `Top 30`}
              </span>
            </div>

            {/* State view */}
            {tabView === "state" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <SortableHeader field="rank" label="#" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="state" label="State" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="orders" label="Orders" align="right" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="revenue" label="Revenue ($)" align="right" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="avgOrder" label="Avg Order" align="right" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="cities" label="Cities" align="right" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                      <SortableHeader field="share" label="Share %" align="right" currentField={stateSort} currentDir={stateSortDir} onClick={handleStateSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {stateRankings.map((s) => {
                      const isExpanded = expandedState === s.name
                      const topCities = isExpanded ? getTopCitiesForState(s.name) : []
                      return (
                        <Fragment key={s.name}>
                          <tr
                            className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer ${isExpanded ? "bg-muted/10" : ""}`}
                            onClick={() => setExpandedState(isExpanded ? null : s.name)}
                          >
                            <td className="px-3 py-2.5 text-sm tabular-nums text-muted-foreground">{s.rank}</td>
                            <td className="px-3 py-2.5 text-sm font-medium text-primary">
                              <span className="inline-flex items-center gap-1">
                                {s.name}
                                {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3 opacity-40" />}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-right tabular-nums">{s.orders.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-sm text-right tabular-nums">{formatCurrency(s.revenue)}</td>
                            <td className="px-3 py-2.5 text-sm text-right tabular-nums">{formatCurrency(s.avgOrder)}</td>
                            <td className="px-3 py-2.5 text-sm text-right tabular-nums">{s.cities.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-sm text-right tabular-nums">{s.share.toFixed(1)}%</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/10">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Top cities in {s.name}</p>
                                  {topCities.length > 0 ? topCities.map(city => (
                                    <div key={city.name} className="flex items-center justify-between text-xs py-1">
                                      <span>{city.name}</span>
                                      <span className="text-muted-foreground">{city.orders} orders &middot; {formatCurrency(city.revenue)}</span>
                                    </div>
                                  )) : (
                                    <p className="text-xs text-muted-foreground">No city data.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                    {stateRankings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                          No state data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* City view */}
            {tabView === "city" && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <SortableHeader field="city" label="City" currentField={citySort} currentDir={citySortDir} onClick={handleCitySort} />
                        <SortableHeader field="state" label="State" currentField={citySort} currentDir={citySortDir} onClick={handleCitySort} />
                        <SortableHeader field="orders" label="Orders" align="right" currentField={citySort} currentDir={citySortDir} onClick={handleCitySort} />
                        <SortableHeader field="revenue" label="Revenue ($)" align="right" currentField={citySort} currentDir={citySortDir} onClick={handleCitySort} />
                        <SortableHeader field="avgOrder" label="Avg Order" align="right" currentField={citySort} currentDir={citySortDir} onClick={handleCitySort} />
                      </tr>
                    </thead>
                    <tbody>
                      {cityPageItems.map((c) => (
                        <tr key={`${c.city}-${c.state}`} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 text-sm font-medium">{c.city}</td>
                          <td className="px-3 py-2.5 text-sm text-muted-foreground">{c.state}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">{c.orders.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">{formatCurrency(c.revenue)}</td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">{formatCurrency(c.avgOrder)}</td>
                        </tr>
                      ))}
                      {cityPageItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                            No city data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination page={cityPage} pageCount={cityPageCount} setPage={setCityPage} />
              </>
            )}
          </div>

          {/* Section 2: International Orders */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-3 py-2.5 border-b flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">International</h2>
              {intlList.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {intlList.length}
                </span>
              )}
            </div>
            <div>
              {intlList.length > 0 ? (
                intlList.map((c) => {
                  const code = getCountryCode(c.name)
                  const flag = countryFlag(code)
                  return (
                    <div key={c.name} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-lg bg-muted/30 shrink-0">
                        {flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{c.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm tabular-nums">{c.orders.toLocaleString()} orders</span>
                        <span className="text-muted-foreground text-xs ml-2 tabular-nums">{formatCurrency(c.revenue)}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">All orders are domestic (US)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== Right Column ========== */}
        <div className="space-y-4">
          {/* Widget 1: US Map (compact) */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b">
              <h3 className="text-sm font-semibold">US Heatmap</h3>
            </div>
            <div className="h-[280px] relative">
              <ComposableMap
                projection="geoAlbersUsa"
                className="w-full h-full"
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string } }> }) =>
                    geographies.map((geo) => {
                      const stateName = geo.properties.name
                      const data = stateData[stateName]
                      const intensity = data ? Math.min(data.orders / maxOrders, 1) : 0
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => {
                            setExpandedState(expandedState === stateName ? null : stateName)
                            setTabView("state")
                          }}
                          onMouseEnter={(e: React.MouseEvent) => handleMouseEnter(e, stateName)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            default: {
                              fill: intensity > 0
                                ? `hsl(223, 83%, ${80 - intensity * 50}%)`
                                : "#e2e8f0",
                              stroke: "#fff",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                            hover: {
                              fill: "hsl(223, 83%, 53%)",
                              stroke: "#fff",
                              strokeWidth: 1,
                              outline: "none",
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: "hsl(223, 83%, 40%)",
                              outline: "none",
                            },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>

              {/* Tiny legend */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded border bg-card/90 backdrop-blur-sm px-2 py-1 shadow-sm">
                <span className="text-[9px] text-muted-foreground">0</span>
                <div className="flex h-2">
                  <div className="w-4 rounded-l" style={{ backgroundColor: "#e2e8f0" }} />
                  <div className="w-4" style={{ backgroundColor: "hsl(223, 83%, 75%)" }} />
                  <div className="w-4" style={{ backgroundColor: "hsl(223, 83%, 62%)" }} />
                  <div className="w-4" style={{ backgroundColor: "hsl(223, 83%, 49%)" }} />
                  <div className="w-4 rounded-r" style={{ backgroundColor: "hsl(223, 83%, 30%)" }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{maxOrders.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Top 5 States mini leaderboard */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b">
              <h3 className="text-sm font-semibold">Top States</h3>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {top5States.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 py-1.5">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <span className="text-xs font-medium w-24 truncate shrink-0">{s.name}</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded transition-all duration-500"
                      style={{ width: `${(s.orders / top5Max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-10 text-right shrink-0">
                    {s.orders.toLocaleString()}
                  </span>
                </div>
              ))}
              {top5States.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No data.</p>
              )}
            </div>
          </div>

          {/* Widget 3: Revenue Split */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b">
              <h3 className="text-sm font-semibold">Revenue Split</h3>
            </div>
            <div className="px-3 py-3 space-y-2.5">
              {intlRevenue > 0 ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Domestic</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {totalRevenue > 0 ? ((domesticRevenue / totalRevenue) * 100).toFixed(1) : "0"}% &middot; {formatCompact(domesticRevenue)}
                      </span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded transition-all duration-500"
                        style={{ width: totalRevenue > 0 ? `${(domesticRevenue / totalRevenue) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">International</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {totalRevenue > 0 ? ((intlRevenue / totalRevenue) * 100).toFixed(1) : "0"}% &middot; {formatCompact(intlRevenue)}
                      </span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded transition-all duration-500"
                        style={{ width: totalRevenue > 0 ? `${(intlRevenue / totalRevenue) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">100% Domestic</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip (portal-style, fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded border bg-card shadow-lg px-2.5 py-1.5"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          <p className="text-xs font-semibold">{tooltip.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {tooltip.orders.toLocaleString()} orders
          </p>
        </div>
      )}
    </div>
  )
}
