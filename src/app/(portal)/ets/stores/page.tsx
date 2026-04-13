"use client"

import { useEffect, useState } from "react"
import { MapPin, Store as StoreIcon } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { SubNav } from "@/components/shared/sub-nav"

const SUB_NAV_ITEMS = [
  { title: "Dashboard", href: "/ets/dashboard" },
  { title: "Products", href: "/ets/products" },
  { title: "Stores", href: "/ets/stores" },
  { title: "Clients", href: "/ets/clients" },
  { title: "Vendors", href: "/ets/vendors" },
  { title: "More", href: "/ets/more" },
]

interface StoreRow {
  id: string
  name: string
  city: string | null
  state: string | null
  address: string | null
  pincode: string | null
  store_size_sqft: number | null
  floor_type: string | null
  launch_date: string | null
  status: string | null
  store_type: string | null
  package_tier: string | null
  client_id: string | null
}

export default function EtsStoresPage() {
  const [rows, setRows] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("stores")
        .select("id, name, city, state, address, pincode, store_size_sqft, floor_type, launch_date, status, store_type, package_tier, client_id")
        .order("name", { ascending: true })
      if (cancelled) return
      setRows((data ?? []) as StoreRow[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      <div>
        <h1 className="text-2xl font-bold">Stores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} partner store${rows.length === 1 ? "" : "s"} tracked`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card p-8 text-center">
          <StoreIcon className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No stores yet. Partners onboard into the pipeline first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-border/80 bg-card shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-bold truncate">{s.name}</div>
                  {(s.city || s.state) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" />
                      {[s.city, s.state].filter(Boolean).join(", ")}
                      {s.pincode && ` · ${s.pincode}`}
                    </div>
                  )}
                </div>
                {s.status && (
                  <span
                    className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      s.status === "live"
                        ? "bg-emerald-50 text-emerald-700"
                        : s.status === "launching"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.status}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Field label="Size" value={s.store_size_sqft ? `${s.store_size_sqft} sqft` : "—"} />
                <Field label="Type" value={s.store_type ?? "—"} />
                <Field label="Floor" value={s.floor_type ?? "—"} />
                <Field label="Package" value={s.package_tier ?? "—"} />
                <Field
                  label="Launch"
                  value={s.launch_date ? new Date(s.launch_date).toLocaleDateString() : "—"}
                />
                <Field label="Address" value={s.address ?? "—"} wrap />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-xs mt-0.5 ${wrap ? "" : "truncate"}`}>{value}</div>
    </div>
  )
}
