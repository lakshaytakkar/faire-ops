"use client"

import { Phone, Mail, Calendar, Sparkles } from "lucide-react"
import { usePinnedPartners, type PlatformPartner } from "@/lib/use-platform-partners"

const PLATFORM_LABEL: Record<string, string> = {
  faire: "Faire",
  tiktok: "TikTok Shop",
  amazon: "Amazon",
  shopify: "Shopify",
}

const ROLE_LABEL: Record<string, string> = {
  account_manager: "Account Manager",
  support: "Support",
  success: "Customer Success",
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function PartnerCard({ partner }: { partner: PlatformPartner }) {
  const platformLabel = PLATFORM_LABEL[partner.platform] ?? partner.platform
  const roleLabel = partner.title ?? ROLE_LABEL[partner.role] ?? partner.role

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-center gap-4">
      <div
        className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-[rgba(34,90,234,0.15)]"
        style={{ backgroundColor: "rgba(34,90,234,0.06)" }}
      >
        {partner.avatar_url ? (
          // Plain <img> intentional: external CDN, no Next.js optimizer needed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.avatar_url}
            alt={partner.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-sm font-semibold" style={{ color: "#225aea" }}>
            {initials(partner.name)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-semibold font-heading truncate">
            {partner.name}
          </p>
          <span
            className="inline-flex items-center gap-1 border-0 text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ backgroundColor: "rgba(34,90,234,0.1)", color: "#225aea" }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            Your {platformLabel} Rep
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {roleLabel} · {platformLabel}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {partner.phone ? (
          <a
            href={`tel:${partner.phone}`}
            title={`Call ${partner.phone}`}
            className="h-9 w-9 rounded-lg border border-border/80 flex items-center justify-center hover:bg-muted/40 transition-colors"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
          </a>
        ) : null}
        {partner.email ? (
          <a
            href={`mailto:${partner.email}`}
            title={`Email ${partner.email}`}
            className="h-9 w-9 rounded-lg border border-border/80 flex items-center justify-center hover:bg-muted/40 transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
          </a>
        ) : null}
        {partner.calendly_url ? (
          <a
            href={partner.calendly_url}
            target="_blank"
            rel="noreferrer"
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#225aea" }}
          >
            <Calendar className="h-3.5 w-3.5" />
            Book a call
          </a>
        ) : null}
      </div>
    </div>
  )
}

export function PartnerCardStrip({ spaceSlug }: { spaceSlug: string }) {
  const { partners, loading } = usePinnedPartners(spaceSlug)
  if (loading || partners.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-4">
      {partners.map((p) => (
        <PartnerCard key={p.id} partner={p} />
      ))}
    </div>
  )
}
