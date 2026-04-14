"use client"

import { useState, useTransition } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  approvePipelineItem,
  rejectPipelineItem,
} from "@/app/(portal)/usdrop/_actions/crud"

export function PipelineRowActions({ productId }: { productId: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function approve() {
    setErr(null)
    start(async () => {
      const res = await approvePipelineItem(productId)
      if (!res.ok) setErr(res.error)
    })
  }
  function reject() {
    setErr(null)
    start(async () => {
      const res = await rejectPipelineItem(productId)
      if (!res.ok) setErr(res.error)
    })
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button size="sm" onClick={approve} disabled={pending}>
        <Check className="size-3.5" />
        <span className="ml-1">Approve</span>
      </Button>
      <Button size="sm" variant="destructive" onClick={reject} disabled={pending}>
        <X className="size-3.5" />
        <span className="ml-1">Reject</span>
      </Button>
      {err && <span className="text-sm text-destructive ml-2">{err}</span>}
    </div>
  )
}
