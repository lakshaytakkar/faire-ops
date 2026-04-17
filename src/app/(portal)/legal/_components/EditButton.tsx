"use client"

import { useState, type ReactNode } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TriggerDrawer({
  label = "Edit",
  variant = "outline",
  size = "sm",
  icon = "edit",
  render,
}: {
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "sm" | "default"
  icon?: "edit" | "add" | "none"
  render: (args: { open: boolean; onClose: () => void }) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const Icon = icon === "add" ? Plus : icon === "edit" ? Pencil : null
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} type="button">
        {Icon && <Icon className="size-3.5 mr-1.5" />}
        {label}
      </Button>
      {render({ open, onClose: () => setOpen(false) })}
    </>
  )
}
