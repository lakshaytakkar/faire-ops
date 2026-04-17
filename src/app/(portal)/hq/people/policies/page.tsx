import { FileText, ShieldCheck, Calendar, User } from "lucide-react"
import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "HR Policies — HQ | Suprans" }

export default async function HqHRPoliciesPage() {
  const { data } = await supabaseHq
    .from("policies")
    .select("id, name, version, effective_date, approved_by, file_url, created_at")
    .order("effective_date", { ascending: false, nullsFirst: false })

  const policies = data ?? []
  const now = new Date()
  const thisYear = now.getFullYear()
  const updatedThisYear = policies.filter((p) => p.effective_date && new Date(p.effective_date).getFullYear() === thisYear).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="HR policies"
        subtitle="Company-wide HR policy documents with owners and effective dates."
        actions={<Button size="sm" disabled>+ Add policy</Button>}
      />

      <KPIGrid>
        <MetricCard label="Total policies" value={policies.length} icon={FileText} iconTone="blue" />
        <MetricCard label="Updated this year" value={updatedThisYear} icon={Calendar} iconTone="emerald" />
        <MetricCard label="Owners" value={new Set(policies.map((p) => p.approved_by).filter(Boolean)).size} icon={User} iconTone="violet" />
        <MetricCard label="Compliance-critical" value={policies.filter((p) => /posh|data|harass|compliance/i.test(p.name ?? "")).length} icon={ShieldCheck} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`All policies (${policies.length})`}>
        {policies.length === 0 ? (
          <EmptyState icon={FileText} title="No policies yet" description="Publish your first HR policy." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Policy</th>
                  <th className="text-left px-3 py-2">Version</th>
                  <th className="text-left px-3 py-2">Effective</th>
                  <th className="text-left px-3 py-2">Approved by</th>
                  <th className="text-right px-3 py-2">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{p.name ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{p.version ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(p.effective_date)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.approved_by ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {p.file_url ? (
                        <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open</a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
