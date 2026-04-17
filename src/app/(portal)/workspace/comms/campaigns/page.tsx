"use client"

import { useEffect, useState } from "react"
import { Plus, X, Mail, MessageCircle, Phone, Send, Clock, Users, Search, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Channel = "email" | "whatsapp" | "sms"

interface Campaign {
  id: string
  name: string
  channel: Channel
  template_id: string | null
  audience: { type: string; recipients: string[] }
  status: "draft" | "scheduled" | "sending" | "sent" | "failed"
  scheduled_at: string | null
  sent_at: string | null
  stats: { total?: number; sent?: number; delivered?: number; opened?: number; failed?: number }
  space_slug: string | null
  created_by: string | null
  created_at: string
}

interface Template {
  id: string
  name: string
  subject?: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: "", channel: "email" as Channel, template_id: "",
    recipients: "", schedule: "now" as "now" | "later",
    scheduled_at: "",
  })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const [campRes, tplRes] = await Promise.all([
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("email_templates").select("id, name, subject").eq("is_active", true).order("name"),
      ])
      setCampaigns((campRes.data ?? []) as Campaign[])
      setTemplates((tplRes.data ?? []) as Template[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = campaigns.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    const recipients = form.recipients.split(/[\n,]/).map(r => r.trim()).filter(Boolean)
    const { data } = await supabase.from("campaigns").insert({
      name: form.name,
      channel: form.channel,
      template_id: form.template_id || null,
      audience: { type: "manual", recipients },
      status: form.schedule === "later" && form.scheduled_at ? "scheduled" : "draft",
      scheduled_at: form.schedule === "later" && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      stats: { total: recipients.length, sent: 0, delivered: 0, opened: 0, failed: 0 },
      created_by: "Lakshay",
    }).select().single()

    if (data) setCampaigns(prev => [data as Campaign, ...prev])
    setSaving(false)
    setShowCreate(false)
    setStep(1)
    setForm({ name: "", channel: "email", template_id: "", recipients: "", schedule: "now", scheduled_at: "" })
  }

  async function handleSend(id: string) {
    await supabase.from("campaigns").update({ status: "sending", sent_at: new Date().toISOString() }).eq("id", id)
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sending" as const, sent_at: new Date().toISOString() } : c))
    // In real implementation, this would trigger the actual send via API
    setTimeout(async () => {
      await supabase.from("campaigns").update({ status: "sent" }).eq("id", id)
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sent" as const } : c))
    }, 2000)
  }

  const channelIcon: Record<string, { icon: typeof Mail; color: string; bg: string; label: string }> = {
    email: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50", label: "Email" },
    whatsapp: { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "WhatsApp" },
    sms: { icon: Phone, color: "text-purple-600", bg: "bg-purple-50", label: "SMS" },
  }

  const statusStyle: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-50 text-blue-700",
    sending: "bg-amber-50 text-amber-700",
    sent: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
  }

  const totalCampaigns = campaigns.length
  const sentCampaigns = campaigns.filter(c => c.status === "sent").length
  const scheduledCampaigns = campaigns.filter(c => c.status === "scheduled").length
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.stats.total ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Create and manage batch communication campaigns</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />New Campaign
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10"><Send className="size-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Campaigns</p><p className="text-xl font-bold">{totalCampaigns}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50"><Mail className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Sent</p><p className="text-xl font-bold">{sentCampaigns}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50"><Clock className="size-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Scheduled</p><p className="text-xl font-bold">{scheduledCampaigns}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50"><Users className="size-4 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Recipients</p><p className="text-xl font-bold">{totalRecipients}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm" />
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Send className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">No campaigns yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first campaign to reach your audience</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Campaign</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Channel</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Recipients</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Sent</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Delivered</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Created</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => {
                const ci = channelIcon[c.channel]
                const Icon = ci.icon
                return (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3"><div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ci.bg} ${ci.color}`}><Icon className="size-3" />{ci.label}</div></td>
                    <td className="px-4 py-3 text-sm tabular-nums">{c.stats.total ?? 0}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle[c.status]}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-sm tabular-nums">{c.stats.sent ?? 0}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{c.stats.delivered ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={`/workspace/comms/campaigns/${c.id}`} className="p-1.5 rounded hover:bg-muted" title="View"><Eye className="size-3.5 text-muted-foreground" /></a>
                        {c.status === "draft" && (
                          <button onClick={() => handleSend(c.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
                            <Send className="size-3" />Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Campaign Modal (Multi-Step Wizard) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New Campaign — Step {step} of 3</h2>
              <button onClick={() => { setShowCreate(false); setStep(1) }} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-2">
              {[1, 2, 3].map(s => <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />)}
            </div>

            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium">Campaign Name</label>
                  <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" placeholder="e.g., March Wholesale Promo" autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium">Channel</label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {(["email", "whatsapp", "sms"] as const).map((ch) => {
                      const ci = channelIcon[ch]
                      const Icon = ci.icon
                      return (
                        <button key={ch} onClick={() => setForm(p => ({ ...p, channel: ch }))} className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${form.channel === ch ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                          <Icon className={`size-4 ${ci.color}`} /><span className="text-sm font-medium">{ci.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Template (optional)</label>
                  <select value={form.template_id} onChange={(e) => setForm(p => ({ ...p, template_id: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="">No template</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <div>
                <label className="text-sm font-medium">Recipients (one per line or comma-separated)</label>
                <textarea value={form.recipients} onChange={(e) => setForm(p => ({ ...p, recipients: e.target.value }))} rows={8} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none font-mono" placeholder={form.channel === "email" ? "john@example.com\njane@example.com" : "+1234567890\n+0987654321"} />
                <p className="text-xs text-muted-foreground mt-1">{form.recipients.split(/[\n,]/).filter(r => r.trim()).length} recipients</p>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="text-sm font-medium">Schedule</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button onClick={() => setForm(p => ({ ...p, schedule: "now" }))} className={`p-3 rounded-lg border-2 text-sm font-medium ${form.schedule === "now" ? "border-primary bg-primary/5" : "border-border"}`}>Send Now</button>
                    <button onClick={() => setForm(p => ({ ...p, schedule: "later" }))} className={`p-3 rounded-lg border-2 text-sm font-medium ${form.schedule === "later" ? "border-primary bg-primary/5" : "border-border"}`}>Schedule</button>
                  </div>
                </div>
                {form.schedule === "later" && (
                  <div>
                    <label className="text-sm font-medium">Send At</label>
                    <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm(p => ({ ...p, scheduled_at: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" />
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Summary</p>
                  <p className="text-sm"><strong>Campaign:</strong> {form.name}</p>
                  <p className="text-sm"><strong>Channel:</strong> {channelIcon[form.channel].label}</p>
                  <p className="text-sm"><strong>Recipients:</strong> {form.recipients.split(/[\n,]/).filter(r => r.trim()).length}</p>
                  <p className="text-sm"><strong>Schedule:</strong> {form.schedule === "now" ? "Immediate" : form.scheduled_at || "Not set"}</p>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>Back</Button>
              ) : <div />}
              {step < 3 ? (
                <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.name.trim()}>Next</Button>
              ) : (
                <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : form.schedule === "now" ? "Create & Send" : "Create Campaign"}</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
