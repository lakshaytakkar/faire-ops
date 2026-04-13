"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Package, Plus, Trash2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsStatusBadge,
  EtsEmptyState,
  EtsEditDrawer,
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"

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
  stock_quantity: number | null
  image_url: string | null
  material: string | null
  is_active: boolean
  is_published: boolean
  market_fit: string | null
  vendor_id: string | null
}

const PAGE_SIZE = 50

export default function EtsProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [reloadKey])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabaseEts
        .from("products")
        .select(
          "id, product_code, barcode, name_en, name_cn, category, unit_price, wholesale_price_inr, partner_price, suggested_mrp, stock_quantity, image_url, material, is_active, is_published, market_fit, vendor_id",
          { count: "exact" },
        )
        .order("name_en", { ascending: true, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      if (search.trim()) {
        const term = `%${search.trim()}%`
        q = q.or(
          `name_en.ilike.${term},name_cn.ilike.${term},product_code.ilike.${term},barcode.ilike.${term}`,
        )
      }
      if (category !== "all") q = q.eq("category", category)
      const { data, count } = await q
      if (cancelled) return
      setRows((data ?? []) as ProductRow[])
      setTotal(count ?? 0)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, search, category, reloadKey])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  async function handleDelete(p: ProductRow, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${p.name_en || p.name_cn || p.product_code}"?`)) return
    const { error } = await supabaseEts.from("products").delete().eq("id", p.id)
    if (error) {
      alert(error.message)
      return
    }
    setReloadKey((k) => k + 1)
  }

  return (
    <EtsListShell
      title="Products"
      subtitle={loading ? "Loading…" : `${total.toLocaleString()} products`}
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New product
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="w-full h-10 pl-10 pr-3 rounded-md border bg-card text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(0)
            }}
            className="h-10 px-3 rounded-md border bg-card text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && rows.length === 0 ? (
        <EtsEmptyState
          icon={Package}
          title="No products match"
          description="Adjust the search or filter to see products."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Product</EtsTH>
            <EtsTH>SKU</EtsTH>
            <EtsTH>Category</EtsTH>
            <EtsTH className="text-right">Partner</EtsTH>
            <EtsTH className="text-right">MRP</EtsTH>
            <EtsTH className="text-right">Stock</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH />
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((p) => (
                  <EtsTR key={p.id} onClick={() => setEditing(p)}>
                    <EtsTD>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="size-10 rounded object-cover bg-muted shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/ets/products/${p.product_code ?? p.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium leading-tight hover:text-primary line-clamp-2"
                          >
                            {p.name_en || p.name_cn || "Untitled"}
                          </Link>
                          {p.material && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.material}
                            </div>
                          )}
                        </div>
                      </div>
                    </EtsTD>
                    <EtsTD className="text-sm text-muted-foreground">
                      {p.product_code ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-sm">{p.category ?? "—"}</EtsTD>
                    <EtsTD className="text-right text-sm">
                      {formatCurrency(p.partner_price)}
                    </EtsTD>
                    <EtsTD className="text-right text-sm text-muted-foreground">
                      {formatCurrency(p.suggested_mrp)}
                    </EtsTD>
                    <EtsTD className="text-right text-sm">
                      {p.stock_quantity ?? 0}
                    </EtsTD>
                    <EtsTD>
                      <div className="flex flex-col gap-1">
                        {p.is_published && (
                          <EtsStatusBadge value="Published" />
                        )}
                        {!p.is_active && <EtsStatusBadge value="Inactive" />}
                      </div>
                    </EtsTD>
                    <EtsTD className="text-right">
                      <button
                        onClick={(e) => handleDelete(p, e)}
                        className="size-7 rounded hover:bg-muted text-muted-foreground inline-flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

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
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-8 px-3 rounded-md border bg-card text-sm hover:bg-muted/40 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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
    </EtsListShell>
  )
}

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
        <Field label="Image URL">
          <input value={image} onChange={(e) => setImage(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <Field label="Material">
          <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>
        )}
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
