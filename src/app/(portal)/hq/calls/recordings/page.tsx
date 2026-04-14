"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Mic,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/shared/audio-player"
import { SubNav } from "@/components/shared/sub-nav"
import { CALLS_SUB_NAV } from "../_nav"

interface RecordingRow {
  call_id: string | null
  employee_id: string | null
  employee_code: string | null
  employee_name: string | null
  client_number: string | null
  client_name: string | null
  call_type: string | null
  call_started_at: string | null
  duration_seconds: number | null
  storage_path: string
  filename: string | null
  size_bytes: number | null
  uploaded_at: string | null
  kind: "matched" | "orphan"
  orphan_id: string | null
}

interface CandidateCall {
  id: string
  call_started_at: string | null
  client_number: string | null
  duration_seconds: number | null
  call_type: string | null
}

type Filter = "all" | "matched" | "orphan"

function formatBytes(n: number | null): string {
  if (!n) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return "—"
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r}s`
  return `${m}m ${r}s`
}

function formatDate(s: string | null): string {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function timeAgo(s: string | null): string {
  if (!s) return "—"
  const diffMins = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const h = Math.floor(diffMins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function callTypeIcon(type: string | null) {
  switch (type?.toUpperCase()) {
    case "INCOMING": return <PhoneIncoming className="size-3.5 text-emerald-600" />
    case "OUTGOING": return <PhoneOutgoing className="size-3.5 text-blue-600" />
    case "MISSED":   return <PhoneMissed className="size-3.5 text-red-600" />
    default:         return <Phone className="size-3.5 text-muted-foreground" />
  }
}

export default function RecordingsPage() {
  const [rows, setRows] = useState<RecordingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [linking, setLinking] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Record<string, CandidateCall[]>>({})

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_call_recordings")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .limit(500)
    if (error) {
      console.error("load recordings:", error)
      setRows([])
      return
    }
    setRows((data ?? []) as RecordingRow[])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [load])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.kind !== filter) return false
      if (search) {
        const s = search.toLowerCase()
        const blob = `${r.employee_code ?? ""} ${r.employee_name ?? ""} ${r.client_number ?? ""} ${r.client_name ?? ""} ${r.filename ?? ""}`.toLowerCase()
        if (!blob.includes(s)) return false
      }
      return true
    })
  }, [rows, filter, search])

  const counts = useMemo(() => ({
    all: rows.length,
    matched: rows.filter((r) => r.kind === "matched").length,
    orphan: rows.filter((r) => r.kind === "orphan").length,
  }), [rows])

  const expand = useCallback(async (row: RecordingRow) => {
    const id = row.kind === "matched" ? `m:${row.call_id}` : `o:${row.orphan_id}`
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (!signedUrls[row.storage_path]) {
      const { data } = await supabase.storage
        .from("call-recordings")
        .createSignedUrl(row.storage_path, 60 * 60)
      if (data?.signedUrl) {
        setSignedUrls((cur) => ({ ...cur, [row.storage_path]: data.signedUrl }))
      }
    }
    if (row.kind === "orphan" && row.orphan_id && !candidates[row.orphan_id]) {
      // load candidate calls (same employee, ±15 min around the recording's parsed start)
      const target = row.call_started_at ? new Date(row.call_started_at).getTime() : null
      const qb = supabase
        .from("calls")
        .select("id, call_started_at, client_number, duration_seconds, call_type")
        .eq("employee_id", row.employee_id ?? "")
        .order("call_started_at", { ascending: false })
        .limit(50)
      if (target) {
        qb.gte("call_started_at", new Date(target - 15 * 60_000).toISOString())
        qb.lte("call_started_at", new Date(target + 15 * 60_000).toISOString())
      }
      const { data } = await qb
      setCandidates((cur) => ({ ...cur, [row.orphan_id!]: (data ?? []) as CandidateCall[] }))
    }
  }, [openId, signedUrls, candidates])

  const link = useCallback(async (orphanId: string, callId: string) => {
    setLinking(orphanId)
    const { error } = await supabase.rpc("callsync_link_orphan_to_call", {
      p_orphan_id: orphanId,
      p_call_id: callId,
    })
    setLinking(null)
    if (error) {
      alert(`Link failed: ${error.message}`)
      return
    }
    await load()
  }, [load])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={CALLS_SUB_NAV} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Call recordings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All recordings uploaded by CallSync devices. Orphans (no matching call yet) appear here too — link them manually or wait for the call log to sync and they'll auto-link.
          </p>
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          {(["all", "matched", "orphan"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded ${
                filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "matched" ? "Matched" : "Orphan"}
              <span className="ml-1.5 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee, number, filename"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-card"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Call</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Filename</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-muted" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No recordings yet.</td></tr>
              ) : (
                filtered.map((r) => {
                  const id = r.kind === "matched" ? `m:${r.call_id}` : `o:${r.orphan_id}`
                  const isOpen = openId === id
                  const url = signedUrls[r.storage_path]
                  return (
                    <>
                      <tr
                        key={id}
                        onClick={() => expand(r)}
                        className="border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Mic className={`size-4 ${r.kind === "matched" ? "text-emerald-600" : "text-amber-600"}`} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{r.employee_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.employee_code ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {callTypeIcon(r.call_type)}
                            <span className="font-mono text-xs">{r.client_number ?? "—"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(r.call_started_at)} · {formatDuration(r.duration_seconds)}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[280px] truncate text-xs font-mono text-muted-foreground">
                          {r.filename ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">{formatBytes(r.size_bytes)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {timeAgo(r.uploaded_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.kind === "matched" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="size-3" /> Linked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <AlertCircle className="size-3" /> Orphan
                            </span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${id}:expanded`} className="border-b border-border/60 bg-muted/20">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="space-y-3">
                              {url ? (
                                <AudioPlayer src={url} filename={r.filename ?? "recording.m4a"} />
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="size-3 animate-spin" /> Loading audio…
                                </div>
                              )}
                              {r.kind === "matched" && r.call_id && (
                                <div className="text-xs text-muted-foreground">
                                  <Link href={`/hq/calls/calls/${r.call_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                                    Open call detail <Link2 className="size-3" />
                                  </Link>
                                </div>
                              )}
                              {r.kind === "orphan" && r.orphan_id && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Link to a call (candidates for {r.employee_code} within ±15 min):
                                  </div>
                                  <div className="space-y-1">
                                    {(candidates[r.orphan_id] ?? []).length === 0 ? (
                                      <div className="text-xs text-muted-foreground">No candidate calls in range.</div>
                                    ) : (
                                      (candidates[r.orphan_id] ?? []).map((c) => (
                                        <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5 rounded bg-card border border-border">
                                          <div className="flex items-center gap-2 text-xs">
                                            {callTypeIcon(c.call_type)}
                                            <span className="font-mono">{c.client_number ?? "—"}</span>
                                            <span className="text-muted-foreground">{formatDate(c.call_started_at)}</span>
                                            <span className="text-muted-foreground">· {formatDuration(c.duration_seconds)}</span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={linking === r.orphan_id}
                                            onClick={() => link(r.orphan_id!, c.id)}
                                          >
                                            {linking === r.orphan_id ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3" />}
                                            Link
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
