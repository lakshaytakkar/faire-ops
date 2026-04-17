"use client"

import { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { supabaseB2BEcosystem } from "@/lib/supabase"

interface ProductRow {
  id: string
  name: string | null
  status: string | null
  price_cents: number | null
  variant_count: number | null
  inventory_total: number | null
}

export default function B2BEcosystemCatalogPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseB2BEcosystem
        .from("faire_products")
        .select("id, name, status, price_cents, variant_count, inventory_total")
        .order("name")
      if (cancelled) return
      setRows((data as ProductRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-heading">Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Product listings for Toyarina.com and Gullee.com
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm p-10 text-center space-y-3">
          <Package className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No products listed yet. Build the D2C catalog for your brands.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Variants
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Inventory
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {row.name ?? "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {row.status ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.price_cents != null
                        ? `$${(row.price_cents / 100).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.variant_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.inventory_total ?? 0}
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
