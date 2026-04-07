"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  MessageSquare,
  Phone,
  Send,
  AlertTriangle,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
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

interface SmsTemplate {
  id: string
  name: string
  channel: "sms" | "whatsapp"
  is_active: boolean
}

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MessagingHubPage() {
  const [recentLogs, setRecentLogs] = useState<SmsLog[]>([])
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [stats, setStats] = useState({ smsSent: 0, whatsappSent: 0, templates: 0, failed: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const [logsRes, templatesRes, smsTodayRes, whatsappTodayRes, failedRes] = await Promise.all([
      supabase.from("sms_logs").select("*").order("sent_at", { ascending: false }).limit(10),
      supabase.from("sms_templates").select("id, name, channel, is_active"),
      supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("channel", "sms").gte("sent_at", todayISO),
      supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("channel", "whatsapp").gte("sent_at", todayISO),
      supabase.from("sms_logs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    ])

    setRecentLogs((logsRes.data ?? []) as SmsLog[])
    setTemplates((templatesRes.data ?? []) as SmsTemplate[])
    setStats({
      smsSent: smsTodayRes.count ?? 0,
      whatsappSent: whatsappTodayRes.count ?? 0,
      templates: (templatesRes.data ?? []).length,
      failed: failedRes.count ?? 0,
    })
    setLoading(false)
  }

  const smsTemplates = templates.filter((t) => t.channel === "sms")
  const whatsappTemplates = templates.filter((t) => t.channel === "whatsapp")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <MessageSquare className="size-6" />
          Messaging
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">SMS &amp; WhatsApp communication hub</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "SMS Sent (Today)", value: stats.smsSent, icon: Phone, color: "text-blue-600 dark:text-blue-400" },
          { label: "WhatsApp Sent (Today)", value: stats.whatsappSent, icon: MessageSquare, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Templates", value: stats.templates, icon: FileText, color: "text-purple-600 dark:text-purple-400" },
          { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className={`size-4 ${s.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SMS Card */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="h-1.5 bg-blue-500" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-md bg-blue-100 dark:bg-blue-950">
                <Phone className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SMS</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.smsSent} sent today &middot; {smsTemplates.length} templates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/workspace/messaging/sms"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Send className="size-4" />
                Send SMS
              </Link>
              <Link
                href="/workspace/messaging/logs?channel=sms"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View Logs
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="h-1.5 bg-emerald-500" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-md bg-emerald-100 dark:bg-emerald-950">
                <MessageSquare className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">WhatsApp</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.whatsappSent} sent today &middot; {whatsappTemplates.length} templates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/workspace/messaging/whatsapp"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Send className="size-4" />
                Send WhatsApp
              </Link>
              <Link
                href="/workspace/messaging/logs?channel=whatsapp"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View Logs
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Messages</h2>
          <Link
            href="/workspace/messaging/logs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Channel</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Body</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => {
                const statusStyle = STATUS_STYLES[log.status] ?? STATUS_STYLES.simulated
                const StatusIcon = statusStyle.icon
                return (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_STYLES[log.channel]}`}>
                        {log.channel === "sms" ? "SMS" : "WhatsApp"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <div>{log.to_name || "-"}</div>
                      <div className="text-muted-foreground">{log.to_number}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.body}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                        <StatusIcon className="size-3" />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                )
              })}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No messages sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex items-center gap-4">
        <Link
          href="/workspace/messaging/templates"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <FileText className="size-3.5" />
          Templates
        </Link>
        <Link
          href="/workspace/messaging/logs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Clock className="size-3.5" />
          Logs
        </Link>
      </div>
    </div>
  )
}
