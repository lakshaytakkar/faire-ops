"use client"

import { useMemo, useState } from "react"
import { Activity, Ticket, Store as StoreIcon } from "lucide-react"
import { DetailCard, InfoRow, LargeModal } from "@/components/shared/detail-views"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"

export interface StoreItem {
  id: string
  shop_domain: string | null
  store_name: string | null
  plan: string | null
  is_active: boolean | null
  last_synced_at: string | null
  currency: string | null
}

export interface TicketItem {
  id: string
  title: string | null
  type: string | null
  priority: string | null
  status: string | null
  created_at: string | null
}

export interface ActivityItem {
  id: string
  activity_type: string | null
  activity_data: unknown
  created_at: string | null
}

interface ProfileSlim {
  id: string
  email: string | null
  full_name: string | null
  username: string | null
  account_type: string | null
  internal_role: string | null
  status: string | null
  subscription_status: string | null
  subscription_started_at: string | null
  subscription_ends_at: string | null
  created_at: string | null
  is_trial: boolean | null
  trial_ends_at: string | null
  credits: number | null
  phone_number: string | null
  ecommerce_experience: string | null
  preferred_niche: string | null
  onboarding_completed: boolean | null
  onboarding_completed_at: string | null
  onboarding_progress: number | null
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

type TabId = "overview" | "stores" | "tickets" | "activity"

export function UserDetailTabs({
  profile,
  planName,
  joinedLabel,
  stores,
  tickets,
  activity,
}: {
  profile: ProfileSlim
  planName: string | null
  joinedLabel: string
  stores: StoreItem[]
  tickets: TicketItem[]
  activity: ActivityItem[]
}) {
  const [tab, setTab] = useState<TabId>("overview")
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  const tabs: FilterTab[] = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "stores", label: "Shopify stores", count: stores.length },
      { id: "tickets", label: "Tickets", count: tickets.length },
      { id: "activity", label: "Activity", count: activity.length },
    ],
    [stores.length, tickets.length, activity.length],
  )

  return (
    <>
      <KPIGrid>
        <MetricCard
          label="Plan"
          value={planName ?? profile.subscription_status ?? "—"}
          hint={profile.is_trial ? "on trial" : undefined}
        />
        <MetricCard label="Credits" value={profile.credits ?? 0} />
        <MetricCard
          label="Onboarded"
          value={profile.onboarding_completed ? "Yes" : "No"}
          hint={`${profile.onboarding_progress ?? 0}%`}
        />
        <MetricCard label="Joined" value={joinedLabel} />
      </KPIGrid>

      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DetailCard title="Profile">
            <div className="divide-y">
              <InfoRow label="Full name" value={profile.full_name ?? "—"} />
              <InfoRow label="Email" value={profile.email ?? "—"} />
              <InfoRow label="Username" value={profile.username ?? "—"} />
              <InfoRow label="Phone" value={profile.phone_number ?? "—"} />
              <InfoRow
                label="Status"
                value={
                  <StatusBadge tone={toneForStatus(profile.status ?? "active")}>
                    {profile.status ?? "active"}
                  </StatusBadge>
                }
              />
              <InfoRow
                label="Internal role"
                value={
                  profile.internal_role && profile.internal_role !== "none" ? (
                    <StatusBadge tone="blue">{profile.internal_role}</StatusBadge>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </DetailCard>

          <DetailCard title="Subscription">
            <div className="divide-y">
              <InfoRow label="Plan" value={planName ?? profile.account_type ?? "free"} />
              <InfoRow
                label="Subscription status"
                value={
                  profile.subscription_status ? (
                    <StatusBadge tone={toneForStatus(profile.subscription_status)}>
                      {profile.subscription_status}
                    </StatusBadge>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Started" value={formatDate(profile.subscription_started_at)} />
              <InfoRow label="Renews / ends" value={formatDate(profile.subscription_ends_at)} />
              <InfoRow label="Trial" value={profile.is_trial ? "Yes" : "No"} />
              <InfoRow label="Trial ends" value={formatDate(profile.trial_ends_at)} />
            </div>
          </DetailCard>

          <DetailCard title="Onboarding">
            <div className="divide-y">
              <InfoRow
                label="Completed"
                value={profile.onboarding_completed ? "Yes" : "No"}
              />
              <InfoRow label="Progress" value={`${profile.onboarding_progress ?? 0}%`} />
              <InfoRow
                label="Completed at"
                value={formatDate(profile.onboarding_completed_at)}
              />
              <InfoRow
                label="E-commerce experience"
                value={profile.ecommerce_experience ?? "—"}
              />
              <InfoRow label="Preferred niche" value={profile.preferred_niche ?? "—"} />
            </div>
          </DetailCard>

          <DetailCard title="Account">
            <div className="divide-y">
              <InfoRow label="User ID" value={<span className="font-mono text-xs">{profile.id}</span>} />
              <InfoRow label="Credits" value={profile.credits ?? 0} />
              <InfoRow label="Joined" value={joinedLabel} />
            </div>
          </DetailCard>
        </div>
      )}

      {tab === "stores" && (
        <DetailCard title={`Shopify stores (${stores.length})`}>
          {stores.length === 0 ? (
            <EmptyState
              icon={StoreIcon}
              title="No stores connected"
              description="This user hasn't connected a Shopify store yet."
            />
          ) : (
            <ul className="divide-y">
              {stores.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStore(s)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/40 transition-colors px-2 -mx-2 rounded-md cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {s.store_name ?? s.shop_domain ?? "Untitled store"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.shop_domain ?? "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.plan && <StatusBadge tone="slate">{s.plan}</StatusBadge>}
                      <StatusBadge tone={s.is_active ? "emerald" : "slate"}>
                        {s.is_active ? "active" : "inactive"}
                      </StatusBadge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      )}

      {tab === "tickets" && (
        <DetailCard title={`Support tickets (${tickets.length})`}>
          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets"
              description="This user has not filed a support ticket."
            />
          ) : (
            <ul className="divide-y">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(t)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/40 transition-colors px-2 -mx-2 rounded-md cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title ?? "Untitled"}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)} · {t.type ?? "general"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.priority && <StatusBadge tone="slate">{t.priority}</StatusBadge>}
                      <StatusBadge tone={toneForStatus(t.status)}>{t.status ?? "—"}</StatusBadge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      )}

      {tab === "activity" && (
        <DetailCard title={`Recent activity (${activity.length})`}>
          {activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No tracked activity"
              description="This user hasn't triggered any app events we log yet."
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">
                    When
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedActivity(a)}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-2 py-3 text-sm text-muted-foreground">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge tone="slate">{a.activity_type ?? "—"}</StatusBadge>
                    </td>
                    <td className="px-2 py-3 text-sm text-muted-foreground truncate max-w-md">
                      {a.activity_data ? JSON.stringify(a.activity_data).slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DetailCard>
      )}

      {selectedStore && (
        <LargeModal title="Shopify store" onClose={() => setSelectedStore(null)}>
          <DetailCard title="Details">
            <div className="divide-y">
              <InfoRow label="Store name" value={selectedStore.store_name ?? "—"} />
              <InfoRow label="Domain" value={selectedStore.shop_domain ?? "—"} />
              <InfoRow label="Plan" value={selectedStore.plan ?? "—"} />
              <InfoRow
                label="Active"
                value={
                  <StatusBadge tone={selectedStore.is_active ? "emerald" : "slate"}>
                    {selectedStore.is_active ? "active" : "inactive"}
                  </StatusBadge>
                }
              />
              <InfoRow label="Currency" value={selectedStore.currency ?? "—"} />
              <InfoRow label="Last synced" value={formatDate(selectedStore.last_synced_at)} />
            </div>
          </DetailCard>
        </LargeModal>
      )}

      {selectedTicket && (
        <LargeModal title="Support ticket" onClose={() => setSelectedTicket(null)}>
          <DetailCard title="Details">
            <div className="divide-y">
              <InfoRow label="Title" value={selectedTicket.title ?? "—"} />
              <InfoRow label="Type" value={selectedTicket.type ?? "general"} />
              <InfoRow label="Priority" value={selectedTicket.priority ?? "—"} />
              <InfoRow
                label="Status"
                value={
                  <StatusBadge tone={toneForStatus(selectedTicket.status)}>
                    {selectedTicket.status ?? "—"}
                  </StatusBadge>
                }
              />
              <InfoRow label="Opened" value={formatDate(selectedTicket.created_at)} />
              <InfoRow
                label="Ticket ID"
                value={<span className="font-mono text-xs">{selectedTicket.id}</span>}
              />
            </div>
          </DetailCard>
        </LargeModal>
      )}

      {selectedActivity && (
        <LargeModal title="Activity event" onClose={() => setSelectedActivity(null)}>
          <div className="space-y-4">
            <DetailCard title="Summary">
              <div className="divide-y">
                <InfoRow
                  label="Type"
                  value={<StatusBadge tone="slate">{selectedActivity.activity_type ?? "—"}</StatusBadge>}
                />
                <InfoRow label="When" value={formatDate(selectedActivity.created_at)} />
                <InfoRow
                  label="Event ID"
                  value={<span className="font-mono text-xs">{selectedActivity.id}</span>}
                />
              </div>
            </DetailCard>
            <DetailCard title="Payload">
              <pre className="text-xs font-mono bg-muted/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
                {selectedActivity.activity_data
                  ? JSON.stringify(selectedActivity.activity_data, null, 2)
                  : "—"}
              </pre>
            </DetailCard>
          </div>
        </LargeModal>
      )}
    </>
  )
}
