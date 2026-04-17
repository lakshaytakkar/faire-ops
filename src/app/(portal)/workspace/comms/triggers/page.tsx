"use client"

import { useEffect, useState } from "react"
import { Plus, X, Zap, Mail, MessageCircle, Phone, ArrowRight, Trash2, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Trigger {
  id: string
  name: string
  event: string
  channel: string
  template_id: string | null
  config: Record<string, unknown>
  space_slug: string | null
  is_active: boolean
  created_at: string
}

interface Template {
  id: string
  name: string
}

const EVENTS = [
  { key: "order.new", label: "New Order Received", category: "Orders" },
  { key: "order.accepted", label: "Order Accepted", category: "Orders" },
  { key: "order.shipped", label: "Order Shipped", category: "Orders" },
  { key: "order.delivered", label: "Order Delivered", category: "Orders" },
  { key: "order.cancelled", label: "Order Cancelled", category: "Orders" },
  { key: "payment.received", label: "Payment Received", category: "Finance" },
  { key: "payment.overdue", label: "Payment Overdue", category: "Finance" },
  { key: "payment.reminder", label: "Payment Reminder Due", category: "Finance" },
  { key: "client.onboarded", label: "Client Onboarded", category: "Clients" },
  { key: "client.inactive.14d", label: "Client Inactive 14 Days", category: "Clients" },
  { key: "client.churned", label: "Client Churned", category: "Clients" },
  { key: "tax.deadline.7d", label: "Tax Deadline in 7 Days", category: "Legal" },
  { key: "tax.deadline.30d", label: "Tax Deadline in 30 Days", category: "Legal" },
  { key: "tax.filing.complete", label: "Tax Filing Completed", category: "Legal" },
  { key: "compliance.expiring", label: "Compliance Item Expiring", category: "Legal" },
  { key: "inventory.low", label: "Low Inventory Alert", category: "Catalog" },
  { key: "inventory.restock", label: "Restock Needed", category: "Catalog" },
  { key: "visa.expiring.30d", label: "Visa Expiring in 30 Days", category: "Travel" },
  { key: "booking.confirmed", label: "Booking Confirmed", category: "Travel" },
  { key: "tour.completed", label: "Tour Completed", category: "Travel" },
  { key: "support.ticket.new", label: "New Support Ticket", category: "Support" },
  { key: "support.ticket.resolved", label: "Ticket Resolved", category: "Support" },
]

const EVENT_CATEGORIES = [...new Set(EVENTS.map(e => e.category))]

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", event: "", channel: "email", template_id: "", space_slug: "" })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const [trigRes, tplRes] = await Promise.all([
        supabase.from("comm_triggers").select("*").order("created_at", { ascending: false }),
        supabase.from("email_templates").select("id, name").eq("is_active", true).order("name"),
      ])
      setTriggers((trigRes.data ?? []) as Trigger[])
      setTemplates((tplRes.data ?? []) as Template[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = triggers.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.event.includes(search.toLowerCase()))

  async function handleCreate() {
    if (!form.name.trim() || !form.event) return
    setSaving(true)
    const { data } = await supabase.from("comm_triggers").insert({
      name: form.name,
      event: form.event,
      channel: form.channel,
      template_id: form.template_id || null,
      space_slug: form.space_slug || null,
      is_active: true,
    }).select().single()
    if (data) setTriggers(prev => [data as Trigger, ...prev])
    setSaving(false)
    setShowCreate(false)
    setForm({ name: "", event: "", channel: "email", template_id: "", space_slug: "" })
  }

  async function handleToggle(id: string, active: boolean) {
    await supabase.from("comm_triggers").update({ is_active: active }).eq("id", id)
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t))
  }

  async function handleDelete(id: string) {
    await supabase.from("comm_triggers").delete().eq("id", id)
    setTriggers(prev => prev.filter(t => t.id !== id))
  }

  const channelMeta: Record<string, { icon: typeof Mail; label: string; color: string; bg: string }> = {
    email: { icon: Mail, label: "Email", color: "text-blue-600", bg: "bg-blue-50" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-600", bg: "bg-emerald-50" },
    sms: { icon: Phone, label: "SMS", color: "text-purple-600", bg: "bg-purple-50" },
  }

  const activeTriggers = triggers.filter(t => t.is_active).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Triggers</h1>
          <p className="text-sm text-muted-foreground">Event-driven communication rules — send messages automatically when events occur</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />New Trigger
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10"><Zap className="size-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Triggers</p><p className="text-xl font-bold">{triggers.length}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50"><Zap className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{activeTriggers}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50"><Zap className="size-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Events Available</p><p className="text-xl font-bold">{EVENTS.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search triggers..." className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm" />
      </div>

      {/* Trigger list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading triggers...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Zap className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold">No triggers configured</p>
          <p className="text-xs text-muted-foreground mt-1">Create a trigger to automatically send messages when events occur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cm = channelMeta[t.channel] ?? channelMeta.email
            const Icon = cm.icon
            const eventLabel = EVENTS.find(e => e.key === t.event)?.label ?? t.event
            const eventCategory = EVENTS.find(e => e.key === t.event)?.category ?? "Other"
            return (
              <div key={t.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
                {/* Event */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Zap className="size-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">When: <span className="font-medium text-foreground">{eventLabel}</span></p>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="size-4 text-muted-foreground shrink-0" />

                {/* Channel + Template */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`size-10 rounded-lg ${cm.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`size-5 ${cm.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{cm.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.template_id ? templates.find(tpl => tpl.id === t.template_id)?.name ?? "Template" : "No template"}
                    </p>
                  </div>
                </div>

                {/* Category badge */}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{eventCategory}</span>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(t.id, !t.is_active)}
                    className="relative flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors"
                    style={{ backgroundColor: t.is_active ? "var(--color-primary)" : "var(--color-muted)" }}
                  >
                    <span className="absolute size-3.5 rounded-full bg-white shadow-sm transition-transform" style={{ transform: t.is_active ? "translateX(17px)" : "translateX(3px)" }} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50" title="Delete">
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-red-600" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Trigger Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New Communication Trigger</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
            </div>

            <div>
              <label className="text-sm font-medium">Trigger Name</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" placeholder="e.g., Order Delivery WhatsApp" autoFocus />
            </div>

            <div>
              <label className="text-sm font-medium">When this event occurs</label>
              <select value={form.event} onChange={(e) => setForm(p => ({ ...p, event: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">Select event...</option>
                {EVENT_CATEGORIES.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {EVENTS.filter(e => e.category === cat).map(e => (
                      <option key={e.key} value={e.key}>{e.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Send via</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {(["email", "whatsapp", "sms"] as const).map((ch) => {
                  const cm = channelMeta[ch]
                  const ChIcon = cm.icon
                  return (
                    <button key={ch} onClick={() => setForm(p => ({ ...p, channel: ch }))} className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${form.channel === ch ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <ChIcon className={`size-4 ${cm.color}`} /><span className="text-sm font-medium">{cm.label}</span>
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

            <div>
              <label className="text-sm font-medium">Space (optional — leave blank for global)</label>
              <select value={form.space_slug} onChange={(e) => setForm(p => ({ ...p, space_slug: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">All Spaces (Global)</option>
                <option value="b2b-ecommerce">Faire Wholesale Admin</option>
                <option value="legal">Legal Nations Admin</option>
                <option value="ets">EazyToSell Admin</option>
                <option value="usdrop">USDrop Admin</option>
                <option value="goyo">GoyoTours Admin</option>
                <option value="hq">Suprans HQ</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim() || !form.event}>{saving ? "Creating..." : "Create Trigger"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
