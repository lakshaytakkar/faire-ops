import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// hq-space build session fills in the table.
export default function HqSocialAnalyticsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Social Analytics"
        subtitle="All metrics. Filter, sort, and open a metric for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={TrendingUp} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={TrendingUp} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={TrendingUp} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={TrendingUp} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All metrics">
        <EmptyState
          icon={TrendingUp}
          title="No metrics yet"
          description="Data will appear here once the hq backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
