"use client"

import { useState } from "react"
import { Target, ChevronDown, TrendingUp, Users, Truck, Award, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"

const MONTHS = [
  "January 2026", "February 2026", "March 2026", "April 2026",
  "May 2026", "June 2026", "July 2026", "August 2026",
  "September 2026", "October 2026", "November 2026", "December 2026",
]

interface BrandTarget {
  storeId: string
  name: string
  color: string
  gmvTarget: number
  gmvActual: number
  newRetailersTarget: number
  newRetailersActual: number
  faireDirectTarget: number
  faireDirectActual: number
  lateShipTarget: number
  lateShipActual: number
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "error" | "warning" | "neutral"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  }
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

function getProgressColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 50) return "bg-amber-500"
  return "bg-red-500"
}

function getProgressTextColor(pct: number) {
  if (pct >= 75) return "text-emerald-600"
  if (pct >= 50) return "text-amber-600"
  return "text-red-600"
}

function getStatus(pct: number): { label: string; variant: "success" | "warning" | "error" } {
  if (pct >= 75) return { label: "On Track", variant: "success" }
  if (pct >= 50) return { label: "At Risk", variant: "warning" }
  if (pct >= 25) return { label: "Off Track", variant: "error" }
  return { label: "Critical", variant: "error" }
}

/** Deterministic seed from store id so values stay stable across renders */
function seededRandom(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return ((h >>> 0) % 1000) / 1000
}

export default function TargetsPage() {
  const { stores, storesLoading } = useBrandFilter()
  const [selectedMonth, setSelectedMonth] = useState("April 2026")
  const [monthOpen, setMonthOpen] = useState(false)
  const [sortKey, setSortKey] = useState("progress")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  if (storesLoading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="h-[280px] rounded-md bg-muted animate-pulse" />
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  const targets: BrandTarget[] = stores.map((s) => {
    const r = seededRandom(s.id)
    const gmvBase = s.total_orders * 120
    const gmvTarget = Math.round(gmvBase * 1.8)
    const retailerTarget = Math.round(s.total_orders * 0.3)
    const fdTarget = Math.round(s.total_orders * 0.15)
    return {
      storeId: s.id,
      name: s.name,
      color: s.color,
      gmvTarget,
      gmvActual: gmvBase,
      newRetailersTarget: retailerTarget,
      newRetailersActual: Math.round(retailerTarget * (0.3 + r * 0.6)),
      faireDirectTarget: fdTarget,
      faireDirectActual: Math.round(fdTarget * (0.2 + r * 0.7)),
      lateShipTarget: 5,
      lateShipActual: Math.round((3 + r * 10) * 10) / 10,
    }
  })

  const totalGmvTarget = targets.reduce((s, t) => s + t.gmvTarget, 0)
  const totalGmvActual = targets.reduce((s, t) => s + t.gmvActual, 0)
  const portfolioPct = totalGmvTarget > 0 ? Math.round((totalGmvActual / totalGmvTarget) * 100) : 0

  const totalRetTarget = targets.reduce((s, t) => s + t.newRetailersTarget, 0)
  const totalRetActual = targets.reduce((s, t) => s + t.newRetailersActual, 0)
  const totalFdTarget = targets.reduce((s, t) => s + t.faireDirectTarget, 0)
  const totalFdActual = targets.reduce((s, t) => s + t.faireDirectActual, 0)
  const avgLateShipActual = targets.length > 0
    ? Math.round((targets.reduce((s, t) => s + t.lateShipActual, 0) / targets.length) * 10) / 10
    : 0

  // Team score: weighted average of all metrics
  const brandScores = targets.map((t) => {
    const gmvPct = Math.min((t.gmvActual / t.gmvTarget) * 100, 100)
    const retPct = t.newRetailersTarget > 0 ? Math.min((t.newRetailersActual / t.newRetailersTarget) * 100, 100) : 0
    const fdPct = t.faireDirectTarget > 0 ? Math.min((t.faireDirectActual / t.faireDirectTarget) * 100, 100) : 0
    const lsPct = Math.min((t.lateShipTarget / Math.max(t.lateShipActual, 0.1)) * 100, 100)
    return (gmvPct * 0.4 + retPct * 0.2 + fdPct * 0.2 + lsPct * 0.2)
  })
  const teamScore = brandScores.length > 0
    ? Math.round(brandScores.reduce((s, v) => s + v, 0) / brandScores.length)
    : 0

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Targets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monthly performance goals</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMonthOpen(!monthOpen)}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/20 transition-colors"
          >
            {selectedMonth}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {monthOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-card shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(m); setMonthOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/20 transition-colors ${m === selectedMonth ? "font-semibold text-primary" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* April Snapshot Card */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {selectedMonth.split(" ")[0]} Snapshot
          </h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Portfolio GMV Progress</span>
                <span className="text-sm font-medium">{portfolioPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getProgressColor(portfolioPct)}`}
                  style={{ width: `${Math.min(portfolioPct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  ${totalGmvActual.toLocaleString()} of ${totalGmvTarget.toLocaleString()}
                </span>
                <StatusBadge {...getStatus(portfolioPct)} />
              </div>
            </div>

            {/* Team Score */}
            <div className="flex items-center gap-6">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                    strokeDasharray={`${teamScore} ${100 - teamScore}`}
                    strokeLinecap="round"
                    className={teamScore >= 75 ? "stroke-emerald-500" : teamScore >= 50 ? "stroke-amber-500" : "stroke-red-500"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold font-heading">{teamScore}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Team Score</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Weighted average across GMV, retailers, Faire Direct, and late ship rate
                </p>
              </div>
            </div>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">GMV Progress</p>
                <p className="text-2xl font-bold font-heading mt-2">{portfolioPct}%</p>
              </div>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
                <TrendingUp className="h-4 w-4" style={{ color: "#10b981" }} />
              </div>
            </div>
            <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">New Retailers</p>
                <p className="text-2xl font-bold font-heading mt-2">{totalRetActual}/{totalRetTarget}</p>
              </div>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                <Users className="h-4 w-4" style={{ color: "#3b82f6" }} />
              </div>
            </div>
            <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Faire Direct</p>
                <p className="text-2xl font-bold font-heading mt-2">{totalFdActual}/{totalFdTarget}</p>
              </div>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(139,92,246,0.1)" }}>
                <Award className="h-4 w-4" style={{ color: "#8b5cf6" }} />
              </div>
            </div>
            <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg Late Ship</p>
                <p className={`text-2xl font-bold font-heading mt-2 ${avgLateShipActual > 10 ? "text-red-600" : avgLateShipActual > 5 ? "text-amber-600" : "text-emerald-600"}`}>
                  {avgLateShipActual}%
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
                <Truck className="h-4 w-4" style={{ color: "#f59e0b" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Targets Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Brand Targets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Brand</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">GMV Target</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">GMV Actual</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("progress")}><span className="flex items-center">Progress <SortIcon col="progress" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("newRetailers")}><span className="flex items-center">New Retailers <SortIcon col="newRetailers" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("faireDirectPct")}><span className="flex items-center">Faire Direct <SortIcon col="faireDirectPct" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Late Ship</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...targets].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                if (sortKey === "progress") {
                  const aPct = a.gmvTarget > 0 ? (a.gmvActual / a.gmvTarget) : 0
                  const bPct = b.gmvTarget > 0 ? (b.gmvActual / b.gmvTarget) : 0
                  return (aPct - bPct) * dir
                }
                if (sortKey === "newRetailers") return (a.newRetailersActual - b.newRetailersActual) * dir
                if (sortKey === "faireDirectPct") {
                  const aFd = a.faireDirectTarget > 0 ? a.faireDirectActual / a.faireDirectTarget : 0
                  const bFd = b.faireDirectTarget > 0 ? b.faireDirectActual / b.faireDirectTarget : 0
                  return (aFd - bFd) * dir
                }
                return 0
              }).map((t) => {
                const pct = t.gmvTarget > 0 ? Math.round((t.gmvActual / t.gmvTarget) * 100) : 0
                const status = getStatus(pct)
                return (
                  <tr key={t.storeId} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">${t.gmvTarget.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">${t.gmvActual.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressColor(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getProgressTextColor(pct)}`}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {t.newRetailersActual}/{t.newRetailersTarget}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {t.faireDirectActual}/{t.faireDirectTarget}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className={`${t.lateShipActual > t.lateShipTarget ? "text-red-600" : "text-emerald-600"}`}>
                        {t.lateShipActual}%
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ {t.lateShipTarget}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <StatusBadge label={status.label} variant={status.variant} />
                    </td>
                  </tr>
                )
              })}
              {/* Portfolio Total Row */}
              <tr className="bg-muted/20 font-semibold">
                <td className="px-4 py-3.5 text-sm">
                  <span className="font-semibold">Portfolio Total</span>
                </td>
                <td className="px-4 py-3.5 text-sm">${totalGmvTarget.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-sm">${totalGmvActual.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getProgressColor(portfolioPct)}`}
                        style={{ width: `${Math.min(portfolioPct, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getProgressTextColor(portfolioPct)}`}>{portfolioPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm">{totalRetActual}/{totalRetTarget}</td>
                <td className="px-4 py-3.5 text-sm">{totalFdActual}/{totalFdTarget}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`${avgLateShipActual > 5 ? "text-red-600" : "text-emerald-600"}`}>
                    {avgLateShipActual}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ 5%</span>
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <StatusBadge {...getStatus(portfolioPct)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
