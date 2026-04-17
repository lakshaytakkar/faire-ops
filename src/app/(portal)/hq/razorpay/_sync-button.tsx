"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function SyncRazorpayButton() {
  const [syncing, setSyncing] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    setBanner(null)
    try {
      const res = await fetch("/api/razorpay/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok || data.error) {
        setBanner({ type: "error", text: data.error ?? "Sync failed" })
      } else {
        setBanner({ type: "success", text: `Synced ${data.synced} records${data.failed ? `, ${data.failed} failed` : ""}` })
      }
      router.refresh()
    } catch (err) {
      setBanner({ type: "error", text: (err as Error).message })
    } finally {
      setSyncing(false)
      setTimeout(() => setBanner(null), 6000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {banner && (
        <span className={`text-sm ${banner.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {banner.text}
        </span>
      )}
      <Button onClick={handleSync} disabled={syncing} size="sm">
        {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" /> : <RefreshCw className="h-3.5 w-3.5" data-icon="inline-start" />}
        {syncing ? "Syncing..." : "Sync Razorpay"}
      </Button>
    </div>
  )
}
