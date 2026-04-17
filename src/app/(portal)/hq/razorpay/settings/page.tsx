"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Settings, RefreshCw, Webhook, Key, Clock } from "lucide-react"

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ ok: boolean; synced?: number; failed?: number; error?: string; results?: { entity: string; synced: number; failed: number; error?: string }[] } | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/razorpay/sync", { method: "POST" })
      const data = await res.json()
      setSyncResult(data)
    } catch (err) {
      setSyncResult({ ok: false, error: (err as Error).message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader
        title="Razorpay Settings"
        subtitle="API configuration, webhook setup, and manual sync controls."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="API Configuration">
          <InfoRow label="Key ID" value="rzp_live_Se••••••••og" />
          <InfoRow label="Key Secret" value="••••••••••••••••" />
          <InfoRow label="Environment" value={<StatusBadge tone="emerald">Live</StatusBadge>} />
          <InfoRow label="Base URL" value="https://api.razorpay.com/v1" />
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">API keys are stored as environment variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET). Update via Vercel dashboard.</p>
        </DetailCard>

        <DetailCard title="Webhook Configuration">
          <InfoRow label="Endpoint" value="/api/razorpay/webhook" />
          <InfoRow label="Signature Verification" value={<StatusBadge tone="emerald">Enabled</StatusBadge>} />
          <InfoRow label="Events" value="30+ event types" />
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Configure your webhook URL in Razorpay Dashboard:</p>
            <p className="text-xs font-mono mt-1 bg-muted/50 p-2 rounded">https://faire-ops-flax.vercel.app/api/razorpay/webhook</p>
            <p className="text-xs text-muted-foreground mt-2">Set RAZORPAY_WEBHOOK_SECRET env var to match the secret in Razorpay Dashboard.</p>
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Manual Sync">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pull all Razorpay data (payments, orders, refunds, settlements, customers, invoices, payment links,
            plans, subscriptions, disputes) into the local database. This runs automatically every 15 minutes via cron.
          </p>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>

          {syncResult && (
            <div className={`p-4 rounded-md border ${syncResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge tone={syncResult.ok ? "emerald" : "red"}>{syncResult.ok ? "Success" : "Failed"}</StatusBadge>
                {syncResult.synced !== undefined && <span className="text-sm font-medium">{syncResult.synced} records synced</span>}
                {syncResult.failed !== undefined && syncResult.failed > 0 && <span className="text-sm text-red-600">{syncResult.failed} failed</span>}
              </div>
              {syncResult.error && <p className="text-sm text-red-700">{syncResult.error}</p>}
              {syncResult.results && (
                <div className="mt-2 space-y-1">
                  {syncResult.results.map((r) => (
                    <div key={r.entity} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{r.entity.replace(/_/g, " ")}</span>
                      <span className="tabular-nums">
                        {r.synced} synced
                        {r.failed > 0 && <span className="text-red-600 ml-2">{r.failed} failed</span>}
                        {r.error && <span className="text-red-600 ml-2">({r.error})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DetailCard>

      <DetailCard title="Cron Schedule">
        <InfoRow label="Sync Frequency" value="Every 15 minutes" />
        <InfoRow label="Cron Expression" value="*/15 * * * *" />
        <InfoRow label="Route" value="/api/cron/sync-razorpay" />
        <InfoRow label="Auth" value="Bearer CRON_SECRET" />
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">The cron job automatically pulls all Razorpay entities. Webhook events provide real-time updates between syncs.</p>
      </DetailCard>

      <DetailCard title="Supported Entities">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "Payments", "Orders", "Refunds", "Settlements", "Customers",
            "Payment Links", "Invoices", "Items", "Plans", "Subscriptions",
            "Disputes", "QR Codes", "Contacts (X)", "Fund Accounts (X)",
            "Payouts (X)", "Payout Links (X)", "Transactions (X)", "Transfers",
          ].map((entity) => (
            <div key={entity} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-muted/30">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {entity}
            </div>
          ))}
        </div>
      </DetailCard>
    </div>
  )
}
