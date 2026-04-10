"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Users, UserPlus, DollarSign, Crown, ChevronLeft, ChevronRight,
  X, MessageCircle, Eye, Plus, Sparkles, ArrowRight, SkipForward, Check,
} from "lucide-react"
import { useRetailers } from "@/lib/use-faire-data"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabase } from "@/lib/supabase"
import type { FaireRetailer } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10

type RetailerStatus = "active" | "new" | "vip" | "inactive"
type SortKey = "most_orders" | "most_revenue" | "newest" | "oldest" | "name_az"
type StatusFilter = "all" | RetailerStatus

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

function deriveStatus(r: FaireRetailer): RetailerStatus {
  if (r.total_orders === 0) return "new"
  if (r.total_orders >= 10) return "vip"
  if (r.last_order_at) {
    const lastOrder = new Date(r.last_order_at)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    if (lastOrder < sixtyDaysAgo) return "inactive"
  }
  return "active"
}

const STATUS_BADGE: Record<RetailerStatus, { bg: string; label: string }> = {
  active:   { bg: "bg-emerald-50 text-emerald-700", label: "Active" },
  new:      { bg: "bg-blue-50 text-blue-700", label: "New" },
  vip:      { bg: "bg-amber-50 text-amber-700", label: "VIP" },
  inactive: { bg: "bg-slate-100 text-slate-600", label: "Inactive" },
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return ""
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "1 day ago"
  return `${diff}d ago`
}

function cleanPhone(phone: string | null): string {
  if (!phone) return ""
  return phone.replace(/[^0-9+]/g, "")
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

/* ------------------------------------------------------------------ */
/*  Add Retailer Dialog                                                */
/* ------------------------------------------------------------------ */

function AddRetailerDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ company_name: "", name: "", email: "", phone: "", city: "", state: "", country: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { error: dbError } = await supabase.from("faire_retailers").insert({
        faire_retailer_id: `manual_${Date.now()}`,
        company_name: form.company_name.trim(),
        name: form.name.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        total_orders: 0,
        total_spent_cents: 0,
        store_ids: [],
      })
      if (dbError) throw new Error(dbError.message)
      setForm({ company_name: "", name: "", email: "", phone: "", city: "", state: "", country: "", notes: "" })
      onSuccess()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const fields: { key: string; label: string; required?: boolean; placeholder: string }[] = [
    { key: "company_name", label: "Company Name", required: true, placeholder: "Acme Retail Co." },
    { key: "name", label: "Contact Name", placeholder: "Jane Smith" },
    { key: "email", label: "Email", placeholder: "jane@acme.com" },
    { key: "phone", label: "Phone", placeholder: "+1 555-123-4567" },
    { key: "city", label: "City", placeholder: "New York" },
    { key: "state", label: "State", placeholder: "NY" },
    { key: "country", label: "Country", placeholder: "US" },
    { key: "notes", label: "Notes", placeholder: "Met at trade show..." },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg border shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold font-heading">Add Retailer</h2>
        <p className="text-sm text-muted-foreground mt-1">Add a new retailer to your directory.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.key === "notes" ? (
                <textarea
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={2}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              ) : (
                <input
                  type={f.key === "email" ? "email" : "text"}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.company_name.trim()}
              className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Retailer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bulk Enrich Modal                                                  */
/* ------------------------------------------------------------------ */

type EnrichRetailer = FaireRetailer & { status: RetailerStatus }

function BulkEnrichModal({ open, onClose, retailers, onSaved }: {
  open: boolean
  onClose: () => void
  retailers: EnrichRetailer[]
  onSaved: () => void
}) {
  const incomplete = useMemo(() =>
    retailers.filter((r) => !r.phone || !r.city || !r.state),
    [retailers],
  )

  const [step, setStep] = useState<"list" | "enrich">("list")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [form, setForm] = useState({ phone: "", email: "", website: "", whatsapp: "", city: "", state: "", notes: "" })
  const [saving, setSaving] = useState(false)

  function startEnriching() {
    if (incomplete.length === 0) return
    setCurrentIndex(0)
    loadRetailer(0)
    setStep("enrich")
  }

  function loadRetailer(index: number) {
    const r = incomplete[index]
    if (!r) return
    setForm({
      phone: r.phone ?? "",
      email: "",
      website: "",
      whatsapp: r.phone ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      notes: "",
    })
  }

  async function handleSaveAndNext() {
    const r = incomplete[currentIndex]
    if (!r) return
    setSaving(true)
    try {
      await supabase.from("faire_retailers").update({
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
      }).eq("id", r.id)
      onSaved()
    } catch {
      // silent fail, keep going
    } finally {
      setSaving(false)
      moveNext()
    }
  }

  function handleSkip() {
    moveNext()
  }

  function moveNext() {
    const next = currentIndex + 1
    if (next >= incomplete.length) {
      onClose()
      return
    }
    setCurrentIndex(next)
    loadRetailer(next)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card rounded-lg border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold font-heading">Bulk Enrich Retailers</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {incomplete.length} retailers with missing data
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "list" && (
            <>
              {incomplete.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="size-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-medium">All retailers have complete data!</p>
                  <p className="text-xs text-muted-foreground mt-1">Nothing to enrich right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incomplete.map((r) => {
                    const missing: string[] = []
                    if (!r.phone) missing.push("Phone")
                    if (!r.city) missing.push("City")
                    if (!r.state) missing.push("State")
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{r.company_name || r.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Missing: {missing.join(", ")}</p>
                        </div>
                        <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status].bg}`}>
                          {STATUS_BADGE[r.status].label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {step === "enrich" && incomplete[currentIndex] && (
            <div className="space-y-5">
              {/* Progress */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Enriching <span className="text-primary">{currentIndex + 1}</span> of {incomplete.length} retailers
                </p>
                <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((currentIndex + 1) / incomplete.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Retailer Card */}
              <div className="rounded-md border p-5 space-y-4">
                <div className="border-b pb-3">
                  <p className="text-base font-semibold font-heading">
                    {incomplete[currentIndex].company_name || incomplete[currentIndex].name || "Unknown Retailer"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {incomplete[currentIndex].total_orders} orders
                    {" \u00b7 "}
                    {formatCurrency(incomplete[currentIndex].total_spent_cents)} spent
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "phone", label: "Phone" },
                    { key: "whatsapp", label: "WhatsApp Number" },
                    { key: "email", label: "Email" },
                    { key: "website", label: "Website" },
                    { key: "city", label: "City" },
                    { key: "state", label: "State" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                      <input
                        type="text"
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2">
          {step === "list" && incomplete.length > 0 && (
            <button
              onClick={startEnriching}
              className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              Start Enriching <ArrowRight className="size-3.5" />
            </button>
          )}
          {step === "enrich" && (
            <>
              <button
                onClick={handleSkip}
                className="h-9 px-4 text-sm font-medium rounded-md border hover:bg-muted transition-colors inline-flex items-center gap-1.5"
              >
                <SkipForward className="size-3.5" /> Skip
              </button>
              <button
                onClick={handleSaveAndNext}
                disabled={saving}
                className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {saving ? "Saving..." : currentIndex === incomplete.length - 1 ? "Save & Finish" : "Save & Next"}
                {!saving && <ArrowRight className="size-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function RetailersDirectoryPage() {
  const router = useRouter()
  const { activeBrand, stores, activeStore } = useBrandFilter()
  // When a brand is selected, filter retailers server-side by faire_store_id
  const activeFaireStoreId = activeStore?.faire_store_id
  const { retailers, totalCount, loading } = useRetailers(5000, activeFaireStoreId)

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [countryFilter, setCountryFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("most_orders")
  const [page, setPage] = useState(1)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEnrichModal, setShowEnrichModal] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)

  // Real counts (not capped by the 5000-row retailers fetch).
  // - activeCount  (main stat card): retailers with an order in the last 60 days
  // - newCount     (main stat card): retailers with zero orders
  // - pillActive   (pill filter): deriveStatus === "active" (1-9 orders, recent or no last order)
  // - vipCount     (pill filter): deriveStatus === "vip" (>= 10 orders)
  // - inactiveCount(pill filter): deriveStatus === "inactive" (1-9 orders, last order older than 60 days)
  const [activeCount, setActiveCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [pillActiveCount, setPillActiveCount] = useState(0)
  const [vipCount, setVipCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const sixtyDaysAgoISO = sixtyDaysAgo.toISOString()

      const withStore = <T extends { contains: (col: string, val: string[]) => T }>(q: T): T =>
        activeFaireStoreId ? q.contains("store_ids", [activeFaireStoreId]) : q

      const activeQuery = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .gte("last_order_at", sixtyDaysAgoISO)
      )

      const newQuery = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .eq("total_orders", 0)
      )

      const vipQuery = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .gte("total_orders", 10)
      )

      // pill "inactive": 1-9 orders AND last_order_at < 60 days ago
      const inactiveQuery = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .gte("total_orders", 1)
          .lt("total_orders", 10)
          .lt("last_order_at", sixtyDaysAgoISO)
      )

      // pill "active": 1-9 orders AND (last_order_at IS NULL OR last_order_at >= 60 days ago)
      // Two queries (no OR support for IS NULL + gte easily) — sum them.
      const pillActiveRecent = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .gte("total_orders", 1)
          .lt("total_orders", 10)
          .gte("last_order_at", sixtyDaysAgoISO)
      )
      const pillActiveNullDate = withStore(
        supabase
          .from("faire_retailers")
          .select("*", { count: "exact", head: true })
          .gte("total_orders", 1)
          .lt("total_orders", 10)
          .is("last_order_at", null)
      )

      const [activeRes, newRes, vipRes, inactiveRes, pillRecentRes, pillNullRes] =
        await Promise.all([
          activeQuery,
          newQuery,
          vipQuery,
          inactiveQuery,
          pillActiveRecent,
          pillActiveNullDate,
        ])

      if (cancelled) return
      setActiveCount(activeRes.count ?? 0)
      setNewCount(newRes.count ?? 0)
      setVipCount(vipRes.count ?? 0)
      setInactiveCount(inactiveRes.count ?? 0)
      setPillActiveCount((pillRecentRes.count ?? 0) + (pillNullRes.count ?? 0))
    }
    loadCounts()
    return () => { cancelled = true }
  }, [activeFaireStoreId, refetchKey])

  // Derive statuses
  const retailersWithStatus = useMemo(
    () => retailers.map((r) => ({ ...r, status: deriveStatus(r) })),
    [retailers, refetchKey],
  )

  // Unique countries for filter dropdown
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>()
    retailersWithStatus.forEach((r) => { if (r.country) countries.add(r.country) })
    return Array.from(countries).sort()
  }, [retailersWithStatus])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = retailersWithStatus

    // Brand filter (store) — store_ids contains faire_store_id values, not UUIDs,
    // so we must resolve the UUID to the faire_store_id before filtering.
    if (storeFilter !== "all") {
      const storeObj = stores.find((s) => s.id === storeFilter)
      const faireStoreId = storeObj?.faire_store_id
      if (faireStoreId) {
        result = result.filter((r) => r.store_ids && r.store_ids.includes(faireStoreId))
      }
    } else if (activeBrand !== "all" && activeStore) {
      const faireStoreId = activeStore.faire_store_id
      result = result.filter((r) => r.store_ids && r.store_ids.includes(faireStoreId))
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }

    // Country filter
    if (countryFilter !== "all") {
      result = result.filter((r) => r.country === countryFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.company_name ?? "").toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (r.state ?? "").toLowerCase().includes(q),
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "most_orders": return b.total_orders - a.total_orders
        case "most_revenue": return b.total_spent_cents - a.total_spent_cents
        case "newest": return new Date(b.first_order_at ?? 0).getTime() - new Date(a.first_order_at ?? 0).getTime()
        case "oldest": return new Date(a.first_order_at ?? 0).getTime() - new Date(b.first_order_at ?? 0).getTime()
        case "name_az": return (a.company_name ?? a.name ?? "").localeCompare(b.company_name ?? b.name ?? "")
        default: return 0
      }
    })

    return result
  }, [retailersWithStatus, statusFilter, countryFilter, storeFilter, activeBrand, searchQuery, sortKey])

  // Pagination
  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const paginatedRetailers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Stats — counts come from server-side count queries so they aren't capped
  // by the in-memory retailers fetch limit. totalRevenue is still derived from
  // the loaded rows (full accuracy requires an aggregate RPC).
  const stats = useMemo(() => {
    const totalRevenue = retailersWithStatus.reduce((s, r) => s + r.total_spent_cents, 0)
    return {
      total: totalCount || retailersWithStatus.length,
      active: activeCount,
      newCount,
      totalRevenue,
    }
  }, [retailersWithStatus, totalCount, activeCount, newCount])

  // Status filter pill counts — sourced from real count queries above so they
  // aren't capped by the in-memory retailers fetch.
  const statusCounts = useMemo(() => ({
    all: totalCount || retailersWithStatus.length,
    active: pillActiveCount,
    new: newCount,
    vip: vipCount,
    inactive: inactiveCount,
  }), [totalCount, retailersWithStatus.length, pillActiveCount, newCount, vipCount, inactiveCount])

  // Has active filters?
  const hasActiveFilters = searchQuery || statusFilter !== "all" || countryFilter !== "all" || storeFilter !== "all"

  function clearAllFilters() {
    setSearchQuery("")
    setStatusFilter("all")
    setCountryFilter("all")
    setStoreFilter("all")
    setPage(1)
  }

  function handleRefetch() {
    setRefetchKey((k) => k + 1)
    // Force a page reload to re-fetch data from supabase
    window.location.reload()
  }

  const STAT_CARDS = [
    { label: "Total Retailers", value: stats.total.toLocaleString(), sub: "Across all stores", icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Active", value: stats.active.toLocaleString(), sub: "Ordered in last 60 days", icon: Check, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "New", value: stats.newCount.toLocaleString(), sub: "No orders yet", icon: UserPlus, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), sub: "All time", icon: DollarSign, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "new", label: "New" },
    { value: "vip", label: "VIP" },
    { value: "inactive", label: "Inactive" },
  ]

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "most_orders", label: "Most Orders" },
    { value: "most_revenue", label: "Most Revenue" },
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name_az", label: "Name A-Z" },
  ]

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-52 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-[500px] rounded-md" />
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Retailers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{stats.total.toLocaleString()} wholesale buyers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEnrichModal(true)}
            className="h-9 px-4 text-sm font-medium rounded-md border hover:bg-muted transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="size-3.5" /> Bulk Enrich
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="size-3.5" /> Add Retailer
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search retailers..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="h-9 w-64 pl-8 text-sm rounded-md border bg-background pr-3 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1">
          {STATUS_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => { setStatusFilter(pill.value); setPage(1) }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === pill.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {pill.label} ({statusCounts[pill.value]})
            </button>
          ))}
        </div>

        {/* Country filter */}
        <select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-md border bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Countries</option>
          {uniqueCountries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Store filter */}
        <select
          value={storeFilter}
          onChange={(e) => { setStoreFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-md border bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Stores</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-9 rounded-md border bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="size-3" /> Clear All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Contact</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Orders</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Revenue</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Avg Order</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Last Order</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">First Order</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRetailers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-sm text-muted-foreground">No retailers match your filters.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-3 text-sm text-primary font-medium hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : paginatedRetailers.map((r) => {
                const displayName = r.company_name || r.name || "Unknown"
                const location = [r.city, r.state].filter(Boolean).join(", ")
                const revenue = r.total_spent_cents / 100
                const avgOrder = r.total_orders > 0 ? revenue / r.total_orders : 0
                const phone = cleanPhone(r.phone)
                const badge = STATUS_BADGE[r.status]

                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/retailers/directory/${r.faire_retailer_id}`)}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    {/* Retailer */}
                    <td className="px-4 py-3.5 text-sm">
                      <p className="font-medium">{displayName}</p>
                      {location && <p className="text-xs text-muted-foreground mt-0.5">{location}</p>}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {r.phone ? (
                        <span className="text-xs">{r.phone}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">\u2014</span>
                      )}
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{r.total_orders}</td>

                    {/* Revenue */}
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{formatCurrency(r.total_spent_cents)}</td>

                    {/* Avg Order */}
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums text-muted-foreground">
                      {r.total_orders > 0
                        ? `$${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "\u2014"}
                    </td>

                    {/* Last Order */}
                    <td className="px-4 py-3.5 text-sm">
                      {r.last_order_at ? (
                        <div>
                          <p className="text-xs">{formatDate(r.last_order_at)}</p>
                          <p className="text-xs text-muted-foreground">{daysAgo(r.last_order_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">\u2014</span>
                      )}
                    </td>

                    {/* First Order */}
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {formatDate(r.first_order_at)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-sm">
                      <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-sm text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {phone && (
                          <a
                            href={`https://wa.me/${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-emerald-50 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/retailers/directory/${r.faire_retailer_id}`)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {totalFiltered === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}\u2013{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered} retailers
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                    page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Retailer Dialog */}
      <AddRetailerDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleRefetch}
      />

      {/* Bulk Enrich Modal */}
      <BulkEnrichModal
        open={showEnrichModal}
        onClose={() => setShowEnrichModal(false)}
        retailers={retailersWithStatus}
        onSaved={handleRefetch}
      />
    </div>
  )
}
