"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle,
  AlertTriangle,
  StickyNote,
  ExternalLink,
  X,
  Plus,
  Pencil,
  Link2,
  Globe,
  ShoppingBag,
  FileText,
  FileEdit,
  Send,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SellerApplication {
  id: string
  brand_name: string
  category: string | null
  brand_story: string | null
  logo_url: string | null
  email_id: string | null
  email_type: string | null
  application_date: string | null
  status: "drafting" | "applied" | "pending_docs" | "approved" | "rejected"
  marketplace_strategy: string | null
  domain_name: string | null
  website_url: string | null
  etsy_store_url: string | null
  reference_store_url: string | null
  num_products_listed: number | null
  listing_method: string | null
  faire_reg_url: string | null
  notes: string | null
  linked_store_id: string | null
  created_at: string
  updated_at: string
}

interface Followup {
  id: string
  application_id: string
  followup_date: string
  followup_type: "email" | "call" | "doc_submitted" | "doc_requested" | "note"
  note: string | null
  created_at: string
}

interface AppLink {
  id: string
  application_id: string
  label: string
  url: string
  link_type: "domain" | "faire_reg" | "marketplace" | "website" | "other"
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<string, string> = {
  drafting: "bg-slate-100 text-slate-600",
  applied: "bg-blue-50 text-blue-700",
  pending_docs: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
}

const STATUS_LABEL: Record<string, string> = {
  drafting: "Drafting",
  applied: "Applied",
  pending_docs: "Pending Docs",
  approved: "Approved",
  rejected: "Rejected",
}

const FOLLOWUP_TYPE_CONFIG: Record<
  string,
  { icon: typeof Mail; color: string; bg: string; label: string }
> = {
  email: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50", label: "Email" },
  call: { icon: Phone, color: "text-violet-600", bg: "bg-violet-50", label: "Call" },
  doc_submitted: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "Doc Submitted" },
  doc_requested: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", label: "Doc Requested" },
  note: { icon: StickyNote, color: "text-slate-600", bg: "bg-slate-100", label: "Note" },
}

const LINK_TYPE_ICON: Record<string, typeof Globe> = {
  domain: Globe,
  faire_reg: FileText,
  marketplace: ShoppingBag,
  website: Globe,
  other: Link2,
}

const LINK_TYPE_BADGE: Record<string, string> = {
  domain: "bg-blue-50 text-blue-700",
  faire_reg: "bg-violet-50 text-violet-700",
  marketplace: "bg-emerald-50 text-emerald-700",
  website: "bg-slate-100 text-slate-600",
  other: "bg-slate-100 text-slate-600",
}

const TIMELINE_STAGES = [
  { key: "drafting", label: "Drafting", icon: FileEdit },
  { key: "applied", label: "Applied", icon: Send },
  { key: "pending_docs", label: "Pending Docs", icon: FileCheck },
  { key: "approved", label: "Approved", icon: CheckCircle },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function truncateId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [app, setApp] = useState<SellerApplication | null>(null)
  const [followups, setFollowups] = useState<Followup[]>([])
  const [links, setLinks] = useState<AppLink[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState<Partial<SellerApplication>>({})
  const [saving, setSaving] = useState(false)

  // Follow-up dialog
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [newFollowup, setNewFollowup] = useState({ followup_date: "", followup_type: "note" as Followup["followup_type"], note: "" })

  // Link dialog
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [newLink, setNewLink] = useState({ label: "", url: "", link_type: "other" as AppLink["link_type"] })

  // Prev/next navigation
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})

  /* ── Fetch ── */

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [appRes, followupsRes, linksRes] = await Promise.all([
      supabase.from("faire_seller_applications").select("*").eq("id", id).single(),
      supabase.from("faire_application_followups").select("*").eq("application_id", id).order("followup_date", { ascending: false }),
      supabase.from("faire_application_links").select("*").eq("application_id", id),
    ])

    if (appRes.error || !appRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setApp(appRes.data as SellerApplication)
    setFollowups((followupsRes.data ?? []) as Followup[])
    setLinks((linksRes.data ?? []) as AppLink[])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!app) return
    supabase
      .from("faire_seller_applications")
      .select("id")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const idx = data.findIndex(o => o.id === id)
        setAdjacentIds({
          prev: idx > 0 ? data[idx - 1].id : null,
          next: idx < data.length - 1 ? data[idx + 1].id : null,
        })
      })
  }, [app, id])

  /* ── Status update ── */

  async function updateStatus(status: SellerApplication["status"]) {
    if (!app) return
    const { error } = await supabase
      .from("faire_seller_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (!error) setApp({ ...app, status, updated_at: new Date().toISOString() })
  }

  /* ── Edit save ── */

  async function saveEdits() {
    if (!app) return
    setSaving(true)
    const payload = { ...editFields, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from("faire_seller_applications")
      .update(payload)
      .eq("id", id)
    if (!error) {
      setApp({ ...app, ...payload } as SellerApplication)
      setEditing(false)
    }
    setSaving(false)
  }

  function startEditing() {
    if (!app) return
    setEditFields({
      brand_name: app.brand_name,
      category: app.category,
      email_id: app.email_id,
      email_type: app.email_type,
      marketplace_strategy: app.marketplace_strategy,
      domain_name: app.domain_name,
      website_url: app.website_url,
      etsy_store_url: app.etsy_store_url,
      reference_store_url: app.reference_store_url,
      num_products_listed: app.num_products_listed,
      listing_method: app.listing_method,
      faire_reg_url: app.faire_reg_url,
      brand_story: app.brand_story,
      notes: app.notes,
    })
    setEditing(true)
  }

  /* ── Follow-up CRUD ── */

  async function addFollowup() {
    if (!newFollowup.followup_date) return
    const { error } = await supabase
      .from("faire_application_followups")
      .insert({ application_id: id, ...newFollowup })
    if (!error) {
      setShowFollowupForm(false)
      setNewFollowup({ followup_date: "", followup_type: "note", note: "" })
      // Re-fetch followups
      const { data } = await supabase.from("faire_application_followups").select("*").eq("application_id", id).order("followup_date", { ascending: false })
      setFollowups((data ?? []) as Followup[])
    }
  }

  async function deleteFollowup(fid: string) {
    const { error } = await supabase.from("faire_application_followups").delete().eq("id", fid)
    if (!error) setFollowups((prev) => prev.filter((f) => f.id !== fid))
  }

  /* ── Link CRUD ── */

  async function addLink() {
    if (!newLink.label || !newLink.url) return
    const { error } = await supabase
      .from("faire_application_links")
      .insert({ application_id: id, ...newLink })
    if (!error) {
      setShowLinkForm(false)
      setNewLink({ label: "", url: "", link_type: "other" })
      const { data } = await supabase.from("faire_application_links").select("*").eq("application_id", id)
      setLinks((data ?? []) as AppLink[])
    }
  }

  async function deleteLink(lid: string) {
    const { error } = await supabase.from("faire_application_links").delete().eq("id", lid)
    if (!error) setLinks((prev) => prev.filter((l) => l.id !== lid))
  }

  /* ── Loading skeleton ── */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-64 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-36 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  /* ── 404 ── */

  if (notFound || !app) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">Application not found</p>
          <Link href="/workspace/applications" className="text-sm text-primary hover:underline mt-2 inline-block">
            ← Back to Applications
          </Link>
        </div>
      </div>
    )
  }

  /* ── Edit field helper ── */

  function editVal(key: keyof SellerApplication) {
    return (editFields as Record<string, unknown>)[key] as string ?? ""
  }
  function setEditVal(key: keyof SellerApplication, val: string | number | null) {
    setEditFields((prev) => ({ ...prev, [key]: val }))
  }

  /* ── Info row ── */

  function InfoRow({ label, value, editKey }: { label: string; value: string | number | null; editKey?: keyof SellerApplication }) {
    if (editing && editKey) {
      return (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Input
            value={editVal(editKey)}
            onChange={(e) => setEditVal(editKey, editKey === "num_products_listed" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
            className="text-sm"
          />
        </div>
      )
    }
    return (
      <div className="space-y-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    )
  }

  /* ── Render ── */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/workspace/applications" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="size-3" /> Applications
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{app.brand_name}</h1>
            <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[app.status]}`}>
              {STATUS_LABEL[app.status]}
            </span>
            {app.category && (
              <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {app.category}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Applied {fmtDate(app.application_date)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <div className="flex items-center gap-1 mr-2">
            <Link
              href={adjacentIds.prev ? `/workspace/applications/${adjacentIds.prev}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Previous application"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={adjacentIds.next ? `/workspace/applications/${adjacentIds.next}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Next application"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {/* Status action buttons */}
          {app.status === "drafting" && (
            <Button size="sm" className="h-8 text-xs" onClick={() => updateStatus("applied")}>
              Mark Applied
            </Button>
          )}
          {app.status === "applied" && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => updateStatus("pending_docs")}>
                Docs Requested
              </Button>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus("approved")}>
                Mark Approved
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => updateStatus("rejected")}>
                Mark Rejected
              </Button>
            </>
          )}
          {app.status === "pending_docs" && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => updateStatus("applied")}>
                Mark Applied
              </Button>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus("approved")}>
                Mark Approved
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => updateStatus("rejected")}>
                Mark Rejected
              </Button>
            </>
          )}
          {app.status === "approved" && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { /* Link to store - placeholder */ }}>
              Link to Store
            </Button>
          )}
          {/* Edit button */}
          {!editing ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={startEditing}>
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={saveEdits} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stage Timeline Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><span className="text-sm font-semibold">Application Stage</span></div>
            <div className="p-4">
              <div className="space-y-5">
                {TIMELINE_STAGES.map((stage, i) => {
                  const stageIndex = TIMELINE_STAGES.findIndex(s => s.key === app.status)
                  const currentIndex = TIMELINE_STAGES.findIndex(s => s.key === stage.key)
                  const state = app.status === "rejected" ? (currentIndex === 0 ? "done" : "upcoming")
                              : currentIndex < stageIndex ? "done"
                              : currentIndex === stageIndex ? "current"
                              : "upcoming"
                  return (
                    <div key={stage.key} className="flex items-start gap-3 relative">
                      <div className="relative flex flex-col items-center shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full mt-0.5 ${
                          state === "done" ? "bg-emerald-500" :
                          state === "current" ? "bg-blue-500 ring-[3px] ring-blue-500/20" :
                          "bg-muted"
                        }`} />
                        {i < TIMELINE_STAGES.length - 1 && (
                          <span className={`absolute left-[4.5px] top-3.5 w-px ${state === "done" ? "bg-emerald-500" : "bg-border"}`} style={{ height: 28 }} />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{stage.label}</span>
                        <span className="text-xs text-muted-foreground">{state === "done" ? "\u2713" : state === "current" ? "Current" : "\u2014"}</span>
                      </div>
                    </div>
                  )
                })}
                {app.status === "rejected" && (
                  <div className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full mt-0.5 bg-red-500 ring-[3px] ring-red-500/20 shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-red-600">Rejected</span>
                      <span className="text-xs text-muted-foreground">Current</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Application Details Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <span className="text-sm font-semibold">Application Details</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Brand Name" value={app.brand_name} editKey="brand_name" />
                <InfoRow label="Category" value={app.category} editKey="category" />
                <InfoRow label="Email" value={app.email_id} editKey="email_id" />
                <InfoRow label="Email Type" value={app.email_type} editKey="email_type" />
                <InfoRow label="Strategy" value={app.marketplace_strategy} editKey="marketplace_strategy" />
                <InfoRow label="Domain" value={app.domain_name} editKey="domain_name" />
                <InfoRow label="Website" value={app.website_url} editKey="website_url" />
                <InfoRow label="Etsy URL" value={app.etsy_store_url} editKey="etsy_store_url" />
                <InfoRow label="Reference Store" value={app.reference_store_url} editKey="reference_store_url" />
                <InfoRow label="Products Listed" value={app.num_products_listed} editKey="num_products_listed" />
                <InfoRow label="Listing Method" value={app.listing_method} editKey="listing_method" />
                <InfoRow label="Faire Reg URL" value={app.faire_reg_url} editKey="faire_reg_url" />
              </div>

              {/* Brand Story - full width */}
              <div className="mt-4 pt-4 border-t space-y-1">
                <span className="text-xs text-muted-foreground">Brand Story</span>
                {editing ? (
                  <textarea
                    className="w-full rounded-md border p-3 text-sm min-h-[80px] resize-none bg-transparent"
                    value={editVal("brand_story")}
                    onChange={(e) => setEditVal("brand_story", e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{app.brand_story || "—"}</p>
                )}
              </div>

              {/* Notes - full width */}
              <div className="mt-4 pt-4 border-t space-y-1">
                <span className="text-xs text-muted-foreground">Notes</span>
                {editing ? (
                  <textarea
                    className="w-full rounded-md border p-3 text-sm min-h-[60px] resize-none bg-transparent"
                    value={editVal("notes")}
                    onChange={(e) => setEditVal("notes", e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{app.notes || "—"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Brand Story Card (if exists and not editing) */}
          {app.brand_story && !editing && (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <span className="text-sm font-semibold">Brand Story</span>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{app.brand_story}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Follow-ups Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Follow-ups</span>
              <Button
                variant="outline"
                size="xs"
                className="h-6 text-xs"
                onClick={() => setShowFollowupForm(!showFollowupForm)}
              >
                <Plus className="size-3 mr-0.5" /> Log Follow-up
              </Button>
            </div>

            {/* Add follow-up form */}
            {showFollowupForm && (
              <div className="p-4 border-b bg-muted/30 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <Input
                    type="date"
                    value={newFollowup.followup_date}
                    onChange={(e) => setNewFollowup((p) => ({ ...p, followup_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <select
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={newFollowup.followup_type}
                    onChange={(e) => setNewFollowup((p) => ({ ...p, followup_type: e.target.value as Followup["followup_type"] }))}
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="doc_submitted">Doc Submitted</option>
                    <option value="doc_requested">Doc Requested</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Note</span>
                  <textarea
                    className="w-full rounded-md border p-2.5 text-sm min-h-[60px] resize-none bg-transparent"
                    value={newFollowup.note}
                    onChange={(e) => setNewFollowup((p) => ({ ...p, note: e.target.value }))}
                    placeholder="Details..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={addFollowup}>
                    Submit
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowFollowupForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Follow-up list */}
            <div className="divide-y">
              {followups.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">No follow-ups yet</div>
              )}
              {followups.map((f) => {
                const config = FOLLOWUP_TYPE_CONFIG[f.followup_type] ?? FOLLOWUP_TYPE_CONFIG.note
                const Icon = config.icon
                return (
                  <div key={f.id} className="px-4 py-3 flex items-start gap-3 group">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                      <Icon className={`size-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{fmtDate(f.followup_date)}</span>
                      </div>
                      {f.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.note}</p>}
                    </div>
                    <button
                      onClick={() => deleteFollowup(f.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Quick Links</span>
              <Button
                variant="outline"
                size="xs"
                className="h-6 text-xs"
                onClick={() => setShowLinkForm(!showLinkForm)}
              >
                <Plus className="size-3 mr-0.5" /> Add Link
              </Button>
            </div>

            {/* Add link form */}
            {showLinkForm && (
              <div className="p-4 border-b bg-muted/30 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Label</span>
                  <Input
                    value={newLink.label}
                    onChange={(e) => setNewLink((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Link label"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">URL</span>
                  <Input
                    value={newLink.url}
                    onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <select
                    className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={newLink.link_type}
                    onChange={(e) => setNewLink((p) => ({ ...p, link_type: e.target.value as AppLink["link_type"] }))}
                  >
                    <option value="domain">Domain</option>
                    <option value="faire_reg">Faire Reg</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="website">Website</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={addLink}>
                    Submit
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowLinkForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Links list */}
            <div className="divide-y">
              {links.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">No links yet</div>
              )}
              {links.map((l) => {
                const LinkIcon = LINK_TYPE_ICON[l.link_type] ?? Link2
                return (
                  <div key={l.id} className="px-4 py-3 flex items-center gap-3 group">
                    <LinkIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex items-center gap-1"
                      >
                        {l.label}
                        <ExternalLink className="size-2.5 shrink-0" />
                      </a>
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${LINK_TYPE_BADGE[l.link_type] ?? "bg-slate-100 text-slate-600"}`}>
                      {l.link_type.replace("_", " ")}
                    </span>
                    <button
                      onClick={() => deleteLink(l.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Record Info Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <span className="text-sm font-semibold">Record Info</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Created</span>
                <span className="text-xs font-medium">{fmtDate(app.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Updated</span>
                <span className="text-xs font-medium">{fmtDate(app.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Application ID</span>
                <span className="text-xs font-medium" title={app.id}>{truncateId(app.id)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
