"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, ShieldCheck } from "lucide-react"
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
} from "@/app/(portal)/ets/_components/ets-ui"

interface VendorKyc {
  id: string
  name: string
  type: string | null
  kyc_status: string | null
  gst_number: string | null
  pan_number: string | null
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

export default function EtsVendorsKycPage() {
  const [rows, setRows] = useState<VendorKyc[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("vendors")
        .select(
          "id, name, type, kyc_status, gst_number, pan_number, bank_name, bank_account, bank_ifsc, contact_name, phone, email, is_active",
        )
        .order("is_active", { ascending: false })
        .order("kyc_status", { ascending: true })
        .order("name", { ascending: true })
      if (cancelled) return
      setRows((data ?? []) as VendorKyc[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && (r.kyc_status ?? "none") !== statusFilter)
        return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const hay = [
          r.name,
          r.gst_number,
          r.pan_number,
          r.bank_account,
          r.contact_name,
          r.phone,
          r.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter])

  const counts = useMemo(() => {
    const c = { verified: 0, pending: 0, rejected: 0, none: 0 }
    rows.forEach((r) => {
      const key = (r.kyc_status ?? "none") as keyof typeof c
      if (key in c) c[key] += 1
      else c.none += 1
    })
    return c
  }, [rows])

  return (
    <EtsListShell
      title="Vendor KYC"
      subtitle={
        loading
          ? "Loading…"
          : `${counts.verified} verified · ${counts.pending} pending · ${counts.rejected} rejected · ${counts.none} unsubmitted`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, GST, PAN, account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="none">Unsubmitted</option>
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={ShieldCheck}
          title="No vendors match"
          description="Adjust the filters or add vendors to submit KYC."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Vendor</EtsTH>
            <EtsTH>Type</EtsTH>
            <EtsTH>KYC</EtsTH>
            <EtsTH>PAN</EtsTH>
            <EtsTH>GST</EtsTH>
            <EtsTH>Bank</EtsTH>
            <EtsTH>Account</EtsTH>
            <EtsTH>Contact</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((v) => (
                  <EtsTR key={v.id}>
                    <EtsTD>
                      <Link
                        href={`/ets/vendors/${v.id}`}
                        className="text-sm font-semibold hover:text-emerald-700"
                      >
                        {v.name}
                      </Link>
                    </EtsTD>
                    <EtsTD className="text-xs capitalize">{v.type ?? "—"}</EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={v.kyc_status ?? "unsubmitted"} />
                    </EtsTD>
                    <EtsTD className="text-xs font-mono">
                      {v.pan_number ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-xs font-mono">
                      {v.gst_number ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {v.bank_name ?? "—"}
                      {v.bank_ifsc && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {v.bank_ifsc}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs font-mono">
                      {v.bank_account
                        ? `•••• ${v.bank_account.slice(-4)}`
                        : "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {v.contact_name ?? "—"}
                      {v.phone && (
                        <div className="text-[10px] text-muted-foreground">
                          {v.phone}
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
