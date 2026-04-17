"use client"

export const dynamic = "force-dynamic"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  Download,
  Flag,
  FlagOff,
  ImageOff,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsEmptyState,
  EtsEditDrawer,
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────── */

type LabelStatus = "chinese" | "english" | "needs_relabel" | string
type ImageQuality = "ok" | "needs_review" | "regen_pending" | "regen_done" | string

interface ProductRow {
  id: string
  product_code: string | null
  barcode: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  unit_price: number | null
  wholesale_price_inr: number | null
  partner_price: number | null
  suggested_mrp: number | null
  cost_price: number | null
  stock_quantity: number | null
  image_url: string | null
  material: string | null
  is_active: boolean
  is_published: boolean
  market_fit: string | null
  vendor_id: string | null
  source: string | null
  label_status: LabelStatus | null
  image_quality: ImageQuality | null
  created_at: string | null
}

type SortKey =
  | "name_en"
  | "category"
  | "partner_price"
  | "suggested_mrp"
  | "stock_quantity"
  | "created_at"

type SortDir = "asc" | "desc"
type PublishedFilter = "all" | "published" | "unpublished"

const PAGE_SIZE = 50

const PRODUCT_SELECT =
  "id, product_code, barcode, name_en, name_cn, category, unit_price, wholesale_price_inr, partner_price, suggested_mrp, cost_price, stock_quantity, image_url, material, is_active, is_published, market_fit, vendor_id, source, label_status, image_quality, created_at"

/* ──────────────────────────────────────────────────────────────────────────
 * Small helpers
 * ──────────────────────────────────────────────────────────────────────── */

function labelStatusTone(v: LabelStatus | null | undefined): StatusTone {
  switch ((v ?? "").toLowerCase()) {
    case "english":
      return "emerald"
    case "chinese":
      return "amber"
    case "needs_relabel":
      return "red"
    default:
      return "slate"
  }
}

function imageQualityTone(v: ImageQuality | null | undefined): StatusTone {
  switch ((v ?? "").toLowerCase()) {
    case "ok":
      return "emerald"
    case "needs_review":
      return "amber"
    case "regen_pending":
      return "blue"
    case "regen_done":
      return "violet"
    default:
      return "slate"
  }
}

function prettifySource(raw: string | null | undefined): string {
  if (!raw) return "—"
  // "china_haoduobao" -> "China — Haoduobao"
  const parts = raw.split(/[_\-/]/).filter(Boolean)
  if (parts.length === 0) return raw
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  if (parts.length === 1) return cap(parts[0])
  return `${cap(parts[0])} — ${parts.slice(1).map(cap).join(" ")}`
}

function prettifyLabel(v: string | null | undefined): string {
  if (!v) return "—"
  return v.replace(/_/g, " ")
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ──────────────────────────────────────────────────────────────────────────
 * URL state
 * ──────────────────────────────────────────────────────────────────────── */

interface UrlState {
  q: string
  cat: string // "all" or single category
  src: string // "all" or source
  label: string[] // subset of label statuses
  iq: string[] // subset of image qualities
  pub: PublishedFilter
  sort: SortKey
  dir: SortDir
  page: number
}

const DEFAULT_URL: UrlState = {
  q: "",
  cat: "all",
  src: "all",
  label: [],
  iq: [],
  pub: "all",
  sort: "created_at",
  dir: "desc",
  page: 0,
}

function parseUrl(sp: URLSearchParams): UrlState {
  const sortRaw = sp.get("sort")
  let sort: SortKey = DEFAULT_URL.sort
  let dir: SortDir = DEFAULT_URL.dir
  if (sortRaw) {
    const [k, d] = sortRaw.split(":")
    if (
      ["name_en", "category", "partner_price", "suggested_mrp", "stock_quantity", "created_at"].includes(
        k,
      )
    ) {
      sort = k as SortKey
    }
    if (d === "asc" || d === "desc") dir = d
  }
  const pubRaw = sp.get("pub")
  const pub: PublishedFilter =
    pubRaw === "published" || pubRaw === "unpublished" ? pubRaw : "all"
  return {
    q: sp.get("q") ?? "",
    cat: sp.get("cat") ?? "all",
    src: sp.get("src") ?? "all",
    label: (sp.get("label") ?? "").split(",").filter(Boolean),
    iq: (sp.get("iq") ?? "").split(",").filter(Boolean),
    pub,
    sort,
    dir,
    page: Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0),
  }
}

function buildQuery(state: UrlState): string {
  const p = new URLSearchParams()
  if (state.q) p.set("q", state.q)
  if (state.cat !== "all") p.set("cat", state.cat)
  if (state.src !== "all") p.set("src", state.src)
  if (state.label.length) p.set("label", state.label.join(","))
  if (state.iq.length) p.set("iq", state.iq.join(","))
  if (state.pub !== "all") p.set("pub", state.pub)
  if (state.sort !== DEFAULT_URL.sort || state.dir !== DEFAULT_URL.dir) {
    p.set("sort", `${state.sort}:${state.dir}`)
  }
  if (state.page > 0) p.set("page", String(state.page))
  const s = p.toString()
  return s ? `?${s}` : ""
}

/* ──────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────── */

const LABEL_OPTIONS: { value: string; label: string }[] = [
  { value: "chinese", label: "Chinese" },
  { value: "english", label: "English" },
  { value: "needs_relabel", label: "Needs relabel" },
]

const IQ_OPTIONS: { value: string; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "needs_review", label: "Needs review" },
  { value: "regen_pending", label: "Regen pending" },
  { value: "regen_done", label: "Regen done" },
]

export default function EtsProductsPageWrapper() {
  return (
    <Suspense fallback={null}>
      <EtsProductsPage />
    </Suspense>
  )
}

function EtsProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-backed state (initialised from URL on mount, pushed back on change)
  const [state, setState] = useState<UrlState>(() =>
    parseUrl(new URLSearchParams(searchParams.toString())),
  )

  // Debounced search text (separate from URL-committed q so typing isn't jittery)
  const [searchInput, setSearchInput] = useState(state.q)
  useEffect(() => {
    if (searchInput === state.q) return
    const t = setTimeout(() => {
      setState((s) => ({ ...s, q: searchInput, page: 0 }))
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Push state to URL when it changes
  useEffect(() => {
    const qs = buildQuery(state)
    router.replace(`/ets/catalog/products${qs}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const [rows, setRows] = useState<ProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "single"; row: ProductRow }
    | { kind: "bulk"; count: number }
    | null
  >(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)

  // Load distinct categories + sources once (and after reloadKey changes)
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: catData }, { data: srcData }] = await Promise.all([
        supabaseEts
          .from("products")
          .select("category")
          .not("category", "is", null)
          .limit(3000),
        supabaseEts
          .from("products")
          .select("source")
          .not("source", "is", null)
          .limit(3000),
      ])
      if (cancelled) return
      const cs = new Set<string>()
      for (const r of (catData ?? []) as { category: string | null }[]) {
        if (r.category) cs.add(r.category)
      }
      const ss = new Set<string>()
      for (const r of (srcData ?? []) as { source: string | null }[]) {
        if (r.source) ss.add(r.source)
      }
      setCategories(Array.from(cs).sort())
      setSources(Array.from(ss).sort())
    }
    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Main data load
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabaseEts
        .from("products")
        .select(PRODUCT_SELECT, { count: "exact" })
        .order(state.sort, { ascending: state.dir === "asc", nullsFirst: false })
        .range(state.page * PAGE_SIZE, state.page * PAGE_SIZE + PAGE_SIZE - 1)

      if (state.q.trim()) {
        const term = `%${state.q.trim()}%`
        q = q.or(
          `name_en.ilike.${term},name_cn.ilike.${term},product_code.ilike.${term},barcode.ilike.${term}`,
        )
      }
      if (state.cat !== "all") q = q.eq("category", state.cat)
      if (state.src !== "all") q = q.eq("source", state.src)
      if (state.label.length) q = q.in("label_status", state.label)
      if (state.iq.length) q = q.in("image_quality", state.iq)
      if (state.pub === "published") q = q.eq("is_published", true)
      if (state.pub === "unpublished") q = q.eq("is_published", false)

      const { data, count, error } = await q
      if (cancelled) return
      if (error) {
        toast.error(`Failed to load products: ${error.message}`)
        setRows([])
        setTotal(0)
      } else {
        setRows((data ?? []) as ProductRow[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [state, reloadKey])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  // Clear selections that no longer exist after a reload
  useEffect(() => {
    if (selectedIds.size === 0) return
    const rowIds = new Set(rows.map((r) => r.id))
    let changed = false
    const next = new Set<string>()
    selectedIds.forEach((id) => {
      if (rowIds.has(id)) next.add(id)
      else changed = true
    })
    if (changed) setSelectedIds(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id))

  function toggleAllOnPage() {
    if (allOnPageSelected) {
      const next = new Set(selectedIds)
      for (const r of rows) next.delete(r.id)
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      for (const r of rows) next.add(r.id)
      setSelectedIds(next)
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  /* ── Sort ─────────────────────────────────────────────────────────── */
  function onSort(key: SortKey) {
    setState((s) => ({
      ...s,
      sort: key,
      dir: s.sort === key ? (s.dir === "asc" ? "desc" : "asc") : "asc",
      page: 0,
    }))
  }

  /* ── Bulk actions ─────────────────────────────────────────────────── */
  async function bulkUpdate(patch: Record<string, unknown>, label: string) {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    // Optimistic UI: mutate in place
    setRows((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, ...patch } : r)),
    )
    setBulkBusy(true)
    const { error } = await supabaseEts
      .from("products")
      .update(patch)
      .in("id", ids)
    setBulkBusy(false)
    if (error) {
      toast.error(`${label} failed: ${error.message}`)
      setReloadKey((k) => k + 1) // re-sync from DB to undo optimism
      return
    }
    toast.success(`${label} applied to ${ids.length.toLocaleString()} product${ids.length === 1 ? "" : "s"}`)
    setReloadKey((k) => k + 1)
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setBulkBusy(true)
    const { error } = await supabaseEts
      .from("products")
      .delete()
      .in("id", ids)
    setBulkBusy(false)
    if (error) {
      toast.error(`Delete failed: ${error.message}`)
      return
    }
    toast.success(`Deleted ${ids.length.toLocaleString()} product${ids.length === 1 ? "" : "s"}`)
    setSelectedIds(new Set())
    setConfirmDelete(null)
    setReloadKey((k) => k + 1)
  }

  async function singleDelete(row: ProductRow) {
    setBulkBusy(true)
    const { error } = await supabaseEts.from("products").delete().eq("id", row.id)
    setBulkBusy(false)
    if (error) {
      toast.error(`Delete failed: ${error.message}`)
      return
    }
    toast.success(`Deleted "${row.name_en || row.name_cn || row.product_code}"`)
    setConfirmDelete(null)
    setReloadKey((k) => k + 1)
  }

  /* ── Inline quick-edit ────────────────────────────────────────────── */
  const saveField = useCallback(
    async (id: string, field: keyof ProductRow, value: unknown) => {
      // Optimistic
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      )
      const { error } = await supabaseEts
        .from("products")
        .update({ [field]: value })
        .eq("id", id)
      if (error) {
        toast.error(`Couldn't save ${String(field)}: ${error.message}`)
        setReloadKey((k) => k + 1)
        return false
      }
      return true
    },
    [],
  )

  /* ── Export CSV ───────────────────────────────────────────────────── */
  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export on this page.")
      return
    }
    const payload = rows.map((r) => ({
      product_code: r.product_code ?? "",
      name: r.name_en || r.name_cn || "",
      category: r.category ?? "",
      partner_price: r.partner_price ?? "",
      suggested_mrp: r.suggested_mrp ?? "",
      cost_price: r.cost_price ?? "",
      stock_quantity: r.stock_quantity ?? 0,
      is_published: r.is_published ? "yes" : "no",
      is_active: r.is_active ? "yes" : "no",
      label_status: r.label_status ?? "",
      image_quality: r.image_quality ?? "",
      source: r.source ?? "",
      created_at: r.created_at ?? "",
    }))
    downloadCsv(`ets-products-page-${state.page + 1}.csv`, payload)
    toast.success(`Exported ${payload.length} row${payload.length === 1 ? "" : "s"}`)
  }

  const selectedCount = selectedIds.size

  return (
    <EtsListShell
      title="Products"
      subtitle={loading ? "Loading…" : `${total.toLocaleString()} products`}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Download className="size-4" /> Export CSV
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="size-4" /> New product
          </button>
        </div>
      }
      filters={
        <FiltersBar
          search={searchInput}
          onSearch={setSearchInput}
          categories={categories}
          sources={sources}
          state={state}
          onChange={(patch) =>
            setState((s) => ({ ...s, ...patch, page: 0 }))
          }
        />
      }
    >
      {selectedCount > 0 && (
        <BulkActionsToolbar
          count={selectedCount}
          busy={bulkBusy}
          categories={categories}
          bulkCategoryOpen={bulkCategoryOpen}
          setBulkCategoryOpen={setBulkCategoryOpen}
          onClear={() => setSelectedIds(new Set())}
          onPublish={() => bulkUpdate({ is_published: true }, "Publish")}
          onUnpublish={() => bulkUpdate({ is_published: false }, "Unpublish")}
          onActivate={() => bulkUpdate({ is_active: true }, "Activate")}
          onDeactivate={() => bulkUpdate({ is_active: false }, "Deactivate")}
          onFlagImages={() =>
            bulkUpdate({ image_quality: "needs_review" }, "Flag images")
          }
          onClearImageFlag={() =>
            bulkUpdate({ image_quality: "ok" }, "Clear image flag")
          }
          onBulkCategory={(cat) => {
            setBulkCategoryOpen(false)
            bulkUpdate({ category: cat }, `Set category "${cat}"`)
          }}
          onDelete={() =>
            setConfirmDelete({ kind: "bulk", count: selectedCount })
          }
        />
      )}

      {!loading && rows.length === 0 ? (
        <EtsEmptyState
          icon={Package}
          title="No products match"
          description="Adjust filters or clear the search to see products."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH className="w-8 pl-4">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                aria-label="Select all on page"
                onChange={toggleAllOnPage}
                className="size-4 rounded border-input cursor-pointer"
              />
            </EtsTH>
            <EtsTH className="w-12" />
            <SortableTH
              label="Product"
              sortKey="name_en"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
            />
            <EtsTH>SKU</EtsTH>
            <SortableTH
              label="Category"
              sortKey="category"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
            />
            <EtsTH>Source</EtsTH>
            <EtsTH>Label</EtsTH>
            <EtsTH>Image QC</EtsTH>
            <SortableTH
              label="Partner"
              sortKey="partner_price"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
              align="right"
            />
            <SortableTH
              label="MRP"
              sortKey="suggested_mrp"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
              align="right"
            />
            <SortableTH
              label="Stock"
              sortKey="stock_quantity"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
              align="right"
            />
            <EtsTH>Published</EtsTH>
            <SortableTH
              label="Created"
              sortKey="created_at"
              current={state.sort}
              dir={state.dir}
              onSort={onSort}
            />
            <EtsTH />
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 14 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((p) => (
                  <ProductTableRow
                    key={p.id}
                    row={p}
                    selected={selectedIds.has(p.id)}
                    onToggle={() => toggleRow(p.id)}
                    onOpen={() => setEditing(p)}
                    onSaveField={saveField}
                    onDelete={() =>
                      setConfirmDelete({ kind: "single", row: p })
                    }
                  />
                ))}
          </tbody>
        </EtsTable>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {state.page + 1} of {totalPages} — showing{" "}
            {state.page * PAGE_SIZE + 1}–
            {Math.min(total, (state.page + 1) * PAGE_SIZE)} of{" "}
            {total.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={state.page === 0}
              onClick={() => setState((s) => ({ ...s, page: Math.max(0, s.page - 1) }))}
              className="h-8 px-3 rounded-md border bg-card text-sm hover:bg-muted/40 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={state.page + 1 >= totalPages}
              onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))}
              className="h-8 px-3 rounded-md border bg-card text-sm hover:bg-muted/40 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ProductDrawer
        open={creating || !!editing}
        mode={editing ? "edit" : "create"}
        initial={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={() => {
          setCreating(false)
          setEditing(null)
          setReloadKey((k) => k + 1)
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        tone="destructive"
        title={
          confirmDelete?.kind === "bulk"
            ? `Delete ${confirmDelete.count} product${confirmDelete.count === 1 ? "" : "s"}?`
            : "Delete product?"
        }
        description={
          confirmDelete?.kind === "single"
            ? `"${confirmDelete.row.name_en || confirmDelete.row.name_cn || confirmDelete.row.product_code}" will be permanently removed.`
            : "This will permanently remove the selected products. This cannot be undone."
        }
        confirmLabel="Delete"
        busy={bulkBusy}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return
          if (confirmDelete.kind === "bulk") bulkDelete()
          else singleDelete(confirmDelete.row)
        }}
      />
    </EtsListShell>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Filters
 * ──────────────────────────────────────────────────────────────────────── */

function FiltersBar({
  search,
  onSearch,
  categories,
  sources,
  state,
  onChange,
}: {
  search: string
  onSearch: (v: string) => void
  categories: string[]
  sources: string[]
  state: UrlState
  onChange: (patch: Partial<UrlState>) => void
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name, SKU, barcode…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={state.cat}
          onChange={(e) => onChange({ cat: e.target.value })}
          className="h-8 px-2 rounded-md border border-input bg-card text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={state.src}
          onChange={(e) => onChange({ src: e.target.value })}
          className="h-8 px-2 rounded-md border border-input bg-card text-sm"
        >
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {prettifySource(s)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-md border border-input bg-card p-0.5">
          {(["all", "published", "unpublished"] as PublishedFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ pub: p })}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-sm transition-colors capitalize",
                state.pub === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChipGroup
          label="Label"
          options={LABEL_OPTIONS}
          value={state.label}
          onChange={(v) => onChange({ label: v })}
        />
        <ChipGroup
          label="Image QC"
          options={IQ_OPTIONS}
          value={state.iq}
          onChange={(v) => onChange({ iq: v })}
        />
        {(state.q ||
          state.cat !== "all" ||
          state.src !== "all" ||
          state.pub !== "all" ||
          state.label.length ||
          state.iq.length) && (
          <button
            type="button"
            onClick={() => {
              onChange({
                q: "",
                cat: "all",
                src: "all",
                pub: "all",
                label: [],
                iq: [],
              })
              onSearch("")
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              "h-6 px-2 text-xs font-medium rounded-full border transition-colors",
              on
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Sortable TH
 * ──────────────────────────────────────────────────────────────────────── */

function SortableTH({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: "right"
}) {
  const isActive = current === sortKey
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <EtsTH className={cn(align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "justify-end",
          isActive && "text-foreground",
        )}
      >
        <span>{label}</span>
        <Icon className="size-3" />
      </button>
    </EtsTH>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Bulk actions toolbar
 * ──────────────────────────────────────────────────────────────────────── */

function BulkActionsToolbar({
  count,
  busy,
  categories,
  bulkCategoryOpen,
  setBulkCategoryOpen,
  onClear,
  onPublish,
  onUnpublish,
  onActivate,
  onDeactivate,
  onFlagImages,
  onClearImageFlag,
  onBulkCategory,
  onDelete,
}: {
  count: number
  busy: boolean
  categories: string[]
  bulkCategoryOpen: boolean
  setBulkCategoryOpen: (v: boolean) => void
  onClear: () => void
  onPublish: () => void
  onUnpublish: () => void
  onActivate: () => void
  onDeactivate: () => void
  onFlagImages: () => void
  onClearImageFlag: () => void
  onBulkCategory: (c: string) => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-2 text-sm font-semibold">
        <CheckSquare className="size-4 text-primary" />
        {count.toLocaleString()} selected
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Clear
      </button>

      <div className="mx-2 h-5 w-px bg-border/80" />

      <ToolbarButton onClick={onPublish} disabled={busy}>
        Publish
      </ToolbarButton>
      <ToolbarButton onClick={onUnpublish} disabled={busy}>
        Unpublish
      </ToolbarButton>
      <ToolbarButton onClick={onActivate} disabled={busy}>
        Activate
      </ToolbarButton>
      <ToolbarButton onClick={onDeactivate} disabled={busy}>
        Deactivate
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border/80" />

      <ToolbarButton onClick={onFlagImages} disabled={busy} icon={<Flag className="size-3.5" />}>
        Flag images
      </ToolbarButton>
      <ToolbarButton onClick={onClearImageFlag} disabled={busy} icon={<FlagOff className="size-3.5" />}>
        Clear flag
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border/80" />

      <div className="relative">
        <ToolbarButton
          onClick={() => setBulkCategoryOpen(!bulkCategoryOpen)}
          disabled={busy}
          icon={<ChevronDown className="size-3.5" />}
        >
          Set category
        </ToolbarButton>
        {bulkCategoryOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setBulkCategoryOpen(false)}
            />
            <div className="absolute z-50 top-full mt-1 left-0 w-60 max-h-72 overflow-y-auto rounded-md border border-border/80 bg-card shadow-lg p-1">
              {categories.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No categories
                </div>
              ) : (
                categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onBulkCategory(c)}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-muted"
                  >
                    {c}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border/80 bg-card text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
    >
      {children}
      {icon}
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Product row (with inline edit)
 * ──────────────────────────────────────────────────────────────────────── */

function ProductTableRow({
  row,
  selected,
  onToggle,
  onOpen,
  onSaveField,
  onDelete,
}: {
  row: ProductRow
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onSaveField: (id: string, field: keyof ProductRow, value: unknown) => Promise<boolean>
  onDelete: () => void
}) {
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className="cursor-pointer"
      onClick={onOpen}
    >
      <TableCell className="pl-4 pr-0 w-8" onClick={stop}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label="Select row"
          className="size-4 rounded border-input cursor-pointer"
        />
      </TableCell>

      <TableCell className="px-2 w-12">
        {row.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image_url}
            alt=""
            loading="lazy"
            className="size-8 rounded object-cover bg-muted"
          />
        ) : (
          <div className="size-8 rounded bg-muted flex items-center justify-center">
            <ImageOff className="size-3.5 text-muted-foreground" />
          </div>
        )}
      </TableCell>

      <TableCell className="px-3 py-2.5 max-w-[260px]">
        <Link
          href={`/ets/products/${row.product_code ?? row.id}`}
          onClick={stop}
          className="text-sm font-medium leading-tight hover:text-primary line-clamp-2"
        >
          {row.name_en || row.name_cn || "Untitled"}
        </Link>
        {row.material && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {row.material}
          </div>
        )}
      </TableCell>

      <TableCell className="px-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
        {row.product_code ?? "—"}
      </TableCell>

      <TableCell className="px-3 text-sm">
        {row.category ?? <span className="text-muted-foreground">—</span>}
      </TableCell>

      <TableCell className="px-3">
        {row.source ? (
          <Badge variant="outline" className="text-xs font-normal max-w-[140px] truncate">
            {prettifySource(row.source)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="px-3">
        {row.label_status ? (
          <StatusBadge tone={labelStatusTone(row.label_status)}>
            {prettifyLabel(row.label_status)}
          </StatusBadge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="px-3">
        {row.image_quality ? (
          <StatusBadge tone={imageQualityTone(row.image_quality)}>
            {prettifyLabel(row.image_quality)}
          </StatusBadge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="px-3 text-right" onClick={stop}>
        <InlineNumber
          value={row.partner_price}
          onSave={(v) => onSaveField(row.id, "partner_price", v)}
          render={(v) => formatCurrency(v)}
        />
      </TableCell>

      <TableCell className="px-3 text-right text-muted-foreground" onClick={stop}>
        <InlineNumber
          value={row.suggested_mrp}
          onSave={(v) => onSaveField(row.id, "suggested_mrp", v)}
          render={(v) => formatCurrency(v)}
        />
      </TableCell>

      <TableCell className="px-3 text-right" onClick={stop}>
        <InlineNumber
          value={row.stock_quantity}
          integer
          onSave={(v) => onSaveField(row.id, "stock_quantity", v)}
          render={(v) => (v ?? 0).toLocaleString()}
        />
      </TableCell>

      <TableCell className="px-3" onClick={stop}>
        <PublishToggle
          checked={row.is_published}
          onChange={(v) => onSaveField(row.id, "is_published", v)}
        />
      </TableCell>

      <TableCell className="px-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "2-digit",
            })
          : "—"}
      </TableCell>

      <TableCell className="pr-3 text-right" onClick={stop}>
        <button
          onClick={onDelete}
          className="size-7 rounded hover:bg-muted text-muted-foreground inline-flex items-center justify-center"
          aria-label="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </TableCell>
    </TableRow>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Inline edit primitives
 * ──────────────────────────────────────────────────────────────────────── */

function InlineNumber({
  value,
  onSave,
  render,
  integer,
}: {
  value: number | null
  onSave: (v: number | null) => Promise<boolean>
  render: (v: number | null) => ReactNode
  integer?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setText(value === null || value === undefined ? "" : String(value))
      setErr(null)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editing, value])

  async function commit() {
    if (busy) return
    const raw = text.trim()
    let parsed: number | null
    if (raw === "") parsed = null
    else {
      const n = integer ? parseInt(raw, 10) : parseFloat(raw)
      if (Number.isNaN(n)) {
        setErr("Not a number")
        return
      }
      parsed = n
    }
    if (parsed === value) {
      setEditing(false)
      return
    }
    setBusy(true)
    const ok = await onSave(parsed)
    setBusy(false)
    if (ok) {
      setEditing(false)
      setErr(null)
    } else {
      setErr("Save failed")
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="tabular-nums hover:bg-muted/60 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors"
      >
        {render(value)}
      </button>
    )
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <input
        ref={inputRef}
        type="number"
        step={integer ? "1" : "0.01"}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          } else if (e.key === "Escape") {
            e.preventDefault()
            setEditing(false)
            setErr(null)
          }
        }}
        className={cn(
          "h-7 w-24 px-2 rounded border bg-background text-sm text-right tabular-nums",
          err ? "border-destructive" : "border-input",
        )}
      />
      {err && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="text-[10px] text-destructive font-medium hover:underline"
        >
          {err} — retry
        </button>
      )}
    </div>
  )
}

function PublishToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => Promise<boolean>
}) {
  const [optimistic, setOptimistic] = useState(checked)
  const [busy, setBusy] = useState(false)
  useEffect(() => setOptimistic(checked), [checked])

  async function toggle() {
    if (busy) return
    const next = !optimistic
    setOptimistic(next)
    setBusy(true)
    const ok = await onChange(next)
    setBusy(false)
    if (!ok) setOptimistic(!next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      disabled={busy}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        optimistic ? "bg-emerald-500" : "bg-slate-300",
        busy && "opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          optimistic ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Edit drawer (unchanged from original — still 9-ish fields)
 * ──────────────────────────────────────────────────────────────────────── */

function ProductDrawer({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  initial: ProductRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [category, setCategory] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [barcode, setBarcode] = useState("")
  const [image, setImage] = useState("")
  const [material, setMaterial] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name_cn ?? "")
      setNameEn(initial.name_en ?? "")
      setCategory(initial.category ?? "")
      setUnitPrice(initial.unit_price?.toString() ?? "")
      setBarcode(initial.barcode ?? "")
      setImage(initial.image_url ?? "")
      setMaterial(initial.material ?? "")
      setIsActive(initial.is_active ?? true)
    } else {
      setName("")
      setNameEn("")
      setCategory("")
      setUnitPrice("")
      setBarcode("")
      setImage("")
      setMaterial("")
      setIsActive(true)
    }
    setErr(null)
  }, [open, initial])

  async function submit() {
    if (!name.trim() && !nameEn.trim()) {
      setErr("Name (CN or EN) is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      name_cn: name.trim() || nameEn.trim(),
      name_en: nameEn.trim() || null,
      category: category.trim() || null,
      unit_price: unitPrice ? parseFloat(unitPrice) : null,
      barcode: barcode.trim() || null,
      image_url: image.trim() || null,
      material: material.trim() || null,
      is_active: isActive,
    }
    let error
    if (mode === "edit" && initial) {
      ;({ error } = await supabaseEts.from("products").update(payload).eq("id", initial.id))
    } else {
      ;({ error } = await supabaseEts.from("products").insert({
        ...payload,
        product_code: `MAN-${Date.now()}`,
      }))
    }
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    toast.success(mode === "edit" ? "Saved" : "Created")
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Edit product" : "New product"}
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : mode === "edit" ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === "edit" && initial?.product_code && (
          <div className="text-xs font-mono text-muted-foreground">
            SKU: {initial.product_code}
          </div>
        )}
        <Field label="Name (CN)" required>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <Field label="Name (EN)">
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
          </Field>
          <Field label="Unit price">
            <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Barcode">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <Field label="Image">
          <div className="flex gap-3">
            <div className="h-24 w-24 shrink-0 rounded-md border bg-muted/40 overflow-hidden flex items-center justify-center">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">no image</span>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              />
              {initial?.image_url && image !== initial.image_url && (
                <button
                  type="button"
                  onClick={() => setImage(initial.image_url ?? "")}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  reset to saved
                </button>
              )}
            </div>
          </div>
        </Field>
        <Field label="Material">
          <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        {err && (
          <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm ring-1 ring-red-200">{err}</div>
        )}
        <p className="text-xs text-muted-foreground">
          Pro tip: most edits (stock, prices, publish toggle) can be made inline from the table.
          Use the full detail page for richer edits.
        </p>
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
