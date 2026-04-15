"use client"

import { useState } from "react"
import { FileText, Landmark, StickyNote, Users, Inbox } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Entity detail tabs. Mirrors the FilterBar-as-tabs
// pattern used by the employee detail page. See suprans-hq-full-spec.md §8.2.

export interface EntityDetail {
  id: string
  name: string | null
  country: string | null
  type: string | null
  reg_no: string | null
  currency: string | null
  incorporated_at: string | null
  is_active: boolean | null
}

export interface EntityFilingRow {
  id: string
  filing_type: string | null
  period: string | null
  due_date: string | null
  filed_date: string | null
  status: string | null
}

export function EntityDetailTabs({
  entity,
  filings,
}: {
  entity: EntityDetail
  filings: EntityFilingRow[]
}) {
  const [tab, setTab] = useState<string>("overview")

  const tabs: FilterTab[] = [
    { id: "overview", label: "Overview" },
    { id: "directors", label: "Directors / Shareholders" },
    { id: "bank", label: "Bank Accounts" },
    { id: "filings", label: "Filings", count: filings.length },
    { id: "documents", label: "Documents" },
    { id: "notes", label: "Notes" },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Registration">
            <InfoRow label="Country" value={entity.country ?? "—"} />
            <InfoRow label="Type" value={entity.type ?? "—"} />
            <InfoRow label="Reg No" value={entity.reg_no ?? "—"} />
            <InfoRow label="Incorporated" value={formatDate(entity.incorporated_at)} />
          </DetailCard>
          <DetailCard title="Finance & Address">
            <InfoRow label="Currency" value={entity.currency ?? "—"} />
            <InfoRow label="Registered address" value="—" />
            <InfoRow
              label="Status"
              value={
                <StatusBadge
                  tone={toneForStatus(entity.is_active === false ? "inactive" : "active")}
                >
                  {entity.is_active === false ? "inactive" : "active"}
                </StatusBadge>
              }
            />
          </DetailCard>
        </div>
      )}

      {tab === "directors" && (
        <DetailCard title="Directors / Shareholders">
          <EmptyState
            icon={Users}
            title="No directors or shareholders on file"
            description="Add director details, DIN/SSN and share percentages here."
          />
        </DetailCard>
      )}

      {tab === "bank" && (
        <DetailCard title="Bank Accounts">
          <EmptyState
            icon={Landmark}
            title="No bank accounts on file"
            description="Linked bank accounts and signatories will appear here."
          />
        </DetailCard>
      )}

      {tab === "filings" && (
        <DetailCard title="Filings">
          {filings.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No filings for this entity"
              description="Filings for this entity will be listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Filing Type</th>
                    <th className="px-2 py-2 font-medium">Period</th>
                    <th className="px-2 py-2 font-medium">Due</th>
                    <th className="px-2 py-2 font-medium">Filed</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filings.map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{f.filing_type ?? "—"}</td>
                      <td className="px-2 py-2">{f.period ?? "—"}</td>
                      <td className="px-2 py-2">{formatDate(f.due_date)}</td>
                      <td className="px-2 py-2">{formatDate(f.filed_date)}</td>
                      <td className="px-2 py-2">
                        {f.status ? (
                          <StatusBadge tone={toneForStatus(f.status)}>{f.status}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "documents" && (
        <DetailCard title="Documents">
          <EmptyState
            icon={FileText}
            title="No documents uploaded yet"
            description="MOA, AOA, Certificate of Incorporation and other docs will live here."
          />
        </DetailCard>
      )}

      {tab === "notes" && (
        <DetailCard title="Internal notes">
          <EmptyState
            icon={StickyNote}
            title="No notes yet"
            description="Capture internal context about this entity here."
          />
        </DetailCard>
      )}

    </>
  )
}
