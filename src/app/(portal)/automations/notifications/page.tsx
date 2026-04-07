"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Bell,
  Mail,
  FileText,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  ChevronRight,
  Zap,
  CalendarClock,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string
  name: string
  description: string | null
  type: string
  category: string | null
  trigger_type: string
  cron_expression: string | null
  config: {
    recipients?: string[]
    template?: string
    [key: string]: unknown
  } | null
  is_active: boolean
  last_run_at: string | null
  last_status: string | null
  run_count: number
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category: string
  variables: string[]
  is_active: boolean
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
  created_by: string | null
  email_templates?: { name: string } | null
}

const RECURRING_OPTIONS = [
  { value: "", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

const RECURRING_STYLES: Record<string, string> = {
  daily: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  weekly: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  monthly: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [stats, setStats] = useState({ active: 0, templates: 0, scheduled: 0, sentToday: 0 })
  const [loading, setLoading] = useState(true)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Quick send dialog
  const [showQuickSend, setShowQuickSend] = useState(false)
  const [qsTemplateId, setQsTemplateId] = useState("")
  const [qsEmail, setQsEmail] = useState("")
  const [qsName, setQsName] = useState("")
  const [qsVars, setQsVars] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  // Add scheduled email dialog
  const [showAddScheduled, setShowAddScheduled] = useState(false)
  const [asTemplateId, setAsTemplateId] = useState("")
  const [asEmail, setAsEmail] = useState("")
  const [asName, setAsName] = useState("")
  const [asScheduleAt, setAsScheduleAt] = useState("")
  const [asRecurring, setAsRecurring] = useState("")
  const [addingScheduled, setAddingScheduled] = useState(false)

  // Test sending state
  const [testSendingId, setTestSendingId] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t) }
  }, [toast])

  async function fetchAll() {
    setLoading(true)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [automationsRes, scheduledRes, templatesRes, sentTodayRes] = await Promise.all([
      supabase
        .from("automations")
        .select("*")
        .in("type", ["email", "notification"])
        .order("name"),
      supabase
        .from("scheduled_emails")
        .select("*, email_templates(name)")
        .eq("is_sent", false)
        .order("schedule_at"),
      supabase
        .from("email_templates")
        .select("id, name, subject, category, variables, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", todayStart.toISOString()),
    ])

    const autos = (automationsRes.data ?? []) as Automation[]
    const sched = (scheduledRes.data ?? []) as ScheduledEmail[]
    const tpls = (templatesRes.data ?? []) as EmailTemplate[]

    setAutomations(autos)
    setScheduled(sched)
    setTemplates(tpls)
    setStats({
      active: autos.filter((a) => a.is_active).length,
      templates: tpls.length,
      scheduled: sched.length,
      sentToday: sentTodayRes.count ?? 0,
    })
    setLoading(false)
  }

  /* ---- Toggle active ---- */
  async function toggleActive(id: string, currentValue: boolean) {
    const { error } = await supabase
      .from("automations")
      .update({ is_active: !currentValue })
      .eq("id", id)
    if (error) {
      setToast({ type: "error", message: "Failed to update automation" })
    } else {
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !currentValue } : a))
      )
      setStats((prev) => ({
        ...prev,
        active: prev.active + (currentValue ? -1 : 1),
      }))
    }
  }

  /* ---- Test send ---- */
  async function handleTestSend(automation: Automation) {
    if (!automation.config?.template || !automation.config?.recipients?.length) {
      setToast({ type: "error", message: "No template or recipients configured" })
      return
    }
    setTestSendingId(automation.id)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: automation.config.template,
          to_email: automation.config.recipients[0],
          variables: {},
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToast({ type: "success", message: data.simulated ? "Test email logged (simulated)" : "Test email sent!" })
      } else {
        setToast({ type: "error", message: data.error || "Failed to send test" })
      }
    } catch {
      setToast({ type: "error", message: "Network error" })
    } finally {
      setTestSendingId(null)
    }
  }

  /* ---- Cancel scheduled ---- */
  async function cancelScheduled(id: string) {
    const { error } = await supabase.from("scheduled_emails").delete().eq("id", id)
    if (error) {
      setToast({ type: "error", message: "Failed to cancel email" })
    } else {
      setScheduled((prev) => prev.filter((s) => s.id !== id))
      setStats((prev) => ({ ...prev, scheduled: prev.scheduled - 1 }))
      setToast({ type: "success", message: "Scheduled email cancelled" })
    }
  }

  /* ---- Quick send ---- */
  function handleQsTemplateChange(id: string) {
    setQsTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    if (tpl?.variables?.length) {
      const vars: Record<string, string> = {}
      tpl.variables.forEach((v) => { vars[v] = "" })
      setQsVars(vars)
    } else {
      setQsVars({})
    }
  }

  async function handleQuickSend() {
    if (!qsTemplateId || !qsEmail) return
    setSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: qsTemplateId,
          to_email: qsEmail,
          to_name: qsName || undefined,
          variables: qsVars,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToast({ type: "success", message: data.simulated ? "Email logged (simulated)" : "Email sent!" })
        setShowQuickSend(false)
        setQsTemplateId("")
        setQsEmail("")
        setQsName("")
        setQsVars({})
        fetchAll()
      } else {
        setToast({ type: "error", message: data.error || "Failed to send" })
      }
    } catch {
      setToast({ type: "error", message: "Network error" })
    } finally {
      setSending(false)
    }
  }

  /* ---- Add scheduled ---- */
  async function handleAddScheduled() {
    if (!asTemplateId || !asEmail || !asScheduleAt) return
    setAddingScheduled(true)
    const { error } = await supabase.from("scheduled_emails").insert({
      template_id: asTemplateId,
      to_email: asEmail,
      to_name: asName || null,
      variables: {},
      schedule_at: new Date(asScheduleAt).toISOString(),
      recurring: asRecurring || null,
      is_sent: false,
      created_by: "manual",
    })
    if (error) {
      setToast({ type: "error", message: "Failed to schedule email" })
    } else {
      setToast({ type: "success", message: "Email scheduled" })
      setShowAddScheduled(false)
      setAsTemplateId("")
      setAsEmail("")
      setAsName("")
      setAsScheduleAt("")
      setAsRecurring("")
      fetchAll()
    }
    setAddingScheduled(false)
  }

  /* ---- Helpers ---- */
  function formatDate(iso: string | null) {
    if (!iso) return "Never"
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  }

  const selectedQsTemplate = templates.find((t) => t.id === qsTemplateId)

  /* ---- Stat cards ---- */
  const statCards = [
    { label: "Active Notifications", value: stats.active, icon: Bell, iconBg: "bg-primary/10 text-primary" },
    { label: "Email Templates", value: stats.templates, icon: FileText, iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    { label: "Scheduled Emails", value: stats.scheduled, icon: CalendarClock, iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
    { label: "Sent Today", value: stats.sentToday, icon: Send, iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
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
            <Bell className="size-6" />
            Notification Automations
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Configure email alerts and team notifications
          </p>
        </div>
        <button
          onClick={() => fetchAll()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
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

      {/* Section 1: Active Notification Rules */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          Active Notification Rules
        </h2>
        {automations.length === 0 ? (
          <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
            No notification automations configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => (
              <div key={auto.id} className="rounded-md border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{auto.name}</h3>
                    {auto.description && (
                      <p className="text-xs text-muted-foreground">{auto.description}</p>
                    )}
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(auto.id, auto.is_active)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${auto.is_active ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${auto.is_active ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Trigger info */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {auto.trigger_type === "cron" ? (
                      <><Clock className="size-3" />{auto.cron_expression || "cron"}</>
                    ) : (
                      <><Zap className="size-3" />{auto.trigger_type}</>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    <Mail className="size-3" />
                    {auto.type}
                  </span>
                </div>

                {/* Recipients */}
                {auto.config?.recipients && auto.config.recipients.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Recipients</p>
                    <div className="flex flex-wrap gap-1">
                      {auto.config.recipients.map((r) => (
                        <span key={r} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template */}
                {auto.config?.template && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Template</p>
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded">{auto.config.template}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Last triggered: {formatDate(auto.last_run_at)}
                  </span>
                  <button
                    onClick={() => handleTestSend(auto)}
                    disabled={testSendingId === auto.id}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    {testSendingId === auto.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    Test Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Scheduled Emails */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Scheduled Emails</h2>
          </div>
          <button
            onClick={() => setShowAddScheduled(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            Add Scheduled Email
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Scheduled At</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Recurring</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Created By</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {scheduled.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No scheduled emails
                  </td>
                </tr>
              )}
              {scheduled.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{s.email_templates?.name ?? "Unknown"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{s.to_email}</span>
                    {s.to_name && <span className="text-muted-foreground ml-1 text-xs">({s.to_name})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDate(s.schedule_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.recurring ? (RECURRING_STYLES[s.recurring] ?? "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground"}`}>
                      {s.recurring ? (
                        <><RefreshCw className="size-3" />{s.recurring}</>
                      ) : (
                        "one-time"
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.created_by ?? "-"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => cancelScheduled(s.id)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      <Trash2 className="size-3" />
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setShowQuickSend(true)}
            className="rounded-md border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Send className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Send Test Email</p>
              <p className="text-xs text-muted-foreground">Quick send with any template</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </button>
          <Link
            href="/workspace/emails/templates"
            className="rounded-md border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">View All Templates</p>
              <p className="text-xs text-muted-foreground">Manage email templates</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </Link>
          <Link
            href="/workspace/emails/logs"
            className="rounded-md border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">View Email Logs</p>
              <p className="text-xs text-muted-foreground">Track all sent emails</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </Link>
        </div>
      </div>

      {/* Quick Send Dialog */}
      {showQuickSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border shadow-xl w-full max-w-lg mx-4">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Send Test Email
              </h3>
              <button onClick={() => setShowQuickSend(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template</label>
                <select
                  value={qsTemplateId}
                  onChange={(e) => handleQsTemplateChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Email</label>
                  <input
                    type="email"
                    value={qsEmail}
                    onChange={(e) => setQsEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Name</label>
                  <input
                    type="text"
                    value={qsName}
                    onChange={(e) => setQsName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              {/* Variable fields */}
              {selectedQsTemplate?.variables && selectedQsTemplate.variables.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Variables</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedQsTemplate.variables.map((v) => (
                      <div key={v}>
                        <label className="block text-xs text-muted-foreground mb-1 font-mono">{`{{${v}}}`}</label>
                        <input
                          type="text"
                          value={qsVars[v] ?? ""}
                          onChange={(e) => setQsVars((prev) => ({ ...prev, [v]: e.target.value }))}
                          className="w-full h-8 px-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowQuickSend(false)}
                  className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSend}
                  disabled={!qsTemplateId || !qsEmail || sending}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Scheduled Email Dialog */}
      {showAddScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border shadow-xl w-full max-w-lg mx-4">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="size-4 text-blue-500" />
                Schedule Email
              </h3>
              <button onClick={() => setShowAddScheduled(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Template</label>
                <select
                  value={asTemplateId}
                  onChange={(e) => setAsTemplateId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Email</label>
                  <input
                    type="email"
                    value={asEmail}
                    onChange={(e) => setAsEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipient Name</label>
                  <input
                    type="text"
                    value={asName}
                    onChange={(e) => setAsName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Schedule Date/Time</label>
                  <input
                    type="datetime-local"
                    value={asScheduleAt}
                    onChange={(e) => setAsScheduleAt(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recurring</label>
                  <select
                    value={asRecurring}
                    onChange={(e) => setAsRecurring(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {RECURRING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddScheduled(false)}
                  className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddScheduled}
                  disabled={!asTemplateId || !asEmail || !asScheduleAt || addingScheduled}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingScheduled ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
