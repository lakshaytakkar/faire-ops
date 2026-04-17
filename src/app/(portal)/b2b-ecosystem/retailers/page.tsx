"use client"

import { useEffect, useState } from "react"
import { Users } from "lucide-react"
import { supabaseB2BEcosystem } from "@/lib/supabase"

interface RetailerRow {
  id: string
  name: string | null
  location: string | null
  order_count: number | null
  total_spent_cents: number | null
}

export default function B2BEcosystemRetailersPage() {
  const [rows, setRows] = useState<RetailerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseB2BEcosystem
        .from("faire_retailers")
        .select("id, name, location, order_count, total_spent_cents")
        .order("name")
      if (cancelled) return
      setRows((data as RetailerRow[]) ?? [])
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
        <h1 className="text-2xl font-bold font-heading">Retailers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retail partners and wholesale accounts
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm p-10 text-center space-y-3">
          <Users className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No retailers yet. Retailer data will appear as operations begin.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Retailer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Location
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Total Spent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {row.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {row.location ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.order_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {row.total_spent_cents != null
                        ? `$${(row.total_spent_cents / 100).toFixed(2)}`
                        : "$0.00"}
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
