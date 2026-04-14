import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { ShoppingCart } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// goyo-space build session fills in the table.
export default function GoyoBookingsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="All bookings. Filter, sort, and open a booking for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={ShoppingCart} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={ShoppingCart} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={ShoppingCart} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={ShoppingCart} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All bookings">
        <EmptyState
          icon={ShoppingCart}
          title="No bookings yet"
          description="Data will appear here once the goyo backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
