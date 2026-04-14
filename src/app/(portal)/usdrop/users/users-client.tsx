"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
  account_type: string | null
  internal_role: string | null
  status: string | null
  subscription_status: string | null
  created_at: string | null
  onboarding_completed: boolean | null
}

function formatDate(d: string | null | undefined) {
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

function formatInitials(name: string | null | undefined) {
  if (!name) return "??"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function UsersClient({ rows }: { rows: ProfileRow[] }) {
  const [search, setSearch] = useState("")
  const [activeTier, setActiveTier] = useState<string>("all")

  const tabs: FilterTab[] = useMemo(() => {
    const pro = rows.filter(
      (r) => r.account_type === "pro" || r.account_type === "enterprise",
    ).length
    const free = rows.filter((r) => !r.account_type || r.account_type === "free").length
    const staff = rows.filter(
      (r) => r.internal_role && r.internal_role !== "none",
    ).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "pro", label: "Pro / Enterprise", count: pro },
      { id: "free", label: "Free", count: free },
      { id: "staff", label: "Staff", count: staff },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTier === "pro" && r.account_type !== "pro" && r.account_type !== "enterprise") {
        return false
      }
      if (activeTier === "free" && r.account_type && r.account_type !== "free") return false
      if (activeTier === "staff" && (!r.internal_role || r.internal_role === "none")) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.full_name, r.email, r.account_type, r.internal_role, r.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeTier, search])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search name, email, role…",
        }}
        tabs={tabs}
        activeTab={activeTier}
        onTabChange={setActiveTier}
      />

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">User</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Plan</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Internal role</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Onboarded</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isPro = p.account_type === "pro" || p.account_type === "enterprise"
              return (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/usdrop/users/${p.id}`}
                      className="flex items-center gap-3 font-medium hover:text-primary"
                    >
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                        {formatInitials(p.full_name ?? p.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{p.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.email ?? "—"}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={isPro ? "violet" : "slate"}>
                      {p.account_type ?? "free"}
                    </StatusBadge>
                    {p.subscription_status && p.subscription_status !== "inactive" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.subscription_status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.internal_role && p.internal_role !== "none" ? (
                      <StatusBadge tone="blue">{p.internal_role}</StatusBadge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(p.status ?? "active")}>
                      {p.status ?? "active"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.onboarding_completed ? "Yes" : "Pending"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
