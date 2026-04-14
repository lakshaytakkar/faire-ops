import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Target } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// hq-space build session fills in the table.
export default function HqComplianceDashboardPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Compliance Dashboard"
        subtitle="All items. Filter, sort, and open a item for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Target} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Target} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Target} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={Target} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All items">
        <EmptyState
          icon={Target}
          title="No items yet"
          description="Data will appear here once the hq backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
