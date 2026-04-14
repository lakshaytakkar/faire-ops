"use client"

import { Input } from "@/components/ui/input"
import { Field } from "./field"
import { type ProductRow } from "./product-row"
import { type AutosaveHandle } from "./use-autosave"

export function LogisticsTab({
  row,
  patch,
  autosave,
}: {
  row: ProductRow
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
}) {
  const volume =
    row.box_length_cm && row.box_width_cm && row.box_height_cm
      ? (row.box_length_cm * row.box_width_cm * row.box_height_cm) / 1_000_000
      : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field
        label="Units per carton"
        state={autosave.statuses.units_per_carton}
        onRetry={() =>
          autosave.save("units_per_carton", row.units_per_carton)
        }
      >
        <Input
          type="number"
          step="1"
          defaultValue={row.units_per_carton ?? ""}
          onChange={(e) =>
            patch({
              units_per_carton:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          onBlur={(e) =>
            autosave.save(
              "units_per_carton",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>

      <Field
        label="MOQ"
        state={autosave.statuses.moq}
        onRetry={() => autosave.save("moq", row.moq)}
      >
        <Input
          type="number"
          step="1"
          defaultValue={row.moq ?? ""}
          onChange={(e) =>
            patch({ moq: e.target.value === "" ? null : Number(e.target.value) })
          }
          onBlur={(e) =>
            autosave.save(
              "moq",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>

      <Field
        label="Box length (cm)"
        state={autosave.statuses.box_length_cm}
        onRetry={() => autosave.save("box_length_cm", row.box_length_cm)}
      >
        <Input
          type="number"
          step="0.01"
          defaultValue={row.box_length_cm ?? ""}
          onChange={(e) =>
            patch({
              box_length_cm:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          onBlur={(e) =>
            autosave.save(
              "box_length_cm",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>

      <Field
        label="Box width (cm)"
        state={autosave.statuses.box_width_cm}
        onRetry={() => autosave.save("box_width_cm", row.box_width_cm)}
      >
        <Input
          type="number"
          step="0.01"
          defaultValue={row.box_width_cm ?? ""}
          onChange={(e) =>
            patch({
              box_width_cm:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          onBlur={(e) =>
            autosave.save(
              "box_width_cm",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>

      <Field
        label="Box height (cm)"
        state={autosave.statuses.box_height_cm}
        onRetry={() => autosave.save("box_height_cm", row.box_height_cm)}
      >
        <Input
          type="number"
          step="0.01"
          defaultValue={row.box_height_cm ?? ""}
          onChange={(e) =>
            patch({
              box_height_cm:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          onBlur={(e) =>
            autosave.save(
              "box_height_cm",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>

      <Field
        label="Volume (m³)"
        hint="Computed L × W × H ÷ 1,000,000."
      >
        <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center font-mono tabular-nums">
          {volume === null ? "—" : volume.toFixed(4)}
        </div>
      </Field>

      <Field
        label="Weight (kg)"
        state={autosave.statuses.weight_kg}
        onRetry={() => autosave.save("weight_kg", row.weight_kg)}
      >
        <Input
          type="number"
          step="0.001"
          defaultValue={row.weight_kg ?? ""}
          onChange={(e) =>
            patch({
              weight_kg:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          onBlur={(e) =>
            autosave.save(
              "weight_kg",
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
        />
      </Field>
    </div>
  )
}
