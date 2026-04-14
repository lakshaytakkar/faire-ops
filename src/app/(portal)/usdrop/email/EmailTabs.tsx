"use client"

import { useState } from "react"
import { Mail, Zap, FileText } from "lucide-react"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

type Template = {
  id: string
  name: string | null
  subject: string | null
  type: string | null
  category: string | null
  is_active: boolean | null
  created_at: string | null
}

type Automation = {
  id: string
  name: string | null
  trigger: string | null
  delay: number | null
  delay_unit: string | null
  is_active: boolean | null
  target_audience: string | null
  template_id: string | null
  created_at: string | null
}

type Log = {
  id: string
  recipient_email: string | null
  subject: string | null
  status: string | null
  sent_at: string | null
  template_id: string | null
  created_at: string | null
}

type TabId = "templates" | "automations" | "logs"

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

export function EmailTabs({
  templates,
  automations,
  logs,
}: {
  templates: Template[]
  automations: Automation[]
  logs: Log[]
}) {
  const [tab, setTab] = useState<TabId>("templates")

  const tabs: FilterTab[] = [
    { id: "templates", label: "Templates", count: templates.length },
    { id: "automations", label: "Automations", count: automations.length },
    { id: "logs", label: "Logs", count: logs.length },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "templates" && (
        <DetailCard title="Email templates">
          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Transactional and lifecycle email templates referenced by automations live here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Active</th>
                    <th className="px-4 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{t.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground line-clamp-1">
                        {t.subject ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">{t.category ?? "—"}</td>
                      <td className="px-4 py-2.5">{t.type ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(t.is_active ? "active" : "inactive")}>
                          {t.is_active ? "active" : "inactive"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "automations" && (
        <DetailCard title="Automations">
          {automations.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No automations"
              description="Triggered email flows tied to user events (signup, churn, purchase) appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Trigger</th>
                    <th className="px-4 py-2.5">Delay</th>
                    <th className="px-4 py-2.5">Audience</th>
                    <th className="px-4 py-2.5">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {automations.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{a.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{a.trigger ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.delay !== null ? `${a.delay}${a.delay_unit ?? ""}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.target_audience ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(a.is_active ? "active" : "inactive")}>
                          {a.is_active ? "active" : "inactive"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "logs" && (
        <DetailCard title="Delivery logs">
          {logs.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No delivery logs"
              description="Delivery attempts and their status appear here once email sends start flowing."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Recipient</th>
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{l.recipient_email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground line-clamp-1">
                        {l.subject ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge tone={toneForStatus(l.status)}>{l.status ?? "—"}</StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(l.sent_at ?? l.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}
    </>
  )
}
