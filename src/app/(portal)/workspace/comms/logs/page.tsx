"use client"

import { useEffect, useState } from "react"
import { Mail, MessageCircle, Phone, Search, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Channel = "all" | "email" | "whatsapp" | "sms"

interface LogEntry {
  id: string
  channel: string
  recipient: string
  subject: string
  body: string
  status: string
  sent_at: string
  template_name?: string
  error?: string
}

export default function CommsLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<Channel>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [emailRes, smsRes] = await Promise.all([
        supabase.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(200),
        supabase.from("sms_logs").select("*").order("sent_at", { ascending: false }).limit(200),
      ])

      const emails: LogEntry[] = (emailRes.data ?? []).map((e: Record<string, unknown>) => ({
        id: `e-${e.id}`,
        channel: "email",
        recipient: (e.to_email as string) ?? "",
        subject: (e.subject as string) ?? "",
        body: (e.html as string) ?? "",
        status: (e.status as string) ?? "unknown",
        sent_at: (e.sent_at as string) ?? "",
        error: (e.error_message as string) ?? undefined,
      }))

      const sms: LogEntry[] = (smsRes.data ?? []).map((s: Record<string, unknown>) => ({
        id: `s-${s.id}`,
        channel: (s.channel as string) ?? "sms",
        recipient: (s.to_number as string) ?? "",
        subject: "",
        body: (s.body_text as string) ?? "",
        status: (s.status as string) ?? "unknown",
        sent_at: (s.sent_at as string) ?? "",
        error: (s.error_message as string) ?? undefined,
      }))

      const all = [...emails, ...sms].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
      setLogs(all)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = logs.filter((l) => {
    if (channel !== "all" && l.channel !== channel) return false
    if (statusFilter !== "all" && l.status !== statusFilter) return false
    if (search && !l.recipient.toLowerCase().includes(search.toLowerCase()) && !l.subject.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const channelIcon: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
    email: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
    whatsapp: { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    sms: { icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
  }

  const statusBadge = (s: string) => {
    if (s === "sent" || s === "delivered") return "bg-emerald-50 text-emerald-700"
    if (s === "failed") return "bg-red-50 text-red-700"
    if (s === "simulated") return "bg-amber-50 text-amber-700"
    return "bg-muted text-muted-foreground"
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading">Delivery Logs</h1>
        <p className="text-sm text-muted-foreground">Unified log of all sent emails, WhatsApp, and SMS messages</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} placeholder="Search recipient or subject..." className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm" />
        </div>
        <select value={channel} onChange={(e) => { setChannel(e.target.value as Channel); setPage(0) }} className="h-9 px-3 rounded-md border bg-background text-sm">
          <option value="all">All Channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} className="h-9 px-3 rounded-md border bg-background text-sm">
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="simulated">Simulated</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} results</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading logs...</div>
      ) : paged.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">No logs found</div>
      ) : (
        <>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Time</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Channel</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Recipient</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Subject / Body</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left w-10"></th>
              </tr></thead>
              <tbody>
                {paged.map((l) => {
                  const ci = channelIcon[l.channel] ?? channelIcon.email
                  const Icon = ci.icon
                  const isExpanded = expandedId === l.id
                  return (
                    <tr key={l.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${ci.bg} ${ci.color}`}>
                          <Icon className="size-2.5" />{l.channel}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm truncate max-w-[180px]">{l.recipient}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[280px]">{l.subject || l.body.slice(0, 60)}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(l.status)}`}>{l.status}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(isExpanded ? null : l.id)} className="p-1 rounded hover:bg-muted">
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-3 rounded bg-muted text-xs">
                            {l.channel === "email" ? (
                              <div dangerouslySetInnerHTML={{ __html: l.body.slice(0, 500) }} />
                            ) : (
                              <pre className="whitespace-pre-wrap">{l.body}</pre>
                            )}
                            {l.error && <p className="mt-2 text-red-600">Error: {l.error}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50">Prev</button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
