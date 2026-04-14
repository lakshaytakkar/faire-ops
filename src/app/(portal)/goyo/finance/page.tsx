import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Wallet } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// goyo-space build session fills in the table.
export default function GoyoFinancePage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Finance"
        subtitle="All transactions. Filter, sort, and open a transaction for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Wallet} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Wallet} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Wallet} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={Wallet} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All transactions">
        <EmptyState
          icon={Wallet}
          title="No transactions yet"
          description="Data will appear here once the goyo backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
