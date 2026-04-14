import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { UserCircle } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// legal-space build session fills in the table.
export default function LegalClientsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Clients"
        subtitle="All clients. Filter, sort, and open a client for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={UserCircle} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={UserCircle} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={UserCircle} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={UserCircle} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All clients">
        <EmptyState
          icon={UserCircle}
          title="No clients yet"
          description="Data will appear here once the legal backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
