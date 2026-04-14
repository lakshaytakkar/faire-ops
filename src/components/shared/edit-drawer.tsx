"use client"

import type { ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// Generic right-side edit drawer. Replaces the ets-local EtsEditDrawer so
// every space can use the same drawer without cross-space imports.
// See SPACE_PATTERN.md §2.

export interface EditDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /** md = 28rem, lg = 36rem, xl = 48rem */
  size?: "md" | "lg" | "xl"
}

const SIZE_CLASSES: Record<NonNullable<EditDrawerProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-3xl",
}

export function EditDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: EditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn("flex flex-col gap-0 p-0", SIZE_CLASSES[size])}
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-5 py-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
