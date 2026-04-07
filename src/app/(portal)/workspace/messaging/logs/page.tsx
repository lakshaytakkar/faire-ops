"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Clock,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  ArrowUpDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SmsLog {
  id: string
  template_id: string | null
  channel: "sms" | "whatsapp"
  to_number: string
  to_name: string | null
  body: string
  status: string
  twilio_sid: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
  sent_at: string
}

type ChannelFilter = "all" | "sms" | "whatsapp"
type StatusFilter = "all" | "sent" | "delivered" | "failed" | "simulated"
type SortField = "sent_at" | "channel" | "status"
type SortDir = "asc" | "desc"

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  sent: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  delivered: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: XCircle },
  simulated: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: Info },
}

const CHANNEL_STYLES: Record<string, string> = {
  sms: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

const PAGE_SIZE = 20

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MessagingLogsPage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full p-8 text-center text-sm text-muted-foreground">Loading...</div>}>
      <MessagingLogsInner />
    </Suspense>
  )
}

function MessagingLogsInner() {
  const searchParams = useSearchParams()
  const initialChannel = (searchParams.get("channel") as ChannelFilter) || "all"

  const [logs, setLogs] = useState<SmsLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(initialChannel)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")

  // Pagination
  const [page, setPage] = useState(0)

  // Sort
  const [sortField, setSortField] = useState<SortField>("sent_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("sms_logs")
      .select("*", { count: "exact" })
      .order(sortField, { ascending: sortDir === "asc" })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (channelFilter !== "all") {
      query = query.eq("channel", channelFilter)
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }
    if (search.trim()) {
      query = query.or(`to_number.ilike.%${search}%,to_name.ilike.%${search}%,body.ilike.%${search}%`)
    }

    const { data, count } = await query
    setLogs((data ?? []) as SmsLog[])
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [channelFilter, statusFilter, search, page, sortField, sortDir])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [channelFilter, statusFilter, search])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="size-3 opacity-30" />
    return sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Clock className="size-6" />
          Message Logs
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Delivery tracking for SMS &amp; WhatsApp messages</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Channel filter */}
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
          className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Channels</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="simulated">Simulated</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search number, name, or body..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {totalCount} message{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("channel")}
                >
                  <span className="inline-flex items-center gap-1">
                    Channel <SortIcon field="channel" />
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To Number</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Body</th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  <span className="inline-flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Twilio SID</th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none"
                  onClick={() => toggleSort("sent_at")}
                >
                  <span className="inline-flex items-center gap-1">
                    Sent At <SortIcon field="sent_at" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusStyle = STATUS_STYLES[log.status] ?? STATUS_STYLES.simulated
                const StatusIcon = statusStyle.icon
                const isExpanded = expandedId === log.id

                return (
                  <>
                    <tr
                      key={log.id}
                      className="border-b last:border-b-0 hover:bg-muted/20 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_STYLES[log.channel]}`}>
                          {log.channel === "sms" ? <Phone className="size-3" /> : <MessageSquare className="size-3" />}
                          {log.channel === "sms" ? "SMS" : "WhatsApp"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">{log.to_number}</td>
                      <td className="px-4 py-2.5 text-xs">{log.to_name || "-"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.body}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                          <StatusIcon className="size-3" />
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-muted-foreground max-w-[120px] truncate">
                        {log.twilio_sid || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${log.id}-expanded`} className="bg-muted/10">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Full Message</p>
                            <div className={`rounded-md p-3 text-sm leading-relaxed ${
                              log.channel === "whatsapp"
                                ? "bg-[#dcf8c6] dark:bg-emerald-950 text-zinc-800 dark:text-emerald-100"
                                : "bg-blue-50 dark:bg-blue-950 text-zinc-800 dark:text-blue-100"
                            }`}>
                              {log.body}
                            </div>
                            {log.error_message && (
                              <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">Error</p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{log.error_message}</p>
                              </div>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Metadata</p>
                                <pre className="text-[10px] font-mono bg-muted rounded-md p-2 overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No messages found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center justify-center size-8 rounded-md border text-sm hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i
              if (pageNum < 0 || pageNum >= totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`inline-flex items-center justify-center size-8 rounded-md text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "border hover:bg-muted/50"
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center justify-center size-8 rounded-md border text-sm hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
