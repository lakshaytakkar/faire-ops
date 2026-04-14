import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Box } from "lucide-react";

// Canonical list page. See SPACE_PATTERN.md §3.
export default function GoyoDashboardPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="One sentence summarizing what's on this page."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Box} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Box} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Box} iconTone="amber" />
        <MetricCard label="Blocked" value={0} icon={Box} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All dashboard">
        <EmptyState
          icon={Box}
          title="Nothing here yet"
          description="Connect this page to its data source."
        />
      </DetailCard>
    </div>
  );
}
