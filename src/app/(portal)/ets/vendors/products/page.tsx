"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Package } from "lucide-react"
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
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"

interface VendorProduct {
  id: string
  vendor_id: string | null
  product_id: string | null
  vendor_sku: string | null
  vendor_price_inr: number | null
  lead_time_days: number | null
  moq: number | null
  available_stock: number | null
  is_active: boolean
  name: string | null
  brand: string | null
  material: string | null
  mrp: number | null
  hsn_code: string | null
  listing_status: string | null
  rejection_reason: string | null
  created_at: string | null
}

interface VendorMini {
  id: string
  name: string
}

export default function EtsVendorProductsPage() {
  const [rows, setRows] = useState<VendorProduct[]>([])
  const [vendors, setVendors] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: productRows }, { data: vendorRows }] = await Promise.all([
        supabaseEts
          .from("vendor_products")
          .select(
            "id, vendor_id, product_id, vendor_sku, vendor_price_inr, lead_time_days, moq, available_stock, is_active, name, brand, material, mrp, hsn_code, listing_status, rejection_reason, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseEts.from("vendors").select("id, name"),
      ])
      if (cancelled) return
      setRows((productRows ?? []) as VendorProduct[])
      setVendors(
        new Map(((vendorRows ?? []) as VendorMini[]).map((v) => [v.id, v.name])),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const vendorList = useMemo(() => {
    const entries = Array.from(vendors.entries())
    return entries.sort((a, b) => a[1].localeCompare(b[1]))
  }, [vendors])

  const statuses = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.listing_status && set.add(r.listing_status))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (vendorFilter !== "all" && r.vendor_id !== vendorFilter) return false
      if (statusFilter !== "all" && r.listing_status !== statusFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const vendorName = r.vendor_id ? vendors.get(r.vendor_id) ?? "" : ""
        const hay = [r.name, r.vendor_sku, r.brand, r.hsn_code, vendorName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, vendorFilter, statusFilter, vendors])

  return (
    <EtsListShell
      title="Vendor products"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} product${rows.length === 1 ? "" : "s"}`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, SKU, brand, HSN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All vendors</option>
            {vendorList.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={Package}
          title="No vendor products match"
          description="Adjust filters or have vendors submit catalog listings."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Product</EtsTH>
            <EtsTH>Vendor</EtsTH>
            <EtsTH>SKU</EtsTH>
            <EtsTH className="text-right">Price</EtsTH>
            <EtsTH className="text-right">MRP</EtsTH>
            <EtsTH className="text-right">MOQ</EtsTH>
            <EtsTH className="text-right">Stock</EtsTH>
            <EtsTH className="text-right">Lead</EtsTH>
            <EtsTH>Status</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((p) => (
                  <EtsTR key={p.id}>
                    <EtsTD>
                      <div className="text-sm font-semibold">{p.name ?? "—"}</div>
                      {p.brand && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {p.brand} {p.material ? `· ${p.material}` : ""}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {p.vendor_id ? (
                        <Link
                          href={`/ets/vendors/${p.vendor_id}`}
                          className="hover:text-emerald-700"
                        >
                          {vendors.get(p.vendor_id) ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs font-mono">
                      {p.vendor_sku ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs">
                      {formatCurrency(p.vendor_price_inr)}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs text-muted-foreground">
                      {formatCurrency(p.mrp)}
                    </EtsTD>
                    <EtsTD className="text-right text-xs">{p.moq ?? "—"}</EtsTD>
                    <EtsTD className="text-right text-xs">
                      {p.available_stock ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-right text-xs">
                      {p.lead_time_days ? `${p.lead_time_days}d` : "—"}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={p.listing_status} />
                      {!p.is_active && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          inactive
                        </div>
                      )}
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
