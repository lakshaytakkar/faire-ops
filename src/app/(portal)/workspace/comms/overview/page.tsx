"use client"

import { useEffect, useState } from "react"
import { Mail, MessageCircle, Phone, Send, TrendingUp, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"

interface ChannelStats {
  email: { sent: number; delivered: number; failed: number; lastSent: string | null }
  whatsapp: { sent: number; delivered: number; failed: number; lastSent: string | null }
  sms: { sent: number; delivered: number; failed: number; lastSent: string | null }
}

interface RecentActivity {
  id: string
  channel: string
  recipient: string
  subject: string
  status: string
  sent_at: string
}

export default function CommsOverviewPage() {
  const [stats, setStats] = useState<ChannelStats | null>(null)
  const [recent, setRecent] = useState<RecentActivity[]>([])
  const [campaigns, setCampaigns] = useState<{ total: number; active: number; draft: number }>({ total: 0, active: 0, draft: 0 })
  const [triggers, setTriggers] = useState<{ total: number; active: number }>({ total: 0, active: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

      const [emailLogs, smsLogs, campaignData, triggerData] = await Promise.all([
        supabase.from("email_logs").select("id, status, sent_at, to_email, subject").gte("sent_at", thirtyDaysAgo).order("sent_at", { ascending: false }).limit(100),
        supabase.from("sms_logs").select("id, channel, status, sent_at, to_number, body_text").gte("sent_at", thirtyDaysAgo).order("sent_at", { ascending: false }).limit(100),
        supabase.from("campaigns").select("id, status").limit(100),
        supabase.from("comm_triggers").select("id, is_active").limit(100),
      ])

      const emails = emailLogs.data ?? []
      const sms = smsLogs.data ?? []

      const whatsappLogs = sms.filter((s: Record<string, unknown>) => s.channel === "whatsapp")
      const smsOnly = sms.filter((s: Record<string, unknown>) => s.channel === "sms")

      setStats({
        email: {
          sent: emails.length,
          delivered: emails.filter((e: Record<string, unknown>) => e.status === "sent").length,
          failed: emails.filter((e: Record<string, unknown>) => e.status === "failed").length,
          lastSent: emails[0]?.sent_at ?? null,
        },
        whatsapp: {
          sent: whatsappLogs.length,
          delivered: whatsappLogs.filter((s: Record<string, unknown>) => s.status === "delivered" || s.status === "sent").length,
          failed: whatsappLogs.filter((s: Record<string, unknown>) => s.status === "failed").length,
          lastSent: whatsappLogs[0]?.sent_at ?? null,
        },
        sms: {
          sent: smsOnly.length,
          delivered: smsOnly.filter((s: Record<string, unknown>) => s.status === "delivered" || s.status === "sent").length,
          failed: smsOnly.filter((s: Record<string, unknown>) => s.status === "failed").length,
          lastSent: smsOnly[0]?.sent_at ?? null,
        },
      })

      // Build unified recent activity
      const unified: RecentActivity[] = [
        ...emails.slice(0, 10).map((e: Record<string, unknown>) => ({
          id: e.id as string, channel: "email", recipient: e.to_email as string, subject: e.subject as string, status: e.status as string, sent_at: e.sent_at as string,
        })),
        ...sms.slice(0, 10).map((s: Record<string, unknown>) => ({
          id: s.id as string, channel: (s.channel as string) ?? "sms", recipient: s.to_number as string, subject: ((s.body_text as string) ?? "").slice(0, 60), status: s.status as string, sent_at: s.sent_at as string,
        })),
      ].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()).slice(0, 15)

      setRecent(unified)

      const camps = campaignData.data ?? []
      setCampaigns({
        total: camps.length,
        active: camps.filter((c: Record<string, unknown>) => c.status === "sending" || c.status === "scheduled").length,
        draft: camps.filter((c: Record<string, unknown>) => c.status === "draft").length,
      })

      const trigs = triggerData.data ?? []
      setTriggers({
        total: trigs.length,
        active: trigs.filter((t: Record<string, unknown>) => t.is_active).length,
      })

      setLoading(false)
    }
    load()
  }, [])

  function timeAgo(d: string | null): string {
    if (!d) return "Never"
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const channelIcon: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
    email: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
    whatsapp: { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    sms: { icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
  }

  const statusBadge = (s: string) => {
    if (s === "sent" || s === "delivered") return "bg-emerald-50 text-emerald-700"
    if (s === "failed") return "bg-red-50 text-red-700"
    return "bg-amber-50 text-amber-700"
  }

  const totalSent = (stats?.email.sent ?? 0) + (stats?.whatsapp.sent ?? 0) + (stats?.sms.sent ?? 0)
  const totalDelivered = (stats?.email.delivered ?? 0) + (stats?.whatsapp.delivered ?? 0) + (stats?.sms.delivered ?? 0)
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl px-8 py-8" style={{ background: "linear-gradient(135deg, hsl(180,50%,12%), hsl(175,60%,30%))" }}>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300/80 mb-1">Communications</p>
          <h1 className="text-2xl font-bold font-heading text-white">Communications Hub</h1>
          <p className="text-sm text-teal-100/70 mt-1">Email, SMS &amp; WhatsApp — last 30 days</p>
          <div className="grid grid-cols-3 gap-6 mt-6 max-w-md">
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{loading ? "\u2014" : (stats?.email.sent ?? 0)}</p>
              <p className="text-sm text-teal-200/60">Emails Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{loading ? "\u2014" : (stats?.sms.sent ?? 0)}</p>
              <p className="text-sm text-teal-200/60">SMS Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{loading ? "\u2014" : campaigns.total}</p>
              <p className="text-sm text-teal-200/60">Campaigns</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
      )}

      {!loading && <>
      <div>
        <h1 className="text-2xl font-bold font-heading">Communications</h1>
        <p className="text-sm text-muted-foreground">Unified email, WhatsApp, and SMS dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50"><Send className="size-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Sent (30d)</p><p className="text-xl font-bold">{totalSent}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50"><TrendingUp className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Delivery Rate</p><p className="text-xl font-bold">{deliveryRate}%</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50"><CheckCircle2 className="size-4 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Campaigns</p><p className="text-xl font-bold">{campaigns.total}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50"><AlertTriangle className="size-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Active Triggers</p><p className="text-xl font-bold">{triggers.active}</p></div>
        </CardContent></Card>
      </div>

      {/* Channel Health */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Channel Health</h2>
        <div className="grid grid-cols-3 gap-4">
          {(["email", "whatsapp", "sms"] as const).map((ch) => {
            const s = stats?.[ch]
            const ci = channelIcon[ch]
            const Icon = ci.icon
            return (
              <div key={ch} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`size-9 rounded-lg flex items-center justify-center ${ci.bg}`}><Icon className={`size-4 ${ci.color}`} /></div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{ch === "whatsapp" ? "WhatsApp" : ch === "sms" ? "SMS" : "Email"}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Connected</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold">{s?.sent ?? 0}</p><p className="text-[10px] text-muted-foreground">Sent</p></div>
                  <div><p className="text-lg font-bold text-emerald-600">{s?.delivered ?? 0}</p><p className="text-[10px] text-muted-foreground">Delivered</p></div>
                  <div><p className="text-lg font-bold text-red-600">{s?.failed ?? 0}</p><p className="text-[10px] text-muted-foreground">Failed</p></div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Clock className="size-2.5" />Last sent: {timeAgo(s?.lastSent ?? null)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Recent Activity</h2>
        {recent.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No recent communications</div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Channel</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Recipient</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Subject / Body</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Time</th>
              </tr></thead>
              <tbody>
                {recent.map((r) => {
                  const ci = channelIcon[r.channel] ?? channelIcon.email
                  const Icon = ci.icon
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3"><div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${ci.bg} ${ci.color}`}><Icon className="size-3" />{r.channel}</div></td>
                      <td className="px-4 py-3 text-sm truncate max-w-[200px]">{r.recipient}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[300px]">{r.subject}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(r.sent_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <Link href="/workspace/emails/compose" className="group rounded-lg border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Mail className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Send Email</p>
                <p className="text-sm text-muted-foreground">Compose and send an email</p>
              </div>
            </div>
          </Link>
          <Link href="/workspace/messaging" className="group rounded-lg border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <Phone className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Send SMS</p>
                <p className="text-sm text-muted-foreground">Send an SMS message</p>
              </div>
            </div>
          </Link>
          <Link href="/workspace/emails/templates" className="group rounded-lg border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <MessageCircle className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Manage Templates</p>
                <p className="text-sm text-muted-foreground">View and edit templates</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
      </>}
    </div>
  )
}
