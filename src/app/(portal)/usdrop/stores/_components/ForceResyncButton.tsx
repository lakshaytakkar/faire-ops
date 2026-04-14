"use client"

import { useState, useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { forceResyncStore } from "@/app/(portal)/usdrop/_actions/crud"

export function ForceResyncButton({ storeId }: { storeId: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function run() {
    setErr(null)
    start(async () => {
      const res = await forceResyncStore(storeId)
      if (!res.ok) setErr(res.error)
    })
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={run} disabled={pending}>
        <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
        <span className="ml-1.5">{pending ? "Syncing…" : "Resync"}</span>
      </Button>
      {err && <span className="text-sm text-destructive">{err}</span>}
    </div>
  )
}
