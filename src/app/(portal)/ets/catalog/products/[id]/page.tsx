"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Package } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
export default function EtsProductDetail() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [row, setRow] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (cancelled) return
      setRow(data as Record<string, unknown> | null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/ets/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to products
      </Link>

      {loading ? (
        <div className="h-40 w-full animate-pulse rounded bg-muted" />
      ) : !row ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Product not found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-start gap-4">
            {(row.image_url as string | null) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.image_url as string}
                alt=""
                className="size-20 rounded-md object-cover bg-muted"
              />
            ) : (
              <div className="size-20 rounded-md bg-muted flex items-center justify-center">
                <Package className="size-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight">
                {(row.name_en as string | null) ?? (row.name_cn as string | null) ?? "Untitled"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                {(row.product_code as string | null) ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Category: {(row.category as string | null) ?? "—"}
              </p>
            </div>
          </div>

          {/* Full column dump — all 43 columns, 4-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
            {Object.entries(row)
              .filter(([k]) => k !== "image_url")
              .map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {k}
                  </div>
                  <div className="text-sm mt-0.5 break-words">
                    {v === null || v === undefined ? (
                      <span className="text-muted-foreground italic">—</span>
                    ) : typeof v === "object" ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {JSON.stringify(v)}
                      </code>
                    ) : typeof v === "boolean" ? (
                      <span
                        className={`text-xs font-medium ${v ? "text-emerald-700" : "text-slate-500"}`}
                      >
                        {v ? "true" : "false"}
                      </span>
                    ) : (
                      String(v)
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
