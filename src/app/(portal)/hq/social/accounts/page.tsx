import {
  AtSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDateTime, formatNumber } from "@/lib/format"

// HQ → Social → Connected Accounts (spec §6.2). Server component — table
// is currently empty (the 6 platforms live in spec, not the DB yet) so
// we render the EmptyState. KPI tiles still compute off whatever rows
// exist once accounts start flowing in.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Connected Accounts — HQ | Suprans",
}

interface AccountRow {
  id: string
  platform: string | null
  handle: string | null
  vertical: string | null
  followers: number | null
  status: string | null
  last_connected_at: string | null
  token_expiry: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function tokenExpiryTone(expiry: string | null): "red" | "amber" | "slate" {
  if (!expiry) return "slate"
  const t = new Date(expiry).getTime()
  if (Number.isNaN(t)) return "slate"
  const now = Date.now()
  if (t < now) return "red"
  if (t - now <= 14 * MS_PER_DAY) return "amber"
  return "slate"
}

async function fetchAccounts(): Promise<AccountRow[]> {
  const { data } = await supabaseHq
    .from("social_accounts")
    .select(
      "id, platform, handle, vertical, followers, status, last_connected_at, token_expiry",
    )
    .order("platform", { ascending: true })
  return (data ?? []) as AccountRow[]
}

export default async function HqConnectedAccountsPage() {
  const accounts = await fetchAccounts()

  const total = accounts.length
  const connected = accounts.filter(
    (a) => (a.status ?? "").toLowerCase() === "connected",
  ).length
  const needsReconnect = accounts.filter((a) => {
    const s = (a.status ?? "").toLowerCase()
    return s === "needs_reconnect" || s === "needs reconnect"
  }).length
  const now = Date.now()
  const expiringSoon = accounts.filter((a) => {
    if (!a.token_expiry) return false
    const t = new Date(a.token_expiry).getTime()
    if (Number.isNaN(t)) return false
    return t >= now && t - now <= 30 * MS_PER_DAY
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Connected Accounts"
        subtitle="Social platform accounts wired into Suprans HQ."
        actions={
          <Button disabled>
            <Plus className="size-3.5" /> Connect Account
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total accounts"
          value={total}
          icon={AtSign}
          iconTone="blue"
        />
        <MetricCard
          label="Connected"
          value={connected}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Needs reconnect"
          value={needsReconnect}
          icon={AlertTriangle}
          iconTone="red"
        />
        <MetricCard
          label="Expiring tokens"
          value={expiringSoon}
          icon={Clock}
          iconTone="amber"
          hint="next 30d"
        />
      </KPIGrid>

      <DetailCard title="All accounts">
        {accounts.length === 0 ? (
          <EmptyState
            icon={AtSign}
            title="No accounts connected"
            description="Use + Connect Account to link an Instagram, YouTube, LinkedIn, Twitter/X, Facebook, or Threads account."
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Handle
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Followers
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Last connected
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Token expiry
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {accounts.map((a) => {
                  const expiryTone = tokenExpiryTone(a.token_expiry)
                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="size-6 rounded-md bg-muted text-muted-foreground inline-flex items-center justify-center">
                            <AtSign className="size-3.5" />
                          </span>
                          <span className="font-medium text-foreground capitalize">
                            {a.platform ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {a.handle ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {a.vertical ? (
                          <StatusBadge tone="slate">{a.vertical}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatNumber(a.followers)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(a.status)}>
                          {(a.status ?? "unknown").replace(/_/g, " ")}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(a.last_connected_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={
                            expiryTone === "red"
                              ? "text-red-700 font-medium"
                              : expiryTone === "amber"
                                ? "text-amber-700 font-medium"
                                : "text-muted-foreground"
                          }
                        >
                          {formatDateTime(a.token_expiry)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button variant="outline" size="xs" disabled>
                            View
                          </Button>
                          <Button variant="outline" size="xs" disabled>
                            Sync
                          </Button>
                          <Button variant="outline" size="xs" disabled>
                            Disconnect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
