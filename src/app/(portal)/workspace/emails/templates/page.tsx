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
  Search,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  category: string
  template_type: "marketing" | "utility"
  sub_type: "internal" | "external"
  variables: string[]
  is_active: boolean
  created_at: string
}

type MainTab = "marketing" | "utility"
type SubTab = "internal" | "external"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["marketing", "order", "team", "reminder", "report"]

const CATEGORY_STYLES: Record<string, string> = {
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  order: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  team: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  reminder: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  report: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

const TYPE_BADGES: Record<string, string> = {
  marketing: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  internal: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  external: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
}

/** Top color strip per category */
function categoryStrip(category: string) {
  switch (category) {
    case "marketing":
      return "bg-gradient-to-r from-blue-500 to-purple-500"
    case "reminder":
      return "bg-amber-500"
    case "team":
      return "bg-emerald-500"
    case "order":
      return "bg-blue-500"
    case "report":
      return "bg-slate-500"
    default:
      return "bg-zinc-400"
  }
}

const EMPTY_FORM = {
  name: "",
  subject: "",
  body_html: "",
  category: "marketing",
  template_type: "marketing" as "marketing" | "utility",
  sub_type: "external" as "internal" | "external",
  variables: [] as string[],
  is_active: true,
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Tabs
  const [mainTab, setMainTab] = useState<MainTab>("marketing")
  const [subTab, setSubTab] = useState<SubTab>("internal")

  // Search
  const [search, setSearch] = useState("")

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [variablesInput, setVariablesInput] = useState("")
  const [saving, setSaving] = useState(false)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

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
    const { data } = await supabase.from("email_templates").select("*").order("name")
    setTemplates((data ?? []) as EmailTemplate[])
    setLoading(false)
  }

  /* ---- stats ---- */

  const stats = useMemo(() => {
    const total = templates.length
    const marketing = templates.filter((t) => t.template_type === "marketing").length
    const utility = templates.filter((t) => t.template_type === "utility").length
    const utilityInternal = templates.filter((t) => t.template_type === "utility" && t.sub_type === "internal").length
    const utilityExternal = templates.filter((t) => t.template_type === "utility" && t.sub_type === "external").length
    return { total, marketing, utility, utilityInternal, utilityExternal }
  }, [templates])

  /* ---- filtered list ---- */

  const filtered = useMemo(() => {
    let list = templates.filter((t) => t.template_type === mainTab)
    if (mainTab === "utility") {
      list = list.filter((t) => t.sub_type === subTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
    }
    return list
  }, [templates, mainTab, subTab, search])

  /* ---- dialog helpers ---- */

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setVariablesInput("")
    setDialogOpen(true)
  }

  function openEdit(t: EmailTemplate) {
    setEditingId(t.id)
    setForm({
      name: t.name,
      subject: t.subject,
      body_html: t.body_html,
      category: t.category,
      template_type: t.template_type,
      sub_type: t.sub_type,
      variables: t.variables,
      is_active: t.is_active,
    })
    setVariablesInput((t.variables ?? []).join(", "))
    setDialogOpen(true)
  }

  function openPreview(t: EmailTemplate) {
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
      const res = await supabase.from("email_templates").update(payload).eq("id", editingId)
      error = res.error
    } else {
      const res = await supabase.from("email_templates").insert(payload)
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
    const { error } = await supabase.from("email_templates").delete().eq("id", id)
    if (error) {
      setToast({ type: "error", message: error.message })
    } else {
      setToast({ type: "success", message: "Template deleted" })
      fetchTemplates()
    }
  }

  function renderPreviewHtml(template: EmailTemplate) {
    let html = template.body_html
    ;(template.variables ?? []).forEach((v) => {
      html = html.replaceAll(`{{${v}}}`, `<strong style="color:#6366f1">[${v}]</strong>`)
    })
    return html
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
            Email Templates
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Create and manage email templates</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New Template
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{stats.total}</span>
        </span>
        <span className="text-muted-foreground">
          Marketing: <span className="font-semibold text-foreground">{stats.marketing}</span>
        </span>
        <span className="text-muted-foreground">
          Utility: <span className="font-semibold text-foreground">{stats.utility}</span>
          <span className="ml-1 text-xs">
            (Internal: {stats.utilityInternal}, External: {stats.utilityExternal})
          </span>
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Main Tab Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 border-b">
          {(["marketing", "utility"] as MainTab[]).map((tab) => {
            const count = tab === "marketing" ? stats.marketing : stats.utility
            return (
              <button
                key={tab}
                onClick={() => {
                  setMainTab(tab)
                  if (tab === "utility") setSubTab("internal")
                }}
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                  mainTab === tab
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium ${
                    mainTab === tab
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sub-tabs for Utility */}
        {mainTab === "utility" && (
          <div className="flex items-center gap-1">
            {(["internal", "external"] as SubTab[]).map((st) => {
              const count = st === "internal" ? stats.utilityInternal : stats.utilityExternal
              return (
                <button
                  key={st}
                  onClick={() => setSubTab(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    subTab === st
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                  <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-md border bg-card overflow-hidden">
            {/* Color strip */}
            <div className={`h-1.5 ${categoryStrip(t.category)}`} />

            {/* Card body */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>
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
                {/* Category badge */}
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    CATEGORY_STYLES[t.category] ?? CATEGORY_STYLES.report
                  }`}
                >
                  <Tag className="size-3" />
                  {t.category}
                </span>

                {/* Type badge */}
                <span
                  className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                    t.template_type === "marketing"
                      ? TYPE_BADGES.marketing
                      : TYPE_BADGES[t.sub_type] ?? TYPE_BADGES.internal
                  }`}
                >
                  {t.template_type === "marketing"
                    ? "Marketing"
                    : t.sub_type === "internal"
                      ? "Internal"
                      : "External"}
                </span>

                {/* Variable count */}
                {t.variables && t.variables.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Code className="size-3" />
                    {`{{${t.variables.length}}} variables`}
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
            {search ? "No templates match your search." : "No templates in this category yet. Click \"New Template\" to create one."}
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
                  placeholder="e.g. Welcome Email"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Welcome to the team, {{name}}!"
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
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

              {/* Type: Marketing or Utility */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                <div className="flex items-center gap-4">
                  {(["marketing", "utility"] as const).map((tt) => (
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

              {/* Sub-type: Internal or External (shown for Utility) */}
              {form.template_type === "utility" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sub-type</label>
                  <div className="flex items-center gap-4">
                    {(["internal", "external"] as const).map((st) => (
                      <label key={st} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sub_type"
                          checked={form.sub_type === st}
                          onChange={() => setForm((f) => ({ ...f, sub_type: st }))}
                          className="accent-primary"
                        />
                        <span className="text-sm">{st.charAt(0).toUpperCase() + st.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Body HTML */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Body HTML</label>
                <textarea
                  value={form.body_html}
                  onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
                  placeholder="<h1>Hello {{name}}</h1><p>Welcome aboard!</p>"
                  className="w-full min-h-[250px] px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
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
                  placeholder="name, date, amount"
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
                disabled={!form.name || saving}
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
          <div className="bg-card border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Preview: {previewTemplate.name}</h2>
              <button onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Subject */}
              <div className="rounded-md border px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-semibold">{previewTemplate.subject}</p>
              </div>

              {/* Rendered HTML */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Body</p>
                <div
                  className="rounded-md border p-6 text-sm leading-relaxed bg-white dark:bg-zinc-900"
                  dangerouslySetInnerHTML={{ __html: renderPreviewHtml(previewTemplate) }}
                />
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
                        {`{{${v}}}`} = <span className="text-muted-foreground italic">[{v}]</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Link
                  href="/workspace/emails/compose"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
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
