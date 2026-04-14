"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Ticket } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export interface TicketRow {
  id: string
  user_id: string | null
  title: string | null
  type: string | null
  priority: string | null
  status: string | null
  assigned_to: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ProfileLite {
  id: string
  full_name: string | null
  email: string | null
}

function ageLabel(created: string | null): string {
  if (!created) return "—"
  const ms = Date.now() - new Date(created).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function formatOpened(d: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export function TicketsClient({
  rows,
  profiles,
}: {
  rows: TicketRow[]
  profiles: ProfileLite[]
}) {
  const pMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("all")
  const [activePriority, setActivePriority] = useState<string>("all")

  const statusTabs: FilterTab[] = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      const k = (r.status ?? "unknown").toLowerCase()
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "open", label: "Open", count: counts.open ?? 0 },
      { id: "pending", label: "Pending", count: counts.pending ?? 0 },
      { id: "in_progress", label: "In progress", count: counts.in_progress ?? 0 },
      { id: "resolved", label: "Resolved", count: counts.resolved ?? 0 },
      { id: "closed", label: "Closed", count: counts.closed ?? 0 },
    ].filter((t) => t.id === "all" || (t.count ?? 0) > 0)
  }, [rows])

  const priorities = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      if (r.priority) set.add(r.priority.toLowerCase())
    })
    return Array.from(set)
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeStatus !== "all" && (r.status ?? "").toLowerCase() !== activeStatus) return false
      if (activePriority !== "all" && (r.priority ?? "").toLowerCase() !== activePriority) return false
      if (search) {
        const needle = search.toLowerCase()
        const user = r.user_id ? pMap.get(r.user_id) : undefined
        const agent = r.assigned_to ? pMap.get(r.assigned_to) : undefined
        const hay = [
          r.title,
          r.type,
          r.status,
          r.priority,
          user?.full_name,
          user?.email,
          agent?.full_name,
          agent?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeStatus, activePriority, search, pMap])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, user, agent…",
        }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
        right={
          priorities.length > 0 && (
            <select
              value={activePriority}
              onChange={(e) => setActivePriority(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs"
            >
              <option value="all">All priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets match"
          description="Try clearing the search or status filter to see more tickets."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Assigned</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Age</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Opened</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const user = t.user_id ? pMap.get(t.user_id) : undefined
                const agent = t.assigned_to ? pMap.get(t.assigned_to) : undefined
                return (
                  <tr
                    key={t.id}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/usdrop/tickets/${t.id}`}
                        className="text-sm font-medium hover:text-primary line-clamp-2"
                      >
                        {t.title ?? "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{user?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{user?.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                      {t.type ?? "general"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(t.priority)}>
                        {t.priority ?? "low"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(t.status)}>{t.status ?? "—"}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {agent?.full_name ?? agent?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {ageLabel(t.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatOpened(t.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
