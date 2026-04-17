"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, MessageCircle, Phone, Send, Users, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Campaign {
  id: string
  name: string
  channel: string
  template_id: string | null
  audience: { type: string; recipients: string[] }
  status: string
  scheduled_at: string | null
  sent_at: string | null
  stats: { total?: number; sent?: number; delivered?: number; opened?: number; failed?: number }
  created_by: string | null
  created_at: string
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("campaigns").select("*").eq("id", id).single().then(({ data }) => {
      setCampaign(data as Campaign | null)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="max-w-[1440px] mx-auto w-full py-20 text-center"><Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" /></div>
  if (!campaign) return <div className="max-w-[1440px] mx-auto w-full py-20 text-center text-sm text-muted-foreground">Campaign not found</div>

  const channelMeta: Record<string, { icon: typeof Mail; label: string; color: string; bg: string }> = {
    email: { icon: Mail, label: "Email", color: "text-blue-600", bg: "bg-blue-50" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-600", bg: "bg-emerald-50" },
    sms: { icon: Phone, label: "SMS", color: "text-purple-600", bg: "bg-purple-50" },
  }

  const cm = channelMeta[campaign.channel] ?? channelMeta.email
  const Icon = cm.icon
  const stats = campaign.stats
  const recipients = campaign.audience?.recipients ?? []
  const deliveryRate = (stats.total ?? 0) > 0 ? Math.round(((stats.delivered ?? 0) / (stats.total ?? 1)) * 100) : 0

  const statusStyle: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-50 text-blue-700",
    sending: "bg-amber-50 text-amber-700",
    sent: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-6">
      <Link href="/workspace/comms/campaigns" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading">{campaign.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle[campaign.status]}`}>{campaign.status}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cm.bg} ${cm.color}`}><Icon className="size-3" />{cm.label}</div>
            <span className="text-xs text-muted-foreground">Created {new Date(campaign.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            {campaign.created_by && <span className="text-xs text-muted-foreground">by {campaign.created_by}</span>}
          </div>
        </div>
        {campaign.status === "draft" && (
          <Button size="sm"><Send className="size-3.5 mr-1.5" />Send Now</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card size="sm"><CardContent className="text-center py-4">
          <p className="text-2xl font-bold">{stats.total ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Users className="size-3" />Recipients</p>
        </CardContent></Card>
        <Card size="sm"><CardContent className="text-center py-4">
          <p className="text-2xl font-bold">{stats.sent ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Send className="size-3" />Sent</p>
        </CardContent></Card>
        <Card size="sm"><CardContent className="text-center py-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.delivered ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="size-3" />Delivered</p>
        </CardContent></Card>
        <Card size="sm"><CardContent className="text-center py-4">
          <p className="text-2xl font-bold text-red-600">{stats.failed ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><XCircle className="size-3" />Failed</p>
        </CardContent></Card>
        <Card size="sm"><CardContent className="text-center py-4">
          <p className="text-2xl font-bold">{deliveryRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">Delivery Rate</p>
        </CardContent></Card>
      </div>

      {/* Schedule info */}
      {campaign.scheduled_at && (
        <div className="rounded-lg border bg-blue-50/50 p-4 flex items-center gap-3">
          <Clock className="size-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Scheduled</p>
            <p className="text-xs text-blue-600">{new Date(campaign.scheduled_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</p>
          </div>
        </div>
      )}

      {/* Recipients */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Recipients ({recipients.length})</h2>
        {recipients.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No recipients defined</div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-card"><tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase text-left">#</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase text-left">Recipient</th>
              </tr></thead>
              <tbody>
                {recipients.map((r, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2 text-sm font-mono">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
