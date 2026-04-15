"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  MoreHorizontal,
  ExternalLink as ExternalLinkIcon,
  Pencil,
  RefreshCcw,
  PauseCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { supabaseHq } from "@/lib/supabase"

interface PlatformLite {
  id: string
  name: string
  plan: string | null
  seats: number | null
  monthly_cost: number | string | null
  url: string | null
  account_email: string | null
  status: string
}

export function PlatformRowActions({ platform }: { platform: PlatformLite }) {
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(platform.name)
  const [plan, setPlan] = useState(platform.plan ?? "")
  const [seats, setSeats] = useState<string>(
    platform.seats != null ? String(platform.seats) : "",
  )
  const [cost, setCost] = useState<string>(
    platform.monthly_cost != null ? String(platform.monthly_cost) : "",
  )
  const [isPending, startTransition] = useTransition()

  function refresh() {
    // server component re-render on navigation — fall back to reload for now
    if (typeof window !== "undefined") window.location.reload()
  }

  async function markSynced() {
    const { error } = await supabaseHq
      .from("job_platforms")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", platform.id)
    if (error) {
      toast.error(`Mark synced failed: ${error.message}`)
      return
    }
    toast.success(`${platform.name} marked synced`)
    startTransition(refresh)
  }

  async function disablePlatform() {
    const { error } = await supabaseHq
      .from("job_platforms")
      .update({ status: "disabled" })
      .eq("id", platform.id)
    if (error) {
      toast.error(`Disable failed: ${error.message}`)
      return
    }
    toast.success(`${platform.name} disabled`)
    startTransition(refresh)
  }

  async function saveEdit() {
    const patch: Record<string, unknown> = {
      name: name.trim() || platform.name,
      plan: plan.trim() || null,
      seats: seats.trim() === "" ? null : Number(seats),
      monthly_cost: cost.trim() === "" ? null : Number(cost),
    }
    const { error } = await supabaseHq
      .from("job_platforms")
      .update(patch)
      .eq("id", platform.id)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
      return
    }
    toast.success("Platform updated")
    setEditOpen(false)
    startTransition(refresh)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label="Row actions"
              className="h-7 w-7 p-0"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!platform.url}
            onClick={() => {
              if (platform.url)
                window.open(platform.url, "_blank", "noopener,noreferrer")
            }}
          >
            <ExternalLinkIcon className="size-3.5" /> View account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isPending} onClick={markSynced}>
            <RefreshCcw className="size-3.5" /> Mark synced
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending || platform.status === "disabled"}
            onClick={disablePlatform}
          >
            <PauseCircle className="size-3.5" /> Disable
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit ${platform.name}`}
        subtitle="Update plan, seats, and monthly cost."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={saveEdit}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Plan
            </span>
            <input
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="e.g. Resdex 100/mo"
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Seats
              </span>
              <input
                type="number"
                min="0"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Monthly cost
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </div>
      </EditDrawer>
    </>
  )
}
