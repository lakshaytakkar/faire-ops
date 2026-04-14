"use client"

import { Switch } from "@base-ui/react/switch"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Field } from "./field"
import {
  COMPLIANCE_STATUS_OPTIONS,
  LABEL_STATUS_OPTIONS,
  type ProductRow,
} from "./product-row"
import { type AutosaveHandle } from "./use-autosave"

export function ComplianceTab({
  row,
  patch,
  autosave,
}: {
  row: ProductRow
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field
        label="HS code"
        state={autosave.statuses.hs_code}
        onRetry={() => autosave.save("hs_code", row.hs_code)}
      >
        <Input
          defaultValue={row.hs_code ?? ""}
          onChange={(e) => patch({ hs_code: e.target.value })}
          onBlur={(e) => autosave.save("hs_code", e.target.value || null)}
        />
      </Field>

      <Field
        label="Compliance status"
        state={autosave.statuses.compliance_status}
        onRetry={() =>
          autosave.save("compliance_status", row.compliance_status)
        }
      >
        <NativeSelect
          value={row.compliance_status ?? ""}
          options={[...COMPLIANCE_STATUS_OPTIONS]}
          onChange={(v) => {
            patch({ compliance_status: v || null })
            autosave.save("compliance_status", v || null)
          }}
        />
      </Field>

      <Field
        label="Label status"
        state={autosave.statuses.label_status}
        onRetry={() => autosave.save("label_status", row.label_status)}
      >
        <NativeSelect
          value={row.label_status ?? ""}
          options={[...LABEL_STATUS_OPTIONS]}
          onChange={(v) => {
            patch({ label_status: v || null })
            autosave.save("label_status", v || null)
          }}
        />
      </Field>

      <Field
        label="BIS required"
        state={autosave.statuses.bis_required}
        onRetry={() => autosave.save("bis_required", row.bis_required)}
      >
        <div className="flex items-center gap-2 h-8">
          <Switch.Root
            checked={!!row.bis_required}
            onCheckedChange={(v: boolean) => {
              patch({ bis_required: v })
              autosave.save("bis_required", v)
            }}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors outline-none",
              row.bis_required
                ? "bg-primary"
                : "bg-muted border border-border/80",
            )}
          >
            <Switch.Thumb
              className={cn(
                "block size-4 rounded-full bg-white shadow transition-transform",
                row.bis_required ? "translate-x-4" : "translate-x-0.5",
                "mt-0.5",
              )}
            />
          </Switch.Root>
          <span className="text-sm text-muted-foreground">
            {row.bis_required ? "Required" : "Not required"}
          </span>
        </div>
      </Field>

      {row.bis_required && (
        <Field
          label="BIS status"
          state={autosave.statuses.bis_status}
          onRetry={() => autosave.save("bis_status", row.bis_status)}
          className="md:col-span-2"
        >
          <Input
            defaultValue={row.bis_status ?? ""}
            placeholder="ok, pending, rejected…"
            onChange={(e) => patch({ bis_status: e.target.value })}
            onBlur={(e) => autosave.save("bis_status", e.target.value || null)}
          />
        </Field>
      )}
    </div>
  )
}

function NativeSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
