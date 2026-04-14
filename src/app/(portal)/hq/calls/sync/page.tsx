"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Smartphone,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Ban,
  Signal,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SubNav } from "@/components/shared/sub-nav"
import { CALLS_SUB_NAV } from "../_nav"

interface DeviceRow {
  api_key: string
  employee_id: string | null
  employee_code: string | null
  employee_name: string | null
  employee_status: string | null
  device_label: string | null
  device_model: string | null
  android_version: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  revoked_at: string | null
  is_active: boolean | null
  total_calls: number | null
  last_call_synced_at: string | null
}

type ToastKind = "success" | "error"
interface ToastState {
  kind: ToastKind
  message: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatAbsolute(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function maskKey(k: string): string {
  if (!k) return ""
  if (k.length <= 10) return k
  return `${k.slice(0, 6)}…${k.slice(-4)}`
}

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "warning" | "error" | "neutral"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "default",
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  tone?: "default" | "emerald" | "amber" | "red"
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
  }
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`inline-flex size-8 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      )}
    </div>
  )
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

export default function QaDevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [revokingKey, setRevokingKey] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_callsync_devices")
      .select("*")
      .order("last_seen_at", { ascending: false, nullsFirst: false })
    if (error) {
      console.error("loadDevices error:", error)
      setToast({ kind: "error", message: error.message })
      return
    }
    setDevices((data ?? []) as DeviceRow[])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadDevices()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadDevices])

  const revoke = useCallback(
    async (apiKey: string, employeeCode: string | null) => {
      if (!confirm(`Revoke device for ${employeeCode ?? "this employee"}? The phone will stop syncing.`)) return
      setRevokingKey(apiKey)
      const { error } = await supabase.rpc("callsync_revoke_device", { p_api_key: apiKey })
      setRevokingKey(null)
      if (error) {
        setToast({ kind: "error", message: error.message })
        return
      }
      setToast({ kind: "success", message: `Revoked ${employeeCode ?? "device"}.` })
      await loadDevices()
    },
    [loadDevices],
  )

  const stats = useMemo(() => {
    const active = devices.filter((d) => d.is_active).length
    const revoked = devices.length - active
    const totalCalls = devices.reduce((s, d) => s + (d.total_calls ?? 0), 0)
    const latest = devices.reduce<string | null>((max, d) => {
      if (!d.last_seen_at) return max
      if (!max) return d.last_seen_at
      return new Date(d.last_seen_at) > new Date(max) ? d.last_seen_at : max
    }, null)
    return { active, revoked, totalCalls, latest }
  }, [devices])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={CALLS_SUB_NAV} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">CallSync Devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal phones running the CallSync Android app. Each device uploads new call-log rows every 15 minutes.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-lg border shadow-sm px-4 py-3 text-sm flex items-start gap-2 ${
            toast.kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 mt-0.5" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Devices" value={stats.active} icon={Signal} loading={loading} tone="emerald" />
        <StatCard label="Revoked" value={stats.revoked} icon={Ban} loading={loading} tone="amber" />
        <StatCard label="Total Calls Synced" value={stats.totalCalls.toLocaleString()} icon={Activity} loading={loading} />
        <StatCard label="Last Sync" value={timeAgo(stats.latest)} icon={Clock} loading={loading} />
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Smartphone className="size-4 text-muted-foreground" />
          <span>Registered devices</span>
          <span className="text-xs text-muted-foreground font-normal">
            ({devices.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Last Sync
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  API Key
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No devices registered yet. Employees can sign in with their employee ID on the CallSync app.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.api_key} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{d.employee_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{d.employee_code ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">{d.device_model ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.android_version ? `Android ${d.android_version}` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">{timeAgo(d.last_seen_at)}</div>
                      <div className="text-xs text-muted-foreground">{formatAbsolute(d.last_seen_at)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {(d.total_calls ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.is_active ? (
                        <StatusBadge label="ACTIVE" variant="success" />
                      ) : (
                        <StatusBadge label="REVOKED" variant="neutral" />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-[11px] font-mono text-muted-foreground">{maskKey(d.api_key)}</code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {d.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokingKey === d.api_key}
                          onClick={() => revoke(d.api_key, d.employee_code)}
                          className="text-red-700 hover:bg-red-50"
                        >
                          {revokingKey === d.api_key ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Revoking…
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3.5" /> Revoke
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
