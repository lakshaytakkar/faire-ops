"use client"

import { useEffect, useState } from "react"
import { supabaseEts } from "@/lib/supabase"
interface CategoryRow {
  id: string
  name: string
  parent_id: string | null
  level: number
  customs_duty_percent: number | null
  igst_percent: number | null
  hs_code: string | null
  compliance_default: string | null
}

export default function EtsCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("categories")
        .select("id, name, parent_id, level, customs_duty_percent, igst_percent, hs_code, compliance_default")
        .order("level", { ascending: true })
        .order("name", { ascending: true })
      if (cancelled) return
      setRows((data ?? []) as CategoryRow[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const nameById = new Map(rows.map((r) => [r.id, r.name]))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} category nodes`}
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <Th>Name</Th>
                <Th>Parent</Th>
                <Th>Level</Th>
                <Th className="text-right">Customs %</Th>
                <Th className="text-right">IGST %</Th>
                <Th>HS Code</Th>
                <Th>Compliance</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {c.parent_id ? nameById.get(c.parent_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{c.level}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {c.customs_duty_percent ?? 0}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {c.igst_percent ?? 0}%
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {c.hs_code ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            c.compliance_default === "safe"
                              ? "bg-emerald-50 text-emerald-700"
                              : c.compliance_default === "restricted"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.compliance_default ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
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
