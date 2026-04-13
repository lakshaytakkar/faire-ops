"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Package, ArrowRight, Plus, Trash2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"

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

  // Load distinct category values for the filter (from products.category)
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
        q = q.or(`name_en.ilike.${term},name_cn.ilike.${term},product_code.ilike.${term},barcode.ilike.${term}`)
      }
      if (category !== "all") {
        q = q.eq("category", category)
      }
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

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
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total.toLocaleString()} products`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, code, barcode…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-card text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(0)
          }}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th>Image</Th>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Category</Th>
                <Th className="text-right">Partner ₹</Th>
                <Th className="text-right">MRP ₹</Th>
                <Th className="text-right">Stock</Th>
                <Th>Status</Th>
                <Th />
                <Th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No products match.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer"
                  >
                    <td className="px-4 py-2">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt=""
                          className="size-10 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="size-10 rounded bg-muted flex items-center justify-center">
                          <Package className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-sm leading-tight">
                        {p.name_en || p.name_cn || "—"}
                      </div>
                      {p.name_cn && p.name_en && p.name_cn !== p.name_en && (
                        <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {p.name_cn}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{p.product_code ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{p.category ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {p.partner_price ? `₹${p.partner_price.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {p.suggested_mrp ? `₹${p.suggested_mrp.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {p.stock_quantity ?? 0}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        {p.is_published && (
                          <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 w-fit">
                            Published
                          </span>
                        )}
                        {!p.is_active && (
                          <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 w-fit">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/ets/products/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View <ArrowRight className="size-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => handleDelete(p, e)}
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} — showing{" "}
            {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of{" "}
            {total.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-8 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-50"
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
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide ${className ?? ""}`}
    >
      {children}
    </th>
  )
}

import { EtsEditDrawer } from "@/app/(portal)/ets/_components/ets-ui"

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
            className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40"
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
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Name (EN)">
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label="Unit price">
            <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Barcode">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Image URL">
          <input value={image} onChange={(e) => setImage(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Material">
          <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>
        )}
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
