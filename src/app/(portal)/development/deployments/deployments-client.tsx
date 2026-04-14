"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, GitBranch, Clock } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { LargeModal, DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { ventureMeta } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface DeploymentRow {
  id: string
  vercel_deployment_id: string
  project_id: string | null
  project_slug: string | null
  project_name: string | null
  venture: string | null
  commit_sha: string | null
  commit_message: string | null
  branch: string | null
  author_name: string | null
  author_email: string | null
  status: "queued" | "building" | "ready" | "error" | "canceled"
  deployed_at: string | null
  url: string | null
}

export function DeploymentsClient({
  rows,
  ventures,
}: {
  rows: DeploymentRow[]
  ventures: string[]
}) {
  const [search, setSearch] = useState("")
  const [activeVenture, setActiveVenture] = useState<string>("all")
  const [activeStatus, setActiveStatus] = useState<string>("all")
  const [selected, setSelected] = useState<DeploymentRow | null>(null)

  const statusTabs: FilterTab[] = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "ready", label: "Ready", count: counts.ready ?? 0 },
      { id: "building", label: "Building", count: counts.building ?? 0 },
      { id: "error", label: "Error", count: counts.error ?? 0 },
      { id: "canceled", label: "Canceled", count: counts.canceled ?? 0 },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeVenture !== "all" && r.venture !== activeVenture) return false
      if (activeStatus !== "all" && r.status !== activeStatus) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [
          r.project_name,
          r.project_slug,
          r.commit_message,
          r.commit_sha,
          r.author_name,
          r.branch,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeVenture, activeStatus, search])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search commit, project, author…",
        }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
        right={
          <select
            value={activeVenture}
            onChange={(e) => setActiveVenture(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All ventures</option>
            {ventures.map((v) => (
              <option key={v} value={v}>
                {ventureMeta(v).label}
              </option>
            ))}
          </select>
        }
      />

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Project</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Commit</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Author</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Branch</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">When</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const v = ventureMeta(r.venture)
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "size-7 rounded flex items-center justify-center shrink-0 text-white text-xs font-semibold",
                          v.gradientClass,
                        )}
                      >
                        {v.short}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.project_name ?? r.project_slug ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{v.label}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="text-sm text-foreground truncate">
                      {r.commit_message ?? "—"}
                    </div>
                    {r.commit_sha && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {r.commit_sha.slice(0, 7)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{r.author_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="size-3" />
                      {r.branch ?? "main"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="size-3" />
                      {relativeTime(r.deployed_at)}
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No deployments match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LargeModal title="Deployment detail" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <DetailCard title="Summary">
              <InfoRow label="Project" value={selected.project_name ?? selected.project_slug} />
              <InfoRow label="Status" value={<StatusBadge tone={toneForStatus(selected.status)}>{selected.status}</StatusBadge>} />
              <InfoRow label="Deployed at" value={selected.deployed_at ? new Date(selected.deployed_at).toLocaleString() : "—"} />
              <InfoRow label="Branch" value={selected.branch ?? "main"} />
              <InfoRow label="Author" value={selected.author_name ?? "—"} />
              <InfoRow label="Commit SHA" value={selected.commit_sha ? <span className="font-mono text-xs">{selected.commit_sha}</span> : "—"} />
            </DetailCard>

            <DetailCard title="Commit message">
              <p className="text-sm whitespace-pre-wrap break-words">
                {selected.commit_message ?? "—"}
              </p>
            </DetailCard>

            <DetailCard title="Links">
              <div className="flex flex-wrap items-center gap-2">
                {selected.url && (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open deployment <ExternalLink className="size-3.5" />
                  </a>
                )}
                {selected.project_slug && (
                  <Link
                    href={`/development/projects/${selected.project_slug}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open project →
                  </Link>
                )}
              </div>
              {!selected.url && !selected.project_slug && <span className="text-sm text-muted-foreground">—</span>}
            </DetailCard>
          </div>
        </LargeModal>
      )}
    </>
  )
}
