"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageResourcesButton } from "@/components/shared/page-resources"
import {
  Plus,
  Search,
  Eye,
  ClipboardList,
  FileEdit,
  Send,
  FileCheck,
  CheckCircle,
  XCircle,
  PackageOpen,
  X,
  ArrowRight,
  ArrowLeft,
  Store,
  Mail,
  Globe,
  ShoppingBag,
  StickyNote,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SellerApplication {
  id: string
  brand_name: string | null
  category: string | null
  brand_story: string | null
  email_id: string | null
  email_type: string | null
  application_date: string | null
  status: "drafting" | "applied" | "pending_docs" | "approved" | "rejected"
  marketplace_strategy: "website" | "etsy" | "both" | null
  domain_name: string | null
  website_url: string | null
  etsy_store_url: string | null
  num_products_listed: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "drafting", label: "Drafting" },
  { value: "applied", label: "Applied" },
  { value: "pending_docs", label: "Pending Docs" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  drafting: { bg: "bg-slate-100", text: "text-slate-700", label: "Drafting" },
  applied: { bg: "bg-blue-50", text: "text-blue-700", label: "Applied" },
  pending_docs: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Docs" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
}

const STATUS_ICON_CFG: Record<string, { icon: typeof FileEdit; color: string; bg: string }> = {
  drafting: { icon: FileEdit, color: "text-slate-600", bg: "bg-slate-500/10" },
  applied: { icon: Send, color: "text-blue-600", bg: "bg-blue-500/10" },
  pending_docs: { icon: FileCheck, color: "text-amber-600", bg: "bg-amber-500/10" },
  approved: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
}

const STRATEGY_LABEL: Record<string, string> = { website: "Website", etsy: "Etsy", both: "Both" }

const KANBAN_COLUMNS = [
  { key: "drafting", label: "Drafting", color: "#94a3b8" },
  { key: "applied", label: "Applied", color: "#3b82f6" },
  { key: "pending_docs", label: "Pending Docs", color: "#f59e0b" },
  { key: "approved", label: "Approved", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
] as const

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/* ------------------------------------------------------------------ */
/*  Multi-Step Create Dialog                                           */
/* ------------------------------------------------------------------ */

const STEPS = [
  { id: 1, label: "Brand Info", icon: Store },
  { id: 2, label: "Contact & Strategy", icon: Mail },
  { id: 3, label: "Online Presence", icon: Globe },
  { id: 4, label: "Review & Submit", icon: CheckCircle },
]

function NewApplicationDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    brand_name: "",
    category: "",
    brand_story: "",
    email_id: "",
    email_type: "basic" as "basic" | "branded",
    marketplace_strategy: "website" as "website" | "etsy" | "both",
    domain_name: "",
    website_url: "",
    etsy_store_url: "",
    notes: "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function canProceed(): boolean {
    if (step === 1) return form.brand_name.trim().length > 0
    return true
  }

  async function handleSubmit() {
    if (!form.brand_name.trim()) return
    setSaving(true)
    const { error } = await supabase.from("faire_seller_applications").insert({
      brand_name: form.brand_name.trim(),
      category: form.category.trim() || null,
      brand_story: form.brand_story.trim() || null,
      email_id: form.email_id.trim() || null,
      email_type: form.email_type,
      marketplace_strategy: form.marketplace_strategy,
      domain_name: form.domain_name.trim() || null,
      website_url: form.website_url.trim() || null,
      etsy_store_url: form.etsy_store_url.trim() || null,
      notes: form.notes.trim() || null,
      status: "drafting",
    })
    setSaving(false)
    if (error) { console.error("Insert error:", error); return }
    setForm({ brand_name: "", category: "", brand_story: "", email_id: "", email_type: "basic", marketplace_strategy: "website", domain_name: "", website_url: "", etsy_store_url: "", notes: "" })
    setStep(1)
    onCreated()
    onClose()
  }

  if (!open) return null

  const showWebsite = form.marketplace_strategy === "website" || form.marketplace_strategy === "both"
  const showEtsy = form.marketplace_strategy === "etsy" || form.marketplace_strategy === "both"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border bg-card shadow-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">New Faire Store Application</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Step {step} of 4 — {STEPS[step - 1].label}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${isActive ? "bg-primary text-white font-medium" : isDone ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {isDone ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${isDone ? "bg-emerald-500" : "bg-border"} mx-1`} />}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="p-6 min-h-[280px]">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium">Brand Name <span className="text-red-500">*</span></label>
                <Input value={form.brand_name} onChange={(e) => update("brand_name", e.target.value)} className="mt-1.5" placeholder="Enter your brand name" />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1.5" placeholder="e.g., Home & Living, Jewelry, Toys" />
              </div>
              <div>
                <label className="text-sm font-medium">Brand Story</label>
                <textarea value={form.brand_story} onChange={(e) => update("brand_story", e.target.value)} className="mt-1.5 w-full rounded-md border p-3 text-sm min-h-[100px] resize-none" placeholder="Tell us about this brand — what makes it unique, who's the target retailer..." />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input value={form.email_id} onChange={(e) => update("email_id", e.target.value)} className="mt-1.5" placeholder="contact@brand.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Email Type</label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">Branded emails (name@domain.com) perform better on Faire</p>
                <div className="flex gap-3">
                  {(["basic", "branded"] as const).map((t) => (
                    <button key={t} onClick={() => update("email_type", t)} className={`flex-1 rounded-md border p-3 text-sm text-left transition-colors ${form.email_type === t ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50"}`}>
                      <span className="block font-medium">{t === "basic" ? "Basic" : "Branded"}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{t === "basic" ? "Gmail, Outlook, etc." : "name@yourbrand.com"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Marketplace Strategy</label>
                <div className="flex gap-3 mt-1.5">
                  {(["website", "etsy", "both"] as const).map((s) => (
                    <button key={s} onClick={() => update("marketplace_strategy", s)} className={`flex-1 rounded-md border p-3 text-sm text-center transition-colors ${form.marketplace_strategy === s ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50"}`}>
                      {STRATEGY_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {showWebsite && (
                <>
                  <div>
                    <label className="text-sm font-medium">Domain Name</label>
                    <Input value={form.domain_name} onChange={(e) => update("domain_name", e.target.value)} className="mt-1.5" placeholder="brandname.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website URL</label>
                    <Input value={form.website_url} onChange={(e) => update("website_url", e.target.value)} className="mt-1.5" placeholder="https://brandname.com" />
                  </div>
                </>
              )}
              {showEtsy && (
                <div>
                  <label className="text-sm font-medium">Etsy Store URL</label>
                  <Input value={form.etsy_store_url} onChange={(e) => update("etsy_store_url", e.target.value)} className="mt-1.5" placeholder="https://etsy.com/shop/..." />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Internal Notes</label>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="mt-1.5 w-full rounded-md border p-3 text-sm min-h-[80px] resize-none" placeholder="Any internal notes for the team..." />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Review the application before submitting.</p>
              <div className="rounded-md border divide-y">
                <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Brand Name</span><span className="text-sm font-medium">{form.brand_name || "—"}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Category</span><span className="text-sm font-medium">{form.category || "—"}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-medium">{form.email_id || "—"}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Email Type</span><span className="text-sm font-medium capitalize">{form.email_type}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Strategy</span><span className="text-sm font-medium">{STRATEGY_LABEL[form.marketplace_strategy]}</span></div>
                {form.domain_name && <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Domain</span><span className="text-sm font-medium">{form.domain_name}</span></div>}
                {form.website_url && <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Website</span><span className="text-sm font-medium">{form.website_url}</span></div>}
                {form.etsy_store_url && <div className="flex justify-between px-4 py-3"><span className="text-sm text-muted-foreground">Etsy Store</span><span className="text-sm font-medium">{form.etsy_store_url}</span></div>}
              </div>
              {form.brand_story && (
                <div className="rounded-md border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Brand Story</p>
                  <p className="text-sm">{form.brand_story}</p>
                </div>
              )}
              {form.notes && (
                <div className="rounded-md border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm">{form.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/20">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving || !form.brand_name.trim()}>
                {saving ? "Creating..." : "Create Application"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SellerApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [view, setView] = useState<"list" | "board">("list")
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  type SortKey = "date" | "name"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const fetchApplications = useCallback(() => {
    setLoading(true)
    supabase
      .from("faire_seller_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Fetch error:", error)
        setApplications((data ?? []) as SellerApplication[])
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const counts = {
    total: applications.length,
    drafting: applications.filter((a) => a.status === "drafting").length,
    applied: applications.filter((a) => a.status === "applied").length,
    pending_docs: applications.filter((a) => a.status === "pending_docs").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  }

  const filtered = useMemo(() => {
    let result = applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = [app.brand_name, app.category, app.email_id].filter(Boolean).join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        case "name":
          return dir * ((a.brand_name ?? "").localeCompare(b.brand_name ?? ""))
        default:
          return 0
      }
    })
    return result
  }, [applications, statusFilter, search, sortKey, sortDir])

  const appsByStatus = useMemo(() => {
    const groups: Record<string, SellerApplication[]> = { drafting: [], applied: [], pending_docs: [], approved: [], rejected: [] }
    for (const app of applications) groups[app.status]?.push(app)
    return groups
  }, [applications])

  async function updateAppStatus(appId: string, newStatus: SellerApplication["status"]) {
    setUpdatingStatus(appId)
    const { error } = await supabase
      .from("faire_seller_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId)
    if (error) console.error("Status update error:", error)
    else fetchApplications()
    setUpdatingStatus(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-start justify-between">
          <div><div className="h-7 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div>
          <div className="h-9 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-md bg-muted animate-pulse" />)}</div>
        <div className="rounded-md border bg-card overflow-hidden">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 border-b bg-muted/30 animate-pulse" />)}</div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div><h1 className="text-2xl font-bold font-heading text-foreground">Seller Applications</h1><p className="mt-0.5 text-sm text-muted-foreground">Manage new Faire store applications</p></div>
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center"><PackageOpen className="h-8 w-8 text-muted-foreground" /></div>
            <div><p className="text-sm font-semibold">No applications yet</p><p className="text-sm text-muted-foreground mt-1">Create your first seller application to get started</p></div>
            <Button onClick={() => setDialogOpen(true)}><Plus className="size-4 mr-1" /> Create Application</Button>
          </div>
        </div>
        <NewApplicationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={fetchApplications} />
      </div>
    )
  }

  const statCards = [
    { label: "Total", value: counts.total, status: null as string | null, iconKey: null },
    { label: "Drafting", value: counts.drafting, status: "drafting", iconKey: "drafting" },
    { label: "Applied", value: counts.applied, status: "applied", iconKey: "applied" },
    { label: "Pending", value: counts.pending_docs, status: "pending_docs", iconKey: "pending_docs" },
    { label: "Approved", value: counts.approved, status: "approved", iconKey: "approved" },
    { label: "Rejected", value: counts.rejected, status: "rejected", iconKey: "rejected" },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Seller Applications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage new Faire store applications</p>
        </div>
        <div className="flex items-center gap-2">
          <PageResourcesButton pageRoute="/workspace/applications" />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" /> New Application
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const cfg = card.iconKey ? STATUS_ICON_CFG[card.iconKey] : null
          const Icon = cfg?.icon ?? ClipboardList
          return (
            <button key={card.label} onClick={() => setStatusFilter(card.status ?? "all")} className={`rounded-md border bg-card p-4 flex items-start justify-between text-left transition-colors ${statusFilter === (card.status ?? "all") ? "ring-2 ring-primary/30" : "hover:bg-muted/30"}`}>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="text-xl font-bold font-heading mt-1">{card.value}</p>
              </div>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${cfg?.bg ?? "bg-primary/10"}`}>
                <Icon className={`h-4 w-4 ${cfg?.color ?? "text-primary"}`} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications..." className="h-9 w-64 pl-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="flex items-center border rounded-md overflow-hidden">
          <button onClick={() => setView("list")} className={view === "list" ? "h-7 px-2.5 text-xs bg-primary text-primary-foreground" : "h-7 px-2.5 text-xs text-muted-foreground hover:bg-muted"}>
            <List className="size-3.5" />
          </button>
          <button onClick={() => setView("board")} className={view === "board" ? "h-7 px-2.5 text-xs bg-primary text-primary-foreground" : "h-7 px-2.5 text-xs text-muted-foreground hover:bg-muted"}>
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Table (List View) */}
      {view === "list" && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center">Brand <SortIcon col="name" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Strategy</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    <span className="flex items-center">Created <SortIcon col="date" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No applications match your filters.</td></tr>
                ) : filtered.map((app) => {
                  const badge = STATUS_BADGE[app.status]
                  return (
                    <tr key={app.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/workspace/applications/${app.id}`)}>
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{getInitials(app.brand_name)}</div>
                          <span className="font-medium">{app.brand_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{app.category ?? "—"}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span></td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground truncate max-w-[200px]">{app.email_id ?? "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{app.marketplace_strategy ? STRATEGY_LABEL[app.marketplace_strategy] : "—"}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(app.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/workspace/applications/${app.id}`) }}>
                          <Eye className="size-3 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">Showing {filtered.length} of {applications.length} applications</div>
        </div>
      )}

      {/* Board View */}
      {view === "board" && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-5 gap-3 min-w-[1100px]">
            {KANBAN_COLUMNS.map((col) => {
              const colApps = appsByStatus[col.key] ?? []
              return (
                <div key={col.key} className="rounded-md border bg-card overflow-hidden min-w-[200px]">
                  {/* Column Header */}
                  <div className="px-3 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-medium uppercase tracking-wide">{col.label}</span>
                    </div>
                    <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{colApps.length}</span>
                  </div>

                  {/* Column Body */}
                  <div className="p-2 space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                    {colApps.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">No applications</p>
                    )}
                    {colApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => router.push(`/workspace/applications/${app.id}`)}
                        className="rounded-md border bg-card p-3 hover:shadow-sm transition-shadow cursor-pointer"
                      >
                        <p className="text-sm font-medium truncate">{app.brand_name ?? "—"}</p>
                        {app.category && <p className="text-xs text-muted-foreground mt-0.5">{app.category}</p>}
                        {app.email_id && <p className="text-xs text-muted-foreground truncate mt-0.5">{app.email_id}</p>}
                        {app.marketplace_strategy && (
                          <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground mt-1">
                            {STRATEGY_LABEL[app.marketplace_strategy] ?? app.marketplace_strategy}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(app.created_at)}</p>

                        {/* Action buttons based on column */}
                        {col.key === "drafting" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "applied") }}
                            disabled={updatingStatus === app.id}
                            className="mt-2 w-full h-7 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {updatingStatus === app.id ? "Updating..." : "Submit"}
                          </button>
                        )}
                        {col.key === "applied" && (
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "pending_docs") }}
                              disabled={updatingStatus === app.id}
                              className="flex-1 h-7 text-xs font-medium rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              Docs
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "approved") }}
                              disabled={updatingStatus === app.id}
                              className="flex-1 h-7 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "rejected") }}
                              disabled={updatingStatus === app.id}
                              className="flex-1 h-7 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {col.key === "pending_docs" && (
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "approved") }}
                              disabled={updatingStatus === app.id}
                              className="flex-1 h-7 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateAppStatus(app.id, "rejected") }}
                              disabled={updatingStatus === app.id}
                              className="flex-1 h-7 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {(col.key === "approved" || col.key === "rejected") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/workspace/applications/${app.id}`) }}
                            className="mt-2 w-full h-7 text-xs font-medium rounded-md border text-center hover:bg-muted transition-colors"
                          >
                            View
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <NewApplicationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={fetchApplications} />
    </div>
  )
}
