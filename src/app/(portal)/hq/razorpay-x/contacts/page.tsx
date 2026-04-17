import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatEpochDateTime } from "../_lib"
import { Users, UserCheck, Building2, Wallet, Landmark } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
  const [{ data: contacts }, { data: fundAccounts }] = await Promise.all([
    supabaseHq.from("razorpay_contacts").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseHq.from("razorpay_fund_accounts").select("*").order("created_at", { ascending: false }).limit(200),
  ])

  const rows = contacts ?? []
  const employees = rows.filter((c) => c.type === "employee")
  const vendors = rows.filter((c) => c.type === "vendor")
  const active = rows.filter((c) => c.active)
  const fas = fundAccounts ?? []

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Contacts & Fund Accounts" subtitle="Razorpay X contacts — recipients for payouts. Each contact can have multiple fund accounts (bank or UPI)." />

      <KPIGrid>
        <MetricCard label="Total Contacts" value={String(rows.length)} icon={Users} iconTone="blue" />
        <MetricCard label="Employees" value={String(employees.length)} icon={UserCheck} iconTone="emerald" />
        <MetricCard label="Vendors" value={String(vendors.length)} icon={Building2} iconTone="violet" />
        <MetricCard label="Fund Accounts" value={String(fas.length)} icon={Landmark} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Contacts (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No contacts" description="Razorpay X contacts will appear here after syncing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Contact ID</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">Phone</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Active</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{c.id}</td>
                    <td className="py-2.5 pr-3 font-medium">{c.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.contact ?? "—"}</td>
                    <td className="py-2.5 pr-3 capitalize"><StatusBadge tone={toneForStatus(c.type === "employee" ? "active" : c.type === "vendor" ? "in-review" : "planning")}>{c.type ?? "—"}</StatusBadge></td>
                    <td className="py-2.5 pr-3">{c.active ? "Yes" : "No"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      {fas.length > 0 && (
        <DetailCard title={`Fund Accounts (${fas.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Account ID</th>
                  <th className="pb-2 pr-3">Contact ID</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Details</th>
                  <th className="pb-2 pr-3">Active</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {fas.map((fa) => {
                  const bank = fa.bank_account as Record<string, unknown> | null
                  const vpa = fa.vpa as Record<string, unknown> | null
                  return (
                    <tr key={fa.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-mono text-xs">{fa.id}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{fa.contact_id}</td>
                      <td className="py-2.5 pr-3 capitalize">{fa.account_type?.replace("_", " ") ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {bank ? `${bank.bank_name ?? ""} •••${String(bank.account_number ?? "").slice(-4)} (${bank.ifsc ?? ""})` : ""}
                        {vpa ? String(vpa.address ?? "") : ""}
                      </td>
                      <td className="py-2.5 pr-3">{fa.active ? "Yes" : "No"}</td>
                      <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(fa.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DetailCard>
      )}
    </div>
  )
}
