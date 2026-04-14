import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyRound } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// hq-space build session fills in the table.
export default function HqLicensesPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Licenses"
        subtitle="All licenses. Filter, sort, and open a license for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={KeyRound} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={KeyRound} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={KeyRound} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={KeyRound} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All licenses">
        <EmptyState
          icon={KeyRound}
          title="No licenses yet"
          description="Data will appear here once the hq backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
