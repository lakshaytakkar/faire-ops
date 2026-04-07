"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  FileText,
  Plus,
  Pencil,
  Eye,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Tag,
  Code,
  MessageSquare,
  Phone,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SmsTemplate {
  id: string
  name: string
  body: string
  channel: "sms" | "whatsapp"
  category: string
  template_type: "utility" | "marketing"
  variables: string[]
  is_active: boolean
  created_at?: string
}

type ChannelTab = "sms" | "whatsapp"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["general", "order", "marketing", "reminder", "notification"]

const CATEGORY_STYLES: Record<string, string> = {
  general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  order: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  reminder: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  notification: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

const TYPE_BADGES: Record<string, string> = {
  utility: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
}

const CHANNEL_STYLES: Record<string, string> = {
  sms: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

const EMPTY_FORM = {
  name: "",
  body: "",
  channel: "sms" as "sms" | "whatsapp",
  category: "general",
  template_type: "utility" as "utility" | "marketing",
  variables: [] as string[],
  is_active: true,
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MessagingTemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Tabs
  const [channelTab, setChannelTab] = useState<ChannelTab>("sms")

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [variablesInput, setVariablesInput] = useState("")
  const [saving, setSaving] = useState(false)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(null)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  /* ---- data fetch ---- */

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchTemplates() {
    setLoading(true)
    const { data } = await supabase.from("sms_templates").select("*").order("name")
    setTemplates((data ?? []) as SmsTemplate[])
    setLoading(false)
  }

  /* ---- filtered list ---- */

  const filtered = useMemo(() => {
    return templates.filter((t) => t.channel === channelTab)
  }, [templates, channelTab])

  const smsCount = templates.filter((t) => t.channel === "sms").length
  const whatsappCount = templates.filter((t) => t.channel === "whatsapp").length

  /* ---- dialog helpers ---- */

  function openNew() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, channel: channelTab })
    setVariablesInput("")
    setDialogOpen(true)
  }

  function openEdit(t: SmsTemplate) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      body: t.body,
      channel: t.channel,
      category: t.category,
      template_type: t.template_type,
      variables: t.variables,
      is_active: t.is_active,
    })
    setVariablesInput((t.variables ?? []).join(", "))
    setDialogOpen(true)
  }

  function openPreview(t: SmsTemplate) {
    setPreviewTemplate(t)
    setPreviewOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const vars = variablesInput
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    const payload = { ...form, variables: vars }

    let error
    if (editingId) {
      const res = await supabase.from("sms_templates").update(payload).eq("id", editingId)
      error = res.error
    } else {
      const res = await supabase.from("sms_templates").insert(payload)
      error = res.error
    }

    if (error) {
      setToast({ type: "error", message: error.message })
    } else {
      setToast({ type: "success", message: editingId ? "Template updated" : "Template created" })
      setDialogOpen(false)
      fetchTemplates()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return
    const { error } = await supabase.from("sms_templates").delete().eq("id", id)
    if (error) {
      setToast({ type: "error", message: error.message })
    } else {
      setToast({ type: "success", message: "Template deleted" })
      fetchTemplates()
    }
  }

  function renderPreviewBody(template: SmsTemplate) {
    let body = template.body
    ;(template.variables ?? []).forEach((v) => {
      body = body.replaceAll(`{{${v}}}`, `[${v}]`)
    })
    return body
  }

  /* ---- loading state ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ---- render ---- */

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <FileText className="size-6" />
            Message Templates
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Create and manage SMS &amp; WhatsApp templates</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New Template
        </button>
      </div>

      {/* Channel Tabs */}
      <div className="flex items-center gap-1 border-b">
        {(["sms", "whatsapp"] as ChannelTab[]).map((tab) => {
          const count = tab === "sms" ? smsCount : whatsappCount
          const TabIcon = tab === "sms" ? Phone : MessageSquare
          return (
            <button
              key={tab}
              onClick={() => setChannelTab(tab)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                channelTab === tab
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t " +
                    (tab === "sms" ? "after:bg-blue-500" : "after:bg-emerald-500")
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TabIcon className="size-3.5" />
              {tab === "sms" ? "SMS" : "WhatsApp"}
              <span
                className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium ${
                  channelTab === tab ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-md border bg-card overflow-hidden">
            {/* Color strip */}
            <div className={`h-1.5 ${t.channel === "sms" ? "bg-blue-500" : "bg-emerald-500"}`} />

            {/* Card body */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.body}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    t.is_active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      t.is_active ? "bg-emerald-500" : "bg-zinc-400"
                    }`}
                  />
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Channel badge */}
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHANNEL_STYLES[t.channel]}`}>
                  {t.channel === "sms" ? <Phone className="size-3" /> : <MessageSquare className="size-3" />}
                  {t.channel === "sms" ? "SMS" : "WhatsApp"}
                </span>

                {/* Category badge */}
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    CATEGORY_STYLES[t.category] ?? CATEGORY_STYLES.general
                  }`}
                >
                  <Tag className="size-3" />
                  {t.category}
                </span>

                {/* Type badge */}
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGES[t.template_type]}`}>
                  {t.template_type === "marketing" ? "Marketing" : "Utility"}
                </span>

                {/* Variable count */}
                {t.variables && t.variables.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Code className="size-3" />
                    {t.variables.length} var{t.variables.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Card footer */}
            <div className="border-t px-4 py-2.5 flex justify-between items-center">
              <button
                onClick={() => openPreview(t)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
              >
                <Eye className="size-3" />
                Preview
              </button>
              <button
                onClick={() => openEdit(t)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
              >
                <Pencil className="size-3" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="size-3" />
                Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
            No {channelTab === "sms" ? "SMS" : "WhatsApp"} templates yet. Click &quot;New Template&quot; to create one.
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/*  New / Edit Template Dialog                                      */}
      {/* ================================================================ */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{editingId ? "Edit Template" : "New Template"}</h2>
              <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Order Confirmation"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Channel */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as "sms" | "whatsapp" }))}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder={form.channel === "whatsapp"
                    ? "Hi {{name}}, your order #{{order_id}} is confirmed! Use *bold* and _italic_."
                    : "Hi {{name}}, your order #{{order_id}} has been confirmed."}
                  className="w-full min-h-[150px] px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use {"{{variable_name}}"} for dynamic content
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                <div className="flex items-center gap-4">
                  {(["utility", "marketing"] as const).map((tt) => (
                    <label key={tt} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="template_type"
                        checked={form.template_type === tt}
                        onChange={() => setForm((f) => ({ ...f, template_type: tt }))}
                        className="accent-primary"
                      />
                      <span className="text-sm">{tt.charAt(0).toUpperCase() + tt.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Variables (comma-separated)
                </label>
                <input
                  type="text"
                  value={variablesInput}
                  onChange={(e) => setVariablesInput(e.target.value)}
                  placeholder="name, order_id, amount"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Is Active */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.is_active ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      form.is_active ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-muted-foreground">{form.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.body || saving}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Preview Modal                                                   */}
      {/* ================================================================ */}
      {previewOpen && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Preview: {previewTemplate.name}</h2>
              <button onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Channel badge */}
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHANNEL_STYLES[previewTemplate.channel]}`}>
                {previewTemplate.channel === "sms" ? "SMS" : "WhatsApp"}
              </span>

              {/* Message preview */}
              <div className="flex justify-center">
                <div className={`max-w-[280px] w-full rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  previewTemplate.channel === "whatsapp"
                    ? "bg-[#dcf8c6] dark:bg-emerald-900 text-zinc-800 dark:text-emerald-100"
                    : "bg-blue-500 text-white"
                }`}>
                  {renderPreviewBody(previewTemplate)}
                </div>
              </div>

              {/* Variables */}
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map((v) => (
                      <span
                        key={v}
                        className="text-xs font-mono bg-muted px-2.5 py-1 rounded-md border"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Link
                  href={`/workspace/messaging/${previewTemplate.channel}`}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Use This Template
                </Link>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
