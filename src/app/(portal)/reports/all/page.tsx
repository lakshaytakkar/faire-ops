"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FileBarChart, Plus, Calendar, Clock, Loader2, X, CheckCircle, Timer, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"

interface Report {
  id: string
  title: string
  report_type: string
  period_start: string
  period_end: string
  summary: string | null
  generated_by: string
  status: string
  store_id: string | null
  created_at: string
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  daily: { label: "Daily", cls: "bg-blue-50 text-blue-700" },
  weekly: { label: "Weekly", cls: "bg-purple-50 text-purple-700" },
  monthly: { label: "Monthly", cls: "bg-emerald-50 text-emerald-700" },
  custom: { label: "Custom", cls: "bg-amber-50 text-amber-700" },
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  published: { label: "Published", cls: "bg-emerald-50 text-emerald-700" },
  archived: { label: "Archived", cls: "bg-slate-100 text-slate-500" },
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return start === end ? e : `${s} - ${e}`
}

type TabKey = "all" | "daily" | "weekly" | "monthly" | "custom"

export default function ReportsPage() {
  const router = useRouter()
  const { stores } = useBrandFilter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [showGenerate, setShowGenerate] = useState(false)
  const [genType, setGenType] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [genStoreId, setGenStoreId] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("reports")
      .select("id, title, report_type, period_start, period_end, summary, generated_by, status, store_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
    if (!error && data) setReports(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const filteredReports = activeTab === "all" ? reports : reports.filter((r) => r.report_type === activeTab)

  const thisMonth = reports.filter((r) => {
    const d = new Date(r.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const latestDate = reports.length > 0 ? formatDate(reports[0].created_at) : "—"

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_type: genType, store_id: genStoreId || undefined }),
      })
      if (res.ok) {
        const { report } = await res.json()
        setShowGenerate(false)
        await fetchReports()
        if (report?.id) router.push(`/reports/${report.id}`)
      }
    } catch (e) {
      console.error("Generate error:", e)
    } finally {
      setGenerating(false)
    }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "custom", label: "Custom" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Automated and custom business reports</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Generate Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-bold font-heading mt-2">{reports.length}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold font-heading mt-2">{thisMonth}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Latest Report</p>
            <p className="text-2xl font-bold font-heading mt-2">{latestDate}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileBarChart className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reports found</p>
            <p className="text-xs mt-1">Generate your first report to get started.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const typeBadge = TYPE_BADGE[report.report_type] ?? TYPE_BADGE.custom
            const statusBadge = STATUS_BADGE[report.status] ?? STATUS_BADGE.draft
            return (
              <div
                key={report.id}
                onClick={() => router.push(`/reports/${report.id}`)}
                className="rounded-md border bg-card px-5 py-4 hover:shadow-sm cursor-pointer flex items-center justify-between transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{report.title}</span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${typeBadge.cls}`}>
                      {typeBadge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPeriod(report.period_start, report.period_end)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">{report.generated_by}</span>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${statusBadge.cls}`}>
                    {statusBadge.label}
                  </span>
                  <span className="w-24 text-right">{formatDate(report.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Scheduled Reports */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 mt-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Zap className="size-4 text-amber-500" />
          Scheduled Reports
        </h3>
        <div className="space-y-2">
          {[
            { label: "Daily Report", schedule: "Every day at 6:00 PM", active: true, icon: Clock },
            { label: "Weekly Report", schedule: "Every Monday at 9:00 AM", active: true, icon: Calendar },
            { label: "Monthly Report", schedule: "1st of each month at 9:00 AM", active: true, icon: Timer },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded bg-muted/30">
              <div className="flex items-center gap-2.5">
                <item.icon className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.schedule}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle className="size-3.5" />
                Active
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Dialog (overlay) */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button onClick={() => setShowGenerate(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
            <h2 className="text-lg font-semibold mb-1">Generate Report</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Create a new report based on real-time Faire data.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Report Type</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as "daily" | "weekly" | "monthly")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="daily">Daily Report (today)</option>
                  <option value="weekly">Weekly Report (last 7 days)</option>
                  <option value="monthly">Monthly Report (last 30 days)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Store (optional)</label>
                <select
                  value={genStoreId}
                  onChange={(e) => setGenStoreId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Stores</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileBarChart className="size-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
