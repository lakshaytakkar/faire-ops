"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Mail,
  FileText,
  Send,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  category: string
  variables: string[]
  is_active: boolean
  created_at: string
}

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

interface ScheduledEmail {
  id: string
  template_id: string
  to_email: string
  to_name: string | null
  variables: Record<string, string> | null
  schedule_at: string
  recurring: string | null
  is_sent: boolean
  sent_at: string | null
  created_by: string | null
  email_templates?: { name: string } | null
}

const STATUS_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  sent: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: XCircle },
  simulated: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: Info },
}

export default function EmailDashboardPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [recentLogs, setRecentLogs] = useState<EmailLog[]>([])
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([])
  const [stats, setStats] = useState({ templates: 0, sentToday: 0, scheduled: 0, failed: 0 })
  const [loading, setLoading] = useState(true)

  // Quick send state
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [toEmail, setToEmail] = useState("")
  const [toName, setToName] = useState("")
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchAll() {
    setLoading(true)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      templatesRes,
      logsRes,
      scheduledRes,
      sentTodayRes,
      failedRes,
      templatesCountRes,
      scheduledCountRes,
    ] = await Promise.all([
      supabase.from("email_templates").select("*").eq("is_active", true).order("name"),
      supabase.from("email_logs").select("*, email_templates(name)").order("sent_at", { ascending: false }).limit(20),
      supabase.from("scheduled_emails").select("*, email_templates(name)").eq("is_sent", false).order("schedule_at"),
      supabase.from("email_logs").select("*", { count: "exact", head: true }).gte("sent_at", todayStart.toISOString()),
      supabase.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "failed"),
      // Count-only queries — not capped by the list fetches above
      supabase.from("email_templates").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("scheduled_emails").select("*", { count: "exact", head: true }).eq("is_sent", false),
    ])

    const tpls = (templatesRes.data ?? []) as EmailTemplate[]
    setTemplates(tpls)
    setRecentLogs((logsRes.data ?? []) as EmailLog[])
    setScheduled((scheduledRes.data ?? []) as ScheduledEmail[])
    setStats({
      templates: templatesCountRes.count ?? 0,
      sentToday: sentTodayRes.count ?? 0,
      scheduled: scheduledCountRes.count ?? 0,
      failed: failedRes.count ?? 0,
    })
    setLoading(false)
  }

  function handleTemplateChange(id: string) {
    setSelectedTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    if (tpl && tpl.variables) {
      const vars: Record<string, string> = {}
      tpl.variables.forEach((v) => { vars[v] = "" })
      setVariables(vars)
    } else {
      setVariables({})
    }
  }

  async function handleSend() {
    if (!selectedTemplateId || !toEmail) return
    setSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          to_email: toEmail,
          to_name: toName || undefined,
          variables,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToast({ type: "success", message: data.simulated ? "Email logged (simulated - no API key)" : "Email sent successfully!" })
        setSelectedTemplateId("")
        setToEmail("")
        setToName("")
        setVariables({})
        fetchAll()
      } else {
        setToast({ type: "error", message: data.error || "Failed to send email" })
      }
    } catch {
      setToast({ type: "error", message: "Network error" })
    } finally {
      setSending(false)
    }
  }

  function highlightVariables(text: string) {
    return text.replace(/\{\{(\w+)\}\}/g, '<span class="bg-amber-200 dark:bg-amber-900 px-1 rounded text-amber-800 dark:text-amber-200 font-mono text-xs">{{$1}}</span>')
  }

  const statCards = [
    { label: "Templates", value: stats.templates, icon: FileText, iconBg: "bg-primary/10 text-primary" },
    { label: "Sent Today", value: stats.sentToday, icon: Send, iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    { label: "Scheduled", value: stats.scheduled, icon: Clock, iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
    { label: "Failed", value: stats.failed, icon: AlertTriangle, iconBg: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Mail className="size-6" />
            Email & Notifications
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage templates, send emails, and track delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/workspace/emails/templates"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <FileText className="size-4" />
            Templates
          </Link>
          <Link
            href="/workspace/emails/logs"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Logs
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-heading mt-2">{stat.value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                <Icon className="size-4" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Send */}
      <div className="rounded-md border bg-card">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Send className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Quick Send</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template Selector */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Email</label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Name</label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="rounded-md border bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <p className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: highlightVariables(selectedTemplate.subject) }} />
              <div
                className="text-xs text-muted-foreground leading-relaxed max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: highlightVariables(selectedTemplate.body_html) }}
              />
            </div>
          )}

          {/* Variable Fields */}
          {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Variables</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedTemplate.variables.map((v) => (
                  <div key={v}>
                    <label className="block text-xs text-muted-foreground mb-1 font-mono">{`{{${v}}}`}</label>
                    <input
                      type="text"
                      value={variables[v] ?? ""}
                      onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                      className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={!selectedTemplateId || !toEmail || sending}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send Email
            </button>
          </div>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Emails</h2>
          <Link href="/workspace/emails/logs" className="text-xs text-primary hover:underline flex items-center gap-1">
            View All <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No emails sent yet</td></tr>
              )}
              {recentLogs.map((log) => {
                const statusStyle = STATUS_STYLES[log.status] ?? STATUS_STYLES.simulated
                const StatusIcon = statusStyle.icon
                return (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{log.to_email}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[250px] truncate">{log.subject}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{log.email_templates?.name ?? "Custom"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
                        <StatusIcon className="size-3" />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(log.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Emails */}
      {scheduled.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Clock className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Scheduled Emails</h2>
          </div>
          <div className="divide-y">
            {scheduled.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{s.email_templates?.name ?? "Unknown Template"}</p>
                    <p className="text-xs text-muted-foreground">{s.to_email}{s.to_name ? ` (${s.to_name})` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.recurring && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                      <RefreshCw className="size-3" />
                      {s.recurring}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.schedule_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
