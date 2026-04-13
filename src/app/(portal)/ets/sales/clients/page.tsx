"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, Phone, Mail, MapPin } from "lucide-react"
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

interface ClientRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  stage: string | null
  package_tier: string | null
  selected_package: string | null
  total_paid: number | null
  pending_dues: number | null
  qualification_score: number | null
  total_score: number | null
  assigned_to: string | null
  manager_name: string | null
  launch_phase: string | null
  estimated_launch_date: string | null
  is_lost: boolean | null
}

const STAGE_COLORS: Record<string, string> = {
  "new-lead": "bg-slate-100 text-slate-700",
  "qualified": "bg-blue-50 text-blue-700",
  "proposal-sent": "bg-indigo-50 text-indigo-700",
  "negotiation": "bg-amber-50 text-amber-700",
  "onboarded": "bg-emerald-50 text-emerald-700",
  "launched": "bg-emerald-100 text-emerald-800",
  "lost": "bg-rose-50 text-rose-700",
}

export default function EtsClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([])
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("clients")
        .select("id, name, email, phone, city, state, stage, package_tier, selected_package, total_paid, pending_dues, qualification_score, total_score, assigned_to, manager_name, launch_phase, estimated_launch_date, is_lost")
        .order("created_at", { ascending: false })
      if (cancelled) return
      setRows((data ?? []) as ClientRow[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stages = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.stage && set.add(r.stage))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const hay = [r.name, r.email, r.phone, r.city, r.manager_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, stageFilter])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : `${filtered.length} of ${rows.length} client${rows.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, phone, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
        >
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>City</Th>
                <Th>Stage</Th>
                <Th>Manager</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Score</Th>
                <Th>Launch</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No clients match.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border/60 last:border-0 hover:bg-muted/30 ${c.is_lost ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-2">
                      <div className="font-semibold text-sm">{c.name}</div>
                      {c.package_tier && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {c.package_tier}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-xs flex items-center gap-1 hover:underline"
                          >
                            <Phone className="size-3" /> {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-xs flex items-center gap-1 text-muted-foreground hover:underline truncate"
                          >
                            <Mail className="size-3" /> {c.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {(c.city || c.state) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {[c.city, c.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${STAGE_COLORS[c.stage ?? ""] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {c.stage ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">{c.manager_name ?? c.assigned_to ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {c.total_paid ? `₹${Number(c.total_paid).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-xs">
                      {c.total_score ?? c.qualification_score ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {c.launch_phase && (
                        <div className="font-medium">{c.launch_phase}</div>
                      )}
                      {c.estimated_launch_date && (
                        <div className="text-muted-foreground">
                          {new Date(c.estimated_launch_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
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
