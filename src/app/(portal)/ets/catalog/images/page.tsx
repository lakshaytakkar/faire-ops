"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ImageIcon, LayoutGrid, Rows3 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { bulkUpdateProducts } from "@/lib/ets-bulk"
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

type ImageQuality = "ok" | "needs_review" | "regen_pending" | "regen_done"

interface ProductRow {
  id: string
  product_code: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  image_url: string | null
  image_quality: ImageQuality | null
  label_status: string | null
}

type ViewMode = "grid" | "table"

const QUALITY_OPTIONS: ImageQuality[] = [
  "needs_review",
  "regen_pending",
  "regen_done",
  "ok",
]

const DEFAULT_QUALITIES: ImageQuality[] = ["needs_review", "regen_pending"]

const PAGE_SIZE = 50
const LEGACY_IMAGE_MARKER = "cnzzmbddkurnztfjhxpp"

// tone override: map image-quality values to semantic tones (they aren't all
// in the default status-badge map).
function toneForQuality(q: ImageQuality | null | undefined): StatusTone {
  if (q === "ok") return "emerald"
  if (q === "regen_done") return "emerald"
  if (q === "regen_pending") return "amber"
  if (q === "needs_review") return "red"
  return toneForStatus(q)
}

function displayName(p: ProductRow): string {
  return p.name_en?.trim() || p.name_cn?.trim() || "Untitled"
}

// ─── page ─────────────────────────────────────────────────────────────────

export default function EtsImagesPage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full" />}>
      <ImagesPageInner />
    </Suspense>
  )
}

function ImagesPageInner() {
  const router = useRouter()
  const search = useSearchParams()

  // ── URL state
  const qualities = useMemo<ImageQuality[]>(() => {
    const raw = search.get("q")
    if (raw === null) return DEFAULT_QUALITIES
    if (raw === "") return []
    return raw
      .split(",")
      .filter((x): x is ImageQuality => QUALITY_OPTIONS.includes(x as ImageQuality))
  }, [search])
  const searchTerm = search.get("search") ?? ""
  const category = search.get("category") ?? "all"
  const legacyOnly = search.get("legacy") === "1"
  const chineseLabelOnly = search.get("zh") === "1"
  const view = ((search.get("view") as ViewMode) ?? "grid") as ViewMode
  const page = Math.max(0, parseInt(search.get("page") ?? "0", 10) || 0)

  // ── local state
  const [rows, setRows] = useState<ProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<ImageQuality, number>>({
    ok: 0,
    needs_review: 0,
    regen_pending: 0,
    regen_done: 0,
  })
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reloadKey, setReloadKey] = useState(0)

  // ── URL writer
  const writeUrl = useCallback(
    (next: Record<string, string | number | boolean | null>) => {
      const params = new URLSearchParams(search.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === undefined || v === "") params.delete(k)
        else if (typeof v === "boolean") {
          if (v) params.set(k, "1")
          else params.delete(k)
        } else {
          params.set(k, String(v))
        }
      }
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, search],
  )

  function toggleQuality(q: ImageQuality) {
    const cur = new Set(qualities)
    if (cur.has(q)) cur.delete(q)
    else cur.add(q)
    const next = Array.from(cur)
    // empty string preserves the "explicitly empty" state so the effect
    // doesn't fall back to DEFAULT_QUALITIES.
    const params = new URLSearchParams(search.toString())
    if (next.length === 0) params.set("q", "")
    else params.set("q", next.join(","))
    params.set("page", "0")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // ── categories dropdown
  useEffect(() => {
    let cancelled = false
    async function loadCats() {
      const { data } = await supabaseEts
        .from("products")
        .select("category")
        .not("category", "is", null)
        .limit(2000)
      if (cancelled || !data) return
      const set = new Set<string>()
      for (const row of data as { category: string | null }[]) {
        if (row.category) set.add(row.category)
      }
      setCategories(Array.from(set).sort())
    }
    loadCats()
    return () => {
      cancelled = true
    }
  }, [])

  // ── quality counts (overall, not filtered)
  useEffect(() => {
    let cancelled = false
    async function run() {
      const entries = await Promise.all(
        QUALITY_OPTIONS.map(async (q) => {
          const { count } = await supabaseEts
            .from("products")
            .select("id", { head: true, count: "exact" })
            .eq("image_quality", q)
          return [q, count ?? 0] as const
        }),
      )
      if (cancelled) return
      setCounts(Object.fromEntries(entries) as Record<ImageQuality, number>)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ── rows
  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      let q = supabaseEts
        .from("products")
        .select(
          "id, product_code, name_en, name_cn, category, image_url, image_quality, label_status",
          { count: "exact" },
        )
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
        .order("name_en", { ascending: true, nullsFirst: false })
      if (qualities.length > 0) q = q.in("image_quality", qualities)
      else {
        // explicit empty → return nothing by applying an impossible filter
        q = q.eq("image_quality", "__none__" as ImageQuality)
      }
      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`
        q = q.or(
          `name_en.ilike.${term},name_cn.ilike.${term},product_code.ilike.${term}`,
        )
      }
      if (category !== "all") q = q.eq("category", category)
      if (legacyOnly) q = q.ilike("image_url", `%${LEGACY_IMAGE_MARKER}%`)
      if (chineseLabelOnly) q = q.eq("label_status", "chinese")
      const { data, count } = await q
      if (cancelled) return
      setRows((data ?? []) as ProductRow[])
      setTotal(count ?? 0)
      setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    qualities,
    searchTerm,
    category,
    legacyOnly,
    chineseLabelOnly,
    page,
    reloadKey,
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── selection
  const allIds = useMemo(() => rows.map((r) => r.id), [rows])
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
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

  async function runBulk(q: ImageQuality, label: string) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (!confirm(`Apply "${label}" to ${ids.length} product(s)?`)) return
    const { error, updated } = await bulkUpdateProducts(ids, {
      image_quality: q,
    })
    if (error) {
      alert(`Bulk update failed: ${error}`)
      return
    }
    setSelected(new Set())
    setReloadKey((k) => k + 1)
    console.info(`[ets/images] ${label} (${updated} row(s))`)
  }

  const regenPendingSelectedCount = useMemo(() => {
    return rows.filter(
      (r) => selected.has(r.id) && r.image_quality === "regen_pending",
    ).length
  }, [rows, selected])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Image quality"
        subtitle="Triage product imagery and queue items for Gemini AI regeneration."
        breadcrumbs={[
          { label: "ETS", href: "/ets/overview" },
          { label: "Catalog", href: "/ets/catalog/products" },
          { label: "Images" },
        ]}
        actions={
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <ViewTab
              active={view === "grid"}
              onClick={() => writeUrl({ view: "grid" })}
              icon={<LayoutGrid className="size-3.5" />}
              label="Grid"
            />
            <ViewTab
              active={view === "table"}
              onClick={() => writeUrl({ view: "table" })}
              icon={<Rows3 className="size-3.5" />}
              label="Table"
            />
          </div>
        }
      />

      {/* Summary counts */}
      <div className="rounded-lg border border-border/80 bg-card px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-muted-foreground">
          <CountItem n={counts.needs_review} label="needs_review" tone="red" />
          <Dot />
          <CountItem
            n={counts.regen_pending}
            label="regen_pending"
            tone="amber"
          />
          <Dot />
          <CountItem
            n={counts.regen_done}
            label="regen_done"
            tone="emerald"
          />
          <Dot />
          <CountItem n={counts.ok} label="ok" tone="emerald" />
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        search={{
          value: searchTerm,
          onChange: (v) => writeUrl({ search: v, page: 0 }),
          placeholder: "Search SKU or name…",
        }}
        right={
          <>
            <select
              value={category}
              onChange={(e) =>
                writeUrl({ category: e.target.value, page: 0 })
              }
              className="h-8 px-2 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ToggleChip
              active={legacyOnly}
              onClick={() => writeUrl({ legacy: !legacyOnly, page: 0 })}
            >
              Legacy images
            </ToggleChip>
            <ToggleChip
              active={chineseLabelOnly}
              onClick={() =>
                writeUrl({ zh: !chineseLabelOnly, page: 0 })
              }
            >
              Chinese label
            </ToggleChip>
          </>
        }
      />

      {/* Image quality chip group */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
          Quality
        </span>
        {QUALITY_OPTIONS.map((q) => {
          const active = qualities.includes(q)
          return (
            <button
              key={q}
              type="button"
              onClick={() => toggleQuality(q)}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-full border transition-colors inline-flex items-center gap-1.5",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted",
              )}
            >
              {q}
              <span
                className={cn(
                  "inline-flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  active
                    ? "bg-primary-foreground/20"
                    : "bg-muted-foreground/15",
                )}
              >
                {counts[q]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          {regenPendingSelectedCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-semibold">
              {regenPendingSelectedCount} queued for regen
            </span>
          )}
          <span className="h-4 w-px bg-border" />
          <BulkButton
            onClick={() => runBulk("regen_pending", "Mark for regen")}
          >
            Mark for regen
          </BulkButton>
          <BulkButton onClick={() => runBulk("ok", "Clear flag (mark OK)")}>
            Clear flag (OK)
          </BulkButton>
          <BulkButton
            onClick={() => runBulk("needs_review", "Mark needs review")}
          >
            Mark needs review
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

      {/* Content */}
      {!loading && rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No products match"
          description="Adjust the filters to see products."
        />
      ) : view === "grid" ? (
        <GridView
          rows={rows}
          loading={loading}
          selected={selected}
          toggleOne={toggleOne}
        />
      ) : (
        <TableView
          rows={rows}
          loading={loading}
          selected={selected}
          allSelected={allSelected}
          toggleAll={toggleAll}
          toggleOne={toggleOne}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} — showing{" "}
            {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of{" "}
            {total.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => writeUrl({ page: Math.max(0, page - 1) })}
              className="h-8 px-3 rounded-md border bg-card text-sm hover:bg-muted/40 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => writeUrl({ page: page + 1 })}
              className="h-8 px-3 rounded-md border bg-card text-sm hover:bg-muted/40 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── grid view ────────────────────────────────────────────────────────────

function GridView({
  rows,
  loading,
  selected,
  toggleOne,
}: {
  rows: ProductRow[]
  loading: boolean
  selected: Set<string>
  toggleOne: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {rows.map((p) => {
        const isSel = selected.has(p.id)
        const slug = p.product_code ?? p.id
        return (
          <div
            key={p.id}
            className={cn(
              "group relative rounded-lg overflow-hidden border bg-card shadow-sm",
              isSel ? "border-primary ring-2 ring-primary/30" : "border-border/80",
            )}
          >
            {/* Selection checkbox — top left */}
            <label className="absolute left-2 top-2 z-10 inline-flex items-center bg-card/80 backdrop-blur-sm rounded p-0.5">
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => toggleOne(p.id)}
                aria-label={`Select ${p.product_code ?? p.id}`}
              />
            </label>
            {/* Quality badge — top right */}
            <div className="absolute right-2 top-2 z-10">
              <StatusBadge tone={toneForQuality(p.image_quality)}>
                {p.image_quality ?? "unset"}
              </StatusBadge>
            </div>
            {/* Image → detail */}
            <Link
              href={`/ets/products/${slug}`}
              className="block aspect-square bg-muted relative"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={displayName(p)}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[10px] font-mono opacity-80 truncate">
                  {p.product_code ?? "—"}
                </div>
                <div className="text-xs font-medium line-clamp-2 leading-tight">
                  {displayName(p)}
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ─── table view ───────────────────────────────────────────────────────────

function TableView({
  rows,
  loading,
  selected,
  allSelected,
  toggleAll,
  toggleOne,
}: {
  rows: ProductRow[]
  loading: boolean
  selected: Set<string>
  allSelected: boolean
  toggleAll: () => void
  toggleOne: (id: string) => void
}) {
  return (
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
              <Th className="w-20" />
              <Th>SKU</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Image quality</Th>
              <Th>Label</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((p) => {
                  const isSel = selected.has(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-b border-border last:border-0 hover:bg-muted/30",
                        isSel && "bg-primary/5",
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(p.id)}
                          aria-label={`Select ${p.product_code ?? p.id}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <ProductThumbnail
                          src={p.image_url}
                          alt={displayName(p)}
                          size={56}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {p.product_code ?? "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[260px]">
                        <div className="font-medium text-sm line-clamp-1">
                          {displayName(p)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">
                        {p.category ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={toneForQuality(p.image_quality)}>
                          {p.image_quality ?? "unset"}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2">
                        {p.label_status ? (
                          <StatusBadge tone={toneForStatus(p.label_status)}>
                            {p.label_status}
                          </StatusBadge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/ets/products/${p.product_code ?? p.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── shared small bits ────────────────────────────────────────────────────

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
        : tone === "emerald"
          ? "text-emerald-700"
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

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-2.5 text-xs font-medium rounded-md border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
