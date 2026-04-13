"use client"

import { useEffect, useState } from "react"
import { Truck, Star, Phone, Mail, ExternalLink } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
interface VendorRow {
  id: string
  name: string
  type: string
  contact_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  payment_terms: string | null
  lead_time_days: number | null
  commission_percent: number | null
  is_active: boolean
  kyc_status: string | null
  category: string | null
  rating: number | null
  total_orders: number | null
  total_revenue: number | null
  website: string | null
  description: string | null
}

export default function EtsVendorsPage() {
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("vendors")
        .select("id, name, type, contact_name, phone, email, city, state, payment_terms, lead_time_days, commission_percent, is_active, kyc_status, category, rating, total_orders, total_revenue, website, description")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true })
      if (cancelled) return
      setRows((data ?? []) as VendorRow[])
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
        <h1 className="text-2xl font-bold">Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} vendor${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Truck className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No vendors yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((v) => (
            <div
              key={v.id}
              className={`rounded-lg border border-border bg-card shadow-sm p-5 ${v.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-bold truncate">{v.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {v.contact_name && `${v.contact_name} · `}
                    {[v.city, v.state].filter(Boolean).join(", ")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${
                      v.type === "china"
                        ? "bg-red-50 text-red-700 ring-red-200"
                        : "bg-blue-50 text-blue-700 ring-blue-200"
                    }`}
                  >
                    {v.type}
                  </span>
                  {v.kyc_status && (
                    <span
                      className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                        v.kyc_status === "verified"
                          ? "bg-emerald-50 text-emerald-700"
                          : v.kyc_status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      KYC: {v.kyc_status}
                    </span>
                  )}
                </div>
              </div>

              {v.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {v.description}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Field
                  label="Orders"
                  value={(v.total_orders ?? 0).toLocaleString()}
                />
                <Field
                  label="Revenue"
                  value={`₹${Number(v.total_revenue ?? 0).toLocaleString()}`}
                />
                <Field label="Lead time" value={v.lead_time_days ? `${v.lead_time_days}d` : "—"} />
                <Field
                  label="Rating"
                  value={
                    v.rating
                      ? `${Number(v.rating).toFixed(1)} ★`
                      : "—"
                  }
                />
                <Field label="Category" value={v.category ?? "—"} />
                <Field label="Terms" value={v.payment_terms ?? "—"} />
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs">
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="flex items-center gap-1 hover:underline">
                    <Phone className="size-3" /> {v.phone}
                  </a>
                )}
                {v.email && (
                  <a
                    href={`mailto:${v.email}`}
                    className="flex items-center gap-1 text-muted-foreground hover:underline truncate"
                  >
                    <Mail className="size-3" /> {v.email}
                  </a>
                )}
                {v.website && (
                  <a
                    href={v.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:underline ml-auto"
                  >
                    <ExternalLink className="size-3" /> site
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-xs mt-0.5 truncate">{value}</div>
    </div>
  )
}
