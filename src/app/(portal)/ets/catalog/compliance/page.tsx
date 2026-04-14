"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, ShieldCheck } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { bulkUpdateProducts, updateProduct } from "@/lib/ets-bulk"
import { PageHeader } from "@/components/shared/page-header"
import { FilterBar } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import {
  StatusBadge,
  toneForStatus,
  type StatusTone,
} from "@/components/shared/status-badge"
import { ProductThumbnail } from "@/components/shared/product-thumbnail"
import { cn } from "@/lib/utils"

// ─── types ────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  product_code: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  image_url: string | null
  hs_code: string | null
  label_status: string | null
  compliance_status: string | null
  bis_required: boolean | null
  bis_status: string | null
  created_at: string | null
}

type FilterKey =
  | "missing_hs"
  | "missing_label"
  | "bis_unfiled"
  | "compliance_unset"
  | "restricted"

const FILTER_DEFS: { key: FilterKey; label: string }[] = [
  { key: "missing_hs", label: "Missing HS code" },
  { key: "missing_label", label: "Label status unset" },
  { key: "bis_unfiled", label: "BIS required, not filed" },
  { key: "compliance_unset", label: "Compliance unset" },
  { key: "restricted", label: "Restricted items" },
]

const DEFAULT_FILTERS: FilterKey[] = [
  "missing_hs",
  "missing_label",
  "bis_unfiled",
]

type SortKey = "missing" | "category" | "created_at"

const LABEL_OPTIONS = ["english", "chinese", "needs_relabel"] as const
const COMPLIANCE_OPTIONS = ["safe", "restricted", "unknown"] as const

// Build the server filter as an OR of predicates matching the selected chips.
function buildOrFilter(active: FilterKey[]): string | null {
  if (active.length === 0) return null
  const parts: string[] = []
  for (const key of active) {
    if (key === "missing_hs") parts.push("hs_code.is.null", "hs_code.eq.")
    else if (key === "missing_label") parts.push("label_status.is.null")
    else if (key === "bis_unfiled")
      parts.push("and(bis_required.eq.true,bis_status.is.null)")
    else if (key === "compliance_unset") parts.push("compliance_status.is.null")
    else if (key === "restricted") parts.push("compliance_status.eq.restricted")
  }
  return parts.join(",")
}

function missingFieldCount(p: ProductRow): number {
  let n = 0
  if (!p.hs_code) n++
  if (!p.label_status) n++
  if (!p.compliance_status) n++
  if (p.bis_required && !p.bis_status) n++
  return n
}

function displayName(p: ProductRow): string {
  return p.name_en?.trim() || p.name_cn?.trim() || "Untitled"
}

// ─── page (outer, for Suspense boundary around useSearchParams) ──────────

export default function EtsCompliancePage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full" />}>
      <CompliancePageInner />
    </Suspense>
  )
}

function CompliancePageInner() {
  const router = useRouter()
  const search = useSearchParams()

  // URL state
  const filtersFromUrl = useMemo<FilterKey[]>(() => {
    const raw = search.get("f")
    if (raw === null) return DEFAULT_FILTERS
    if (raw === "") return []
    const parts = raw.split(",") as FilterKey[]
    return parts.filter((k) =>
      FILTER_DEFS.some((d) => d.key === k),
    ) as FilterKey[]
  }, [search])
  const sortFromUrl = (search.get("sort") as SortKey | null) ?? "missing"

  const [rows, setRows] = useState<ProductRow[]>([])
  const [counts, setCounts] = useState<Record<FilterKey, number>>({
    missing_hs: 0,
    missing_label: 0,
    bis_unfiled: 0,
    compliance_unset: 0,
    restricted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reloadKey, setReloadKey] = useState(0)

  // ── update URL helpers
  const writeUrl = useCallback(
    (next: Partial<{ filters: FilterKey[]; sort: SortKey }>) => {
      const params = new URLSearchParams(search.toString())
      if (next.filters !== undefined) {
        if (next.filters.length === 0) params.set("f", "")
        else params.set("f", next.filters.join(","))
      }
      if (next.sort !== undefined) params.set("sort", next.sort)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, search],
  )

  function toggleFilter(k: FilterKey) {
    const cur = new Set(filtersFromUrl)
    if (cur.has(k)) cur.delete(k)
    else cur.add(k)
    writeUrl({ filters: Array.from(cur) })
  }

  // ── data load
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const orFilter = buildOrFilter(filtersFromUrl)
      let q = supabaseEts
        .from("products")
        .select(
          "id, product_code, name_en, name_cn, category, image_url, hs_code, label_status, compliance_status, bis_required, bis_status, created_at",
        )
        .limit(500)
      if (orFilter) q = q.or(orFilter)
      // Base ordering — client will re-sort per selected sort key.
      q = q.order("created_at", { ascending: false })
      const { data, error } = await q
      if (cancelled) return
      if (error) {
        setRows([])
        setLoading(false)
        return
      }
      setRows((data ?? []) as ProductRow[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filtersFromUrl, reloadKey])

  // ── summary counts (independent of currently applied filters)
  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const queries = {
        missing_hs: supabaseEts
          .from("products")
          .select("id", { head: true, count: "exact" })
          .or("hs_code.is.null,hs_code.eq."),
        missing_label: supabaseEts
          .from("products")
          .select("id", { head: true, count: "exact" })
          .is("label_status", null),
        bis_unfiled: supabaseEts
          .from("products")
          .select("id", { head: true, count: "exact" })
          .eq("bis_required", true)
          .is("bis_status", null),
        compliance_unset: supabaseEts
          .from("products")
          .select("id", { head: true, count: "exact" })
          .is("compliance_status", null),
        restricted: supabaseEts
          .from("products")
          .select("id", { head: true, count: "exact" })
          .eq("compliance_status", "restricted"),
      }
      const entries = await Promise.all(
        (Object.entries(queries) as [FilterKey, typeof queries.missing_hs][]).map(
          async ([k, q]) => {
            const { count } = await q
            return [k, count ?? 0] as const
          },
        ),
      )
      if (cancelled) return
      setCounts(Object.fromEntries(entries) as Record<FilterKey, number>)
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ── client-side sort
  const sortedRows = useMemo(() => {
    const copy = [...rows]
    if (sortFromUrl === "missing") {
      copy.sort((a, b) => missingFieldCount(b) - missingFieldCount(a))
    } else if (sortFromUrl === "category") {
      copy.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""))
    } else if (sortFromUrl === "created_at") {
      copy.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime(),
      )
    }
    return copy
  }, [rows, sortFromUrl])

  // ── selection helpers
  const allIds = useMemo(() => sortedRows.map((r) => r.id), [sortedRows])
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id))
  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }
  function toggleOne(id: string) {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSelected(n)
  }

  // ── inline edit
  async function saveField(id: string, field: string, value: unknown) {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
    const { error } = await updateProduct(id, { [field]: value })
    if (error) {
      alert(`Save failed: ${error}`)
      setReloadKey((k) => k + 1)
    }
  }

  // ── bulk actions
  async function runBulk(patch: Record<string, unknown>, label: string) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!confirm(`Apply "${label}" to ${ids.length} product(s)?`)) return
    const { error, updated } = await bulkUpdateProducts(ids, patch)
    if (error) {
      alert(`Bulk update failed: ${error}`)
      return
    }
    setSelected(new Set())
    setReloadKey((k) => k + 1)
    console.info(`[ets/compliance] Updated ${updated} row(s): ${label}`)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Compliance queue"
        subtitle="Products that need HS codes, labels, BIS filings, or a compliance decision. Fix in batches."
        breadcrumbs={[
          { label: "ETS", href: "/ets/overview" },
          { label: "Catalog", href: "/ets/catalog/products" },
          { label: "Compliance" },
        ]}
      />

      {/* Summary stats — inline count row (not metric cards) */}
      <div className="rounded-lg border border-border/80 bg-card px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-muted-foreground">
          <CountItem n={counts.missing_hs} label="missing HS code" tone="amber" />
          <Dot />
          <CountItem n={counts.missing_label} label="unset labels" tone="amber" />
          <Dot />
          <CountItem
            n={counts.bis_unfiled}
            label="BIS required and unfiled"
            tone="red"
          />
          <Dot />
          <CountItem
            n={counts.restricted}
            label="restricted"
            tone="red"
          />
        </div>
      </div>

      {/* Filter chips + sort */}
      <FilterBar
        right={
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_DEFS.map((f) => {
              const active = filtersFromUrl.includes(f.key)
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFilter(f.key)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-full border transition-colors inline-flex items-center gap-1.5",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "inline-flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                      active
                        ? "bg-primary-foreground/20"
                        : "bg-muted-foreground/15",
                    )}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              )
            })}
            <span className="h-5 w-px bg-border mx-1" />
            <label className="text-xs font-medium text-muted-foreground">
              Sort
            </label>
            <select
              value={sortFromUrl}
              onChange={(e) => writeUrl({ sort: e.target.value as SortKey })}
              className="h-8 px-2 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="missing">Missing fields (desc)</option>
              <option value="category">Category</option>
              <option value="created_at">Newest</option>
            </select>
          </div>
        }
      />

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <span className="h-4 w-px bg-border" />
          <BulkButton
            onClick={() =>
              runBulk({ label_status: "english" }, "Set label → English")
            }
          >
            Label: English
          </BulkButton>
          <BulkButton
            onClick={() =>
              runBulk({ label_status: "chinese" }, "Set label → Chinese")
            }
          >
            Label: Chinese
          </BulkButton>
          <BulkButton
            onClick={() =>
              runBulk(
                { label_status: "needs_relabel" },
                "Set label → Needs relabel",
              )
            }
          >
            Label: Needs relabel
          </BulkButton>
          <span className="h-4 w-px bg-border" />
          <BulkButton
            onClick={() =>
              runBulk({ compliance_status: "safe" }, "Mark compliance = Safe")
            }
          >
            Compliance: Safe
          </BulkButton>
          <BulkButton
            onClick={() =>
              runBulk(
                { compliance_status: "restricted" },
                "Mark compliance = Restricted",
              )
            }
          >
            Compliance: Restricted
          </BulkButton>
          <span className="h-4 w-px bg-border" />
          <BulkButton
            onClick={() => runBulk({ bis_required: true }, "BIS required = true")}
          >
            BIS required: on
          </BulkButton>
          <BulkButton
            onClick={() =>
              runBulk({ bis_required: false }, "BIS required = false")
            }
          >
            BIS required: off
          </BulkButton>
          <span className="ml-auto">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && sortedRows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing in queue"
          description="No products match the current compliance filters."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <Th className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </Th>
                  <Th className="w-12" />
                  <Th>SKU</Th>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>HS Code</Th>
                  <Th>Label</Th>
                  <Th>Compliance</Th>
                  <Th>BIS req</Th>
                  <Th>BIS status</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="px-3 py-2.5">
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : sortedRows.map((p) => (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-border last:border-0 hover:bg-muted/30",
                          selected.has(p.id) && "bg-primary/5",
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleOne(p.id)}
                            aria-label={`Select ${p.product_code ?? p.id}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ProductThumbnail
                            src={p.image_url}
                            alt={displayName(p)}
                            size={32}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {p.product_code ?? "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[240px]">
                          <div className="font-medium text-sm line-clamp-1">
                            {displayName(p)}
                          </div>
                          {p.name_cn && p.name_en && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {p.name_cn}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {p.category ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <InlineTextCell
                            value={p.hs_code}
                            placeholder="set…"
                            mono
                            onSave={(v) => saveField(p.id, "hs_code", v)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <InlineSelectCell
                            value={p.label_status}
                            options={LABEL_OPTIONS as unknown as string[]}
                            onChange={(v) => saveField(p.id, "label_status", v)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <InlineSelectCell
                            value={p.compliance_status}
                            options={COMPLIANCE_OPTIONS as unknown as string[]}
                            onChange={(v) =>
                              saveField(p.id, "compliance_status", v)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={!!p.bis_required}
                              onChange={(e) =>
                                saveField(
                                  p.id,
                                  "bis_required",
                                  e.target.checked,
                                )
                              }
                            />
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          {p.bis_required ? (
                            <InlineTextCell
                              value={p.bis_status}
                              placeholder="filing…"
                              onSave={(v) => saveField(p.id, "bis_status", v)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/ets/products/${p.product_code ?? p.id}`}
                            className="inline-flex size-7 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Open detail"
                          >
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── small helpers ────────────────────────────────────────────────────────

function Th({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </th>
  )
}

function Dot() {
  return <span aria-hidden className="text-muted-foreground/50">·</span>
}

function CountItem({
  n,
  label,
  tone,
}: {
  n: number
  label: string
  tone: StatusTone
}) {
  const toneClass =
    tone === "red"
      ? "text-red-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-foreground"
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={cn("font-semibold tabular-nums", toneClass)}>
        {n.toLocaleString()}
      </span>
      <span>{label}</span>
    </span>
  )
}

function BulkButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 px-2.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted"
    >
      {children}
    </button>
  )
}

function InlineTextCell({
  value,
  placeholder,
  mono,
  onSave,
}: {
  value: string | null
  placeholder?: string
  mono?: boolean
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  useEffect(() => {
    setDraft(value ?? "")
  }, [value])
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "h-7 px-2 rounded border border-transparent hover:border-border hover:bg-background text-left text-xs w-full min-w-[90px]",
          mono && "font-mono",
          !value && "text-muted-foreground italic",
        )}
      >
        {value || placeholder || "—"}
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        const trimmed = draft.trim()
        if ((value ?? "") !== trimmed) onSave(trimmed || null)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
        if (e.key === "Escape") {
          setDraft(value ?? "")
          setEditing(false)
        }
      }}
      className={cn(
        "h-7 px-2 rounded border border-input bg-background text-xs w-full min-w-[90px]",
        mono && "font-mono",
      )}
    />
  )
}

function InlineSelectCell({
  value,
  options,
  onChange,
}: {
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <StatusBadge tone={toneForStatus(value)}>{value ?? "unset"}</StatusBadge>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-6 text-xs border border-border rounded bg-background px-1"
      >
        <option value="">unset</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
