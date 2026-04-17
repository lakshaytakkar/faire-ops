"use client"

import { useMemo, useState } from "react"
import { Activity, Ticket, Store as StoreIcon, GraduationCap, BookOpen, ShoppingBag } from "lucide-react"
import { DetailCard, InfoRow, LargeModal } from "@/components/shared/detail-views"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { ChannelEmbed } from "@/components/chat/channel-embed"

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

export interface EnrollmentItem {
  id: string
  course_id: string | null
  status: string | null
  enrolled_at: string | null
  completed_at: string | null
  progress: number | null
}

export interface ModuleCompletionItem {
  id: string
  module_id: string | null
  course_id: string | null
  completed_at: string | null
  score: number | null
}

export interface PicklistItem {
  id: string
  product_id: string | null
  product_title: string | null
  product_image_url: string | null
  added_at: string | null
  notes: string | null
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

function activityTone(type: string | null): StatusTone {
  if (!type) return "slate"
  if (type.includes("suspend") || type.includes("delete")) return "red"
  if (type.includes("promote")) return "violet"
  if (type.includes("credit")) return "emerald"
  if (type.includes("role")) return "blue"
  if (type.includes("reactivate")) return "emerald"
  return "slate"
}

function activityLabel(type: string | null): string {
  if (!type) return "Unknown"
  const labels: Record<string, string> = {
    admin_suspend: "Suspended",
    admin_reactivate: "Reactivated",
    admin_promote: "Promoted",
    admin_demote: "Demoted",
    admin_credit_grant: "Credits Granted",
    admin_role_change: "Role Changed",
    admin_delete: "Deleted",
    admin_password_reset: "Password Reset",
    admin_onboarding_force: "Onboarding Forced",
    admin_create: "Created by Admin",
  }
  return labels[type] ?? type.replace(/_/g, " ")
}

function formatAdminData(data: Record<string, unknown>): string {
  const parts: string[] = []
  if (data.reason) parts.push(`Reason: ${data.reason}`)
  if (data.amount) parts.push(`Amount: ${data.amount}`)
  if (data.to_plan) parts.push(`Plan: ${data.to_plan}`)
  if (data.role) parts.push(`Role: ${data.role}`)
  if (data.new_total !== undefined) parts.push(`New total: ${data.new_total}`)
  return parts.length > 0 ? parts.join(" · ") : "Admin action"
}

function EmailWidget({ recipientEmail, templates }: {
  recipientEmail: string | null
  templates: Array<{ id: string; name: string | null; subject: string | null }>
}) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!recipientEmail || !subject) return
    setSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject_override: subject,
          html_override: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
        }),
      })
      if (res.ok) {
        setSent(true)
        setSubject("")
        setBody("")
        setTimeout(() => setSent(false), 3000)
      }
    } finally {
      setSending(false)
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find(t => t.id === id)
    if (t) {
      setSubject(t.subject ?? "")
      setTemplateId(id)
    }
  }

  return (
    <div className="space-y-3">
      {templates.length > 0 && (
        <select
          value={templateId}
          onChange={(e) => applyTemplate(e.target.value)}
          className="w-full h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Use template…</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name ?? t.subject ?? "Untitled"}</option>
          ))}
        </select>
      )}
      <div className="text-sm text-muted-foreground">
        To: <span className="font-medium text-foreground">{recipientEmail ?? "No email"}</span>
      </div>
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full h-8 rounded-md border bg-background px-3 text-sm"
      />
      <textarea
        placeholder="Message body…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between">
        <a
          href="/usdrop/email"
          className="text-sm text-primary hover:underline"
        >
          Manage templates
        </a>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !recipientEmail || !subject}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {sending ? "Sending…" : sent ? "Sent!" : "Send Email"}
        </button>
      </div>
    </div>
  )
}

type TabId = "overview" | "stores" | "tickets" | "activity" | "courses" | "picklist"

export function UserDetailTabs({
  profile,
  planName,
  joinedLabel,
  stores,
  tickets,
  activity,
  emailTemplates,
  planChanges,
  enrollments,
  moduleCompletions,
  picklist,
}: {
  profile: ProfileSlim
  planName: string | null
  joinedLabel: string
  stores: StoreItem[]
  tickets: TicketItem[]
  activity: ActivityItem[]
  emailTemplates: Array<{ id: string; name: string | null; subject: string | null; type: string | null; category: string | null }>
  planChanges: Array<{
    id: string
    from_plan: string | null
    to_plan: string | null
    narration: string | null
    proof_url: string | null
    performed_by: string | null
    created_at: string | null
  }>
  enrollments: EnrollmentItem[]
  moduleCompletions: ModuleCompletionItem[]
  picklist: PicklistItem[]
}) {
  const [tab, setTab] = useState<TabId>("overview")
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)

  const tabs: FilterTab[] = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "stores", label: "Shopify stores", count: stores.length },
      { id: "courses", label: "Courses", count: enrollments.length },
      { id: "picklist", label: "Saved products", count: picklist.length },
      { id: "tickets", label: "Tickets", count: tickets.length },
      { id: "activity", label: "Activity", count: activity.length },
    ],
    [stores.length, tickets.length, activity.length, enrollments.length, picklist.length],
  )

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">
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
        <>
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

        {planChanges.length > 0 && (
          <DetailCard title={`Plan History (${planChanges.length})`}>
            <ul className="divide-y">
              {planChanges.map((pc) => (
                <li key={pc.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {pc.from_plan ?? "—"} → {pc.to_plan}
                    </div>
                    {pc.narration && (
                      <div className="text-sm text-muted-foreground mt-0.5">{pc.narration}</div>
                    )}
                    {pc.proof_url && (
                      <a href={pc.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-0.5 block">
                        View payment proof
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground tabular-nums shrink-0">
                    {formatDate(pc.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          </DetailCard>
        )}
        </>
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
                      <StatusBadge tone={activityTone(a.activity_type)}>{activityLabel(a.activity_type)}</StatusBadge>
                    </td>
                    <td className="px-2 py-3 text-sm text-muted-foreground truncate max-w-md">
                      {a.activity_type?.startsWith("admin_") && a.activity_data
                        ? formatAdminData(a.activity_data as Record<string, unknown>)
                        : a.activity_data ? JSON.stringify(a.activity_data).slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DetailCard>
      )}

      {tab === "courses" && (
        <>
          <DetailCard title={`Enrolled courses (${enrollments.length})`}>
            {enrollments.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No course enrollments"
                description="This user hasn't enrolled in any courses yet."
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Course ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Progress</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Enrolled</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                      <td className="px-2 py-3 text-sm font-medium">
                        <span className="font-mono text-xs">{e.course_id?.slice(0, 8) ?? "—"}...</span>
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge tone={toneForStatus(e.status)}>{e.status ?? "—"}</StatusBadge>
                      </td>
                      <td className="px-2 py-3 text-sm tabular-nums">{e.progress ?? 0}%</td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{formatDate(e.enrolled_at)}</td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{formatDate(e.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DetailCard>

          <DetailCard title={`Module completions (${moduleCompletions.length})`}>
            {moduleCompletions.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No module completions"
                description="This user hasn't completed any course modules yet."
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Module ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Course ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2.5">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleCompletions.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                      <td className="px-2 py-3 text-sm">
                        <span className="font-mono text-xs">{m.module_id?.slice(0, 8) ?? "—"}...</span>
                      </td>
                      <td className="px-2 py-3 text-sm">
                        <span className="font-mono text-xs">{m.course_id?.slice(0, 8) ?? "—"}...</span>
                      </td>
                      <td className="px-2 py-3 text-sm tabular-nums">{m.score != null ? m.score : "—"}</td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{formatDate(m.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DetailCard>
        </>
      )}

      {tab === "picklist" && (
        <DetailCard title={`Saved products (${picklist.length})`}>
          {picklist.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No saved products"
              description="This user hasn't saved any products to their picklist yet."
            />
          ) : (
            <ul className="divide-y">
              {picklist.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  {p.product_image_url ? (
                    <img
                      src={p.product_image_url}
                      alt={p.product_title ?? "Product"}
                      className="size-10 rounded-md object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="size-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.product_title ?? "Untitled product"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.product_id ? <span className="font-mono">{p.product_id}</span> : null}
                      {p.product_id && p.added_at ? " · " : null}
                      {p.added_at ? `Added ${formatDate(p.added_at)}` : null}
                    </div>
                    {p.notes && <div className="text-sm text-muted-foreground mt-0.5">{p.notes}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      )}
        </div>

        {/* Right — communication */}
        <div className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <DetailCard title="Chat">
            <ChannelEmbed
              projectId={profile.id}
              channelKind="user-support"
              senderName="Support"
              height="350px"
              emptyHint="Start a conversation with this user"
            />
          </DetailCard>
          <DetailCard title="Send Email">
            <EmailWidget recipientEmail={profile.email} templates={emailTemplates} />
          </DetailCard>
        </div>
      </div>

      {/* Modals stay outside the grid */}
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
                  value={<StatusBadge tone={activityTone(selectedActivity.activity_type)}>{activityLabel(selectedActivity.activity_type)}</StatusBadge>}
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
