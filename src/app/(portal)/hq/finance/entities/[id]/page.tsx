"use client";

import { useParams } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { HeroCard } from "@/components/shared/hero-card";
import { DetailCard, InfoRow } from "@/components/shared/detail-views";
import { Building2 } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §4.
export default function HqEntitiesDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/finance/entities" label="All entities" />

      <HeroCard
        title={`Entity ${id}`}
        subtitle="Replace with real data once the backend is wired."
        icon={Building2}
        tone="blue"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Overview">
            <InfoRow label="ID" value={id} />
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Meta">
            <InfoRow label="Created" value="—" />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
