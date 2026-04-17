"use client"

import { useEffect, useState } from "react"
import { Mail, MessageCircle, Phone, Plus, X, Eye, Edit2, Trash2, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

type Channel = "email" | "whatsapp" | "sms"

interface Template {
  id: string
  name: string
  category: string
  template_type: string
  is_active: boolean
  created_at: string
  // email-specific
  subject?: string
  body_html?: string
  variables?: string[]
  // sms/whatsapp-specific
  body?: string
  channel?: string
}

const CATEGORIES = ["All", "marketing", "order", "reminder", "report", "notification", "general"]

export default function CommsTemplatesPage() {
  const [channel, setChannel] = useState<Channel>("email")
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [showCreate, setShowCreate] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", subject: "", body: "", category: "general", template_type: "utility", variables: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (channel === "email") {
        const { data } = await supabase.from("email_templates").select("*").order("name")
        setTemplates((data ?? []) as Template[])
      } else {
        const { data } = await supabase.from("sms_templates").select("*").eq("channel", channel).order("name")
        setTemplates((data ?? []) as Template[])
      }
      setLoading(false)
    }
    load()
  }, [channel])

  const filtered = templates.filter((t) => {
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    const vars = form.variables.split(",").map(v => v.trim()).filter(Boolean)

    if (channel === "email") {
      await supabase.from("email_templates").insert({
        name: form.name, subject: form.subject, body_html: form.body,
        category: form.category, template_type: form.template_type, variables: vars, is_active: true,
      })
    } else {
      await supabase.from("sms_templates").insert({
        name: form.name, body: form.body, channel,
        category: form.category, template_type: form.template_type, variables: vars, is_active: true,
      })
    }

    setSaving(false)
    setShowCreate(false)
    setForm({ name: "", subject: "", body: "", category: "general", template_type: "utility", variables: "" })
    // Reload
    if (channel === "email") {
      const { data } = await supabase.from("email_templates").select("*").order("name")
      setTemplates((data ?? []) as Template[])
    } else {
      const { data } = await supabase.from("sms_templates").select("*").eq("channel", channel).order("name")
      setTemplates((data ?? []) as Template[])
    }
  }

  async function handleDelete(id: string) {
    const table = channel === "email" ? "email_templates" : "sms_templates"
    await supabase.from(table).delete().eq("id", id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleToggle(id: string, active: boolean) {
    const table = channel === "email" ? "email_templates" : "sms_templates"
    await supabase.from(table).update({ is_active: active }).eq("id", id)
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t))
  }

  const channelTabs: { key: Channel; label: string; icon: typeof Mail }[] = [
    { key: "email", label: "Email", icon: Mail },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { key: "sms", label: "SMS", icon: Phone },
  ]

  const previewTemplate = previewId ? templates.find(t => t.id === previewId) : null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage message templates across all channels</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />New Template
        </Button>
      </div>

      {/* Channel tabs */}
      <div className="flex items-center gap-1 border rounded-lg p-1 w-fit bg-muted/30">
        {channelTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => { setChannel(tab.key); setCategoryFilter("All") }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                channel === tab.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />{tab.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm" />
        </div>
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                categoryFilter === cat ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-sm font-semibold">No templates found</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first {channel} template to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Name</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Category</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Type</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Variables</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-left">Status</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{t.name}</p>
                    {channel === "email" && t.subject && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{t.subject}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted capitalize">{t.category}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground capitalize">{t.template_type}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(t.variables ?? []).slice(0, 3).map((v) => (
                        <span key={v} className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>
                      ))}
                      {(t.variables ?? []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(t.variables ?? []).length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className={`size-2 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPreviewId(previewId === t.id ? null : t.id)} className="p-1.5 rounded hover:bg-muted" title="Preview"><Eye className="size-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleToggle(t.id, !t.is_active)} className="p-1.5 rounded hover:bg-muted" title="Toggle"><Edit2 className="size-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50" title="Delete"><Trash2 className="size-3.5 text-muted-foreground hover:text-red-600" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview panel */}
      {previewTemplate && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Preview: {previewTemplate.name}</h3>
            <button onClick={() => setPreviewId(null)} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
          </div>
          {channel === "email" ? (
            <div className="rounded border p-4 bg-background text-sm" dangerouslySetInnerHTML={{ __html: previewTemplate.body_html ?? "<p>No content</p>" }} />
          ) : (
            <div className="rounded border p-4 bg-background text-sm whitespace-pre-wrap font-mono">{previewTemplate.body ?? "No content"}</div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">New {channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "Email"} Template</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" placeholder="Template name" />
            </div>
            {channel === "email" && (
              <div>
                <label className="text-sm font-medium">Subject</label>
                <input value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" placeholder="Email subject" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{channel === "email" ? "Body (HTML)" : "Body"}</label>
              <textarea value={form.body} onChange={(e) => setForm(p => ({ ...p, body: e.target.value }))} rows={5} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none font-mono" placeholder={channel === "email" ? "<p>Hello {{name}}</p>" : "Hello {{name}}, your order {{order_id}} is confirmed."} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select value={form.template_type} onChange={(e) => setForm(p => ({ ...p, template_type: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="utility">Utility</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Variables (comma-separated)</label>
              <input value={form.variables} onChange={(e) => setForm(p => ({ ...p, variables: e.target.value }))} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" placeholder="name, order_id, amount" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Template"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
