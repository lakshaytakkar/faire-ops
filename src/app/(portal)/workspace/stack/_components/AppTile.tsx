"use client"

import { useState, useTransition } from "react"
import { ExternalLink, Star } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AppLogo } from "@/components/shared/app-logo"
import { maskIdentifier } from "@/lib/app-logos"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { LifeDrawerForm } from "@/app/(portal)/life/_components/LifeDrawerForm"
import { SPECS } from "@/app/(portal)/life/_components/field-specs"
import { GenericEditLauncher } from "@/app/(portal)/life/_components/GenericEditLauncher"
import { toggleAppFavorite } from "@/app/(portal)/life/_actions/ops"
import type { AppRow, SubRow, CredRow } from "../stack-client"

function toneForFrequency(freq: string | null | undefined): StatusTone {
  switch (freq) {
    case "daily":
      return "emerald"
    case "weekly":
      return "blue"
    case "monthly":
      return "amber"
    case "rarely":
      return "slate"
    case "archived":
      return "slate"
    default:
      return "slate"
  }
}

function cycleShort(cycle: string | null): string {
  switch (cycle) {
    case "monthly":
      return "mo"
    case "quarterly":
      return "qtr"
    case "annual":
      return "yr"
    case "lifetime":
      return "lifetime"
    case "trial":
      return "trial"
    default:
      return "—"
  }
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return "—"
  const sym = currency && currency !== "INR" ? `${currency} ` : "₹ "
  return `${sym}${amount.toLocaleString("en-IN")}`
}

export function AppTile({
  app,
  sub,
  cred,
}: {
  app: AppRow
  sub?: SubRow
  cred?: CredRow
}) {
  const [pending, start] = useTransition()
  const [favorite, setFavorite] = useState<boolean>(!!app.is_favorite)
  const [subOpen, setSubOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)

  function handleToggleFavorite() {
    const next = !favorite
    setFavorite(next)
    start(async () => {
      const res = await toggleAppFavorite(app.id, next)
      if (!res.ok) {
        setFavorite(!next)
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2 hover:border-foreground/20 hover:shadow-sm transition">
      {/* Top row: logo + name + favorite toggle */}
      <div className="flex items-start gap-2.5">
        <AppLogo app={app} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{app.name ?? "Unnamed"}</div>
          {app.purpose && (
            <div className="text-xs text-muted-foreground line-clamp-2">{app.purpose}</div>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={pending}
          aria-label={favorite ? "Unfavorite" : "Favorite"}
          className={cn(
            "shrink-0 rounded-md p-1 transition",
            favorite ? "text-amber-500" : "text-muted-foreground hover:text-amber-500",
          )}
        >
          <Star className={cn("size-4", favorite && "fill-amber-500")} />
        </button>
      </div>

      {/* Meta chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {app.usage_frequency && (
          <StatusBadge tone={toneForFrequency(app.usage_frequency)}>
            {app.usage_frequency}
          </StatusBadge>
        )}
        {app.is_paid && <StatusBadge tone="amber">paid</StatusBadge>}
      </div>

      {/* Subscription summary */}
      {sub && (
        <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-foreground">{sub.plan_name ?? "—"}</span>
          <span>·</span>
          <span className="tabular-nums">
            {formatMoney(sub.amount, sub.currency)}/{cycleShort(sub.billing_cycle)}
          </span>
          {sub.next_renewal && (
            <>
              <span>·</span>
              <span className="tabular-nums">next {formatDate(sub.next_renewal)}</span>
            </>
          )}
          {sub.status && (
            <StatusBadge tone={toneForStatus(sub.status)}>{sub.status}</StatusBadge>
          )}
        </div>
      )}

      {/* Credential summary */}
      {cred && (
        <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-foreground">
            {cred.login_type === "email" && cred.identifier
              ? maskIdentifier(cred.identifier)
              : cred.login_type ?? "—"}
          </span>
          <span>·</span>
          <span>2FA: {cred.two_factor_method ?? "—"}</span>
          {cred.password_manager && (
            <>
              <span>·</span>
              <span>{cred.password_manager}</span>
            </>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1.5 pt-1 mt-auto">
        {app.url ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-muted"
          >
            <ExternalLink className="size-3" />
            Open
          </a>
        ) : null}
        <GenericEditLauncher
          table="apps"
          row={app as unknown as Record<string, unknown> & { id: string }}
          listHref="/workspace/stack"
          title="Edit app"
          size="lg"
          buttonLabel="Edit"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSubOpen(true)}
        >
          {sub ? "Sub…" : "+ Sub"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCredOpen(true)}
        >
          {cred ? "Cred…" : "+ Cred"}
        </Button>
      </div>

      <LifeDrawerForm
        open={subOpen}
        onClose={() => setSubOpen(false)}
        title={sub ? "Edit subscription" : "New subscription"}
        table="app_subscriptions"
        id={sub?.id}
        defaults={
          (sub ?? { app_id: app.id }) as unknown as Record<string, unknown>
        }
        fields={SPECS.app_subscriptions}
        revalidate="/workspace/stack"
        size="lg"
        deletable={!!sub}
      />

      <LifeDrawerForm
        open={credOpen}
        onClose={() => setCredOpen(false)}
        title={cred ? "Edit credentials" : "New credentials"}
        table="app_credentials"
        id={cred?.id}
        defaults={
          (cred ?? { app_id: app.id }) as unknown as Record<string, unknown>
        }
        fields={SPECS.app_credentials}
        revalidate="/workspace/stack"
        size="lg"
        deletable={!!cred}
      />
    </div>
  )
}
