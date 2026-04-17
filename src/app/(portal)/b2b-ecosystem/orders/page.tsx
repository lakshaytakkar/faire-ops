"use client"

import { useEffect, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { supabaseB2BEcosystem } from "@/lib/supabase"

interface OrderRow {
  id: string
  display_id: string | null
  state: string | null
  total_cents: number | null
  item_count: number | null
  faire_created_at: string | null
}

export default function B2BEcosystemOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseB2BEcosystem
        .from("faire_orders")
        .select("id, display_id, state, total_cents, item_count, faire_created_at")
        .order("faire_created_at", { ascending: false })
      if (cancelled) return
      setRows((data as OrderRow[]) ?? [])
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
        <h1 className="text-2xl font-bold font-heading">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faire orders across Toyarina.com and Gullee.com
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm p-10 text-center space-y-3">
          <ShoppingBag className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No orders yet. Orders will appear as Toyarina.com and Gullee.com go
            live.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Items
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {row.display_id ?? row.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {row.state ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.item_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      ${((row.total_cents ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {row.faire_created_at
                        ? new Date(row.faire_created_at).toLocaleDateString()
                        : "—"}
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
