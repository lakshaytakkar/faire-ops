"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmailLog {
  id: string
  template_id: string | null
  to_email: string
  to_name: string | null
  subject: string
  body_html: string
  status: string
  resend_id: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
  sent_at: string
  email_templates?: { name: string } | null
}

const STATUS_OPTIONS = ["all", "sent", "failed", "simulated"]
const PAGE_SIZE = 20

const STATUS_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  sent: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: XCircle },
  simulated: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: Info },
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    setPage(0)
  }, [statusFilter, searchQuery, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [page, statusFilter, searchQuery, dateFrom, dateTo])

  async function fetchLogs() {
    setLoading(true)

    // Count query
    let countQuery = supabase.from("email_logs").select("*", { count: "exact", head: true })
    if (statusFilter !== "all") countQuery = countQuery.eq("status", statusFilter)
    if (searchQuery) countQuery = countQuery.or(`to_email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
    if (dateFrom) countQuery = countQuery.gte("sent_at", new Date(dateFrom).toISOString())
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      countQuery = countQuery.lte("sent_at", end.toISOString())
    }
    const { count } = await countQuery
    setTotal(count ?? 0)

    // Data query
    let query = supabase
      .from("email_logs")
      .select("*, email_templates(name)")
      .order("sent_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (statusFilter !== "all") query = query.eq("status", statusFilter)
    if (searchQuery) query = query.or(`to_email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`)
    if (dateFrom) query = query.gte("sent_at", new Date(dateFrom).toISOString())
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query = query.lte("sent_at", end.toISOString())
    }

    const { data } = await query
    setLogs((data ?? []) as EmailLog[])
    setLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <FileText className="size-6" />
          Email Logs
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Delivery history and tracking
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or subject..."
              className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-8" />
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Template</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Resend ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent At</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">No logs found</td></tr>
                )}
                {logs.map((log) => {
                  const statusStyle = STATUS_STYLES[log.status] ?? STATUS_STYLES.simulated
                  const StatusIcon = statusStyle.icon
                  const isExpanded = expandedId === log.id
                  return (
                    <tr key={log.id} className="group">
                      <td colSpan={9} className="p-0">
                        <div
                          className="grid cursor-pointer hover:bg-muted/30 transition-colors border-b"
                          style={{ gridTemplateColumns: "2rem 1fr 1fr 1.5fr 1fr 6rem 8rem 8rem 1fr" }}
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-center justify-center px-2 py-2.5">
                            {isExpanded ? <ChevronUp className="size-3 text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground" />}
                          </div>
                          <div className="px-4 py-2.5 font-medium truncate">{log.to_email}</div>
                          <div className="px-4 py-2.5 text-muted-foreground truncate">{log.to_name || "-"}</div>
                          <div className="px-4 py-2.5 truncate">{log.subject}</div>
                          <div className="px-4 py-2.5">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">{log.email_templates?.name ?? "Custom"}</span>
                          </div>
                          <div className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                              <StatusIcon className="size-3" />
                              {log.status}
                            </span>
                          </div>
                          <div className="px-4 py-2.5 text-xs text-muted-foreground font-mono truncate">{log.resend_id || "-"}</div>
                          <div className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(log.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </div>
                          <div className="px-4 py-2.5 text-xs text-red-500 truncate">{log.error_message || ""}</div>
                        </div>
                        {/* Expanded HTML Preview */}
                        {isExpanded && (
                          <div className="px-6 py-4 border-b bg-muted/20">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Email Body Preview</p>
                            <div
                              className="rounded-md border p-4 text-sm leading-relaxed bg-white dark:bg-zinc-900 max-h-64 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: log.body_html }}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${pageNum === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted/50"}`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
