"use client";

import { useParams } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { HeroCard } from "@/components/shared/hero-card";
import { DetailCard, InfoRow } from "@/components/shared/detail-views";
import { UserCircle } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §4.
export default function GoyoClientsDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/clients" label="All clients" />

      <HeroCard
        title={`Client ${id}`}
        subtitle="Replace with real data once the backend is wired."
        icon={UserCircle}
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
