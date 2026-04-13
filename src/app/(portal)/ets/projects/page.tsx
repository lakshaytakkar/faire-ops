"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, FolderKanban, MessageSquare, FileText } from "lucide-react"
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
  formatInitials,
} from "@/app/(portal)/ets/_components/ets-ui"

interface ProjectRow {
  id: string
  name: string
  city: string | null
  stage: string | null
  manager_name: string | null
  assigned_to: string | null
  estimated_launch_date: string | null
  avatar_url: string | null
}

interface ChecklistAgg {
  client_id: string
  done: number
  total: number
}

interface MessageAgg {
  client_id: string
  unread: number
  total: number
}

interface FileAgg {
  client_id: string
  count: number
}

export default function EtsProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [checklists, setChecklists] = useState<Map<string, { done: number; total: number }>>(
    new Map(),
  )
  const [messages, setMessages] = useState<Map<string, number>>(new Map())
  const [files, setFiles] = useState<Map<string, number>>(new Map())
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: clientRows }, { data: checklistRows }, { data: messageRows }, { data: fileRows }] =
        await Promise.all([
          supabaseEts
            .from("clients")
            .select(
              "id, name, city, stage, manager_name, assigned_to, estimated_launch_date, avatar_url",
            )
            .neq("is_lost", true)
            .order("created_at", { ascending: false }),
          supabaseEts.from("project_checklist_items").select("client_id, status"),
          supabaseEts.from("project_chat_messages").select("client_id"),
          supabaseEts.from("project_files").select("client_id"),
        ])
      if (cancelled) return

      const checklistMap = new Map<string, { done: number; total: number }>()
      ;((checklistRows ?? []) as { client_id: string; status: string }[]).forEach((r) => {
        const e = checklistMap.get(r.client_id) ?? { done: 0, total: 0 }
        e.total += 1
        if (r.status === "done") e.done += 1
        checklistMap.set(r.client_id, e)
      })

      const messageMap = new Map<string, number>()
      ;((messageRows ?? []) as { client_id: string }[]).forEach((r) => {
        messageMap.set(r.client_id, (messageMap.get(r.client_id) ?? 0) + 1)
      })

      const fileMap = new Map<string, number>()
      ;((fileRows ?? []) as { client_id: string }[]).forEach((r) => {
        fileMap.set(r.client_id, (fileMap.get(r.client_id) ?? 0) + 1)
      })

      setRows((clientRows ?? []) as ProjectRow[])
      setChecklists(checklistMap)
      setMessages(messageMap)
      setFiles(fileMap)
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
        const hay = [r.name, r.city, r.manager_name, r.assigned_to]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, stageFilter])

  return (
    <EtsListShell
      title="Projects"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} active project${rows.length === 1 ? "" : "s"}`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client name, city, owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border bg-card text-sm"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-10 px-3 rounded-md border bg-card text-sm"
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={FolderKanban}
          title="No active projects"
          description="Active client projects appear here. Create a client to begin."
          cta={
            <Link
              href="/ets/sales/clients"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Go to clients
            </Link>
          }
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Project</EtsTH>
            <EtsTH>Stage</EtsTH>
            <EtsTH>Owner</EtsTH>
            <EtsTH>Checklist</EtsTH>
            <EtsTH className="text-right">Files</EtsTH>
            <EtsTH className="text-right">Messages</EtsTH>
            <EtsTH>Launch</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((c) => {
                  const cl = checklists.get(c.id) ?? { done: 0, total: 0 }
                  const pct = cl.total > 0 ? Math.round((cl.done / cl.total) * 100) : 0
                  return (
                    <EtsTR key={c.id}>
                      <EtsTD>
                        <Link
                          href={`/ets/projects/${c.id}/checklist`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {formatInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{c.name}</div>
                            {c.city && (
                              <div className="text-xs text-muted-foreground truncate">
                                {c.city}
                              </div>
                            )}
                          </div>
                        </Link>
                      </EtsTD>
                      <EtsTD>
                        <EtsStatusBadge value={c.stage} />
                      </EtsTD>
                      <EtsTD className="text-xs">
                        {c.manager_name ?? c.assigned_to ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </EtsTD>
                      <EtsTD>
                        {cl.total > 0 ? (
                          <div className="space-y-1 min-w-[140px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono">
                                {cl.done}/{cl.total}
                              </span>
                              <span className="text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            not started
                          </span>
                        )}
                      </EtsTD>
                      <EtsTD className="text-right text-xs font-mono">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3 text-muted-foreground" />
                          {files.get(c.id) ?? 0}
                        </span>
                      </EtsTD>
                      <EtsTD className="text-right text-xs font-mono">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3 text-muted-foreground" />
                          {messages.get(c.id) ?? 0}
                        </span>
                      </EtsTD>
                      <EtsTD className="text-xs whitespace-nowrap">
                        {c.estimated_launch_date ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </EtsTD>
                    </EtsTR>
                  )
                })}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
