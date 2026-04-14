import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Layers } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// hq-space build session fills in the table.
export default function HqDepartmentsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Departments"
        subtitle="All departments. Filter, sort, and open a department for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Layers} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Layers} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Layers} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={Layers} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All departments">
        <EmptyState
          icon={Layers}
          title="No departments yet"
          description="Data will appear here once the hq backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
