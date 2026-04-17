"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { SPECS } from "../../_components/field-specs"
import { upsertJournalByDate, deleteRow } from "../../_actions/crud"

export function JournalEditLauncher({
  entry,
}: {
  entry: Record<string, unknown> & { id: string; date: string | null }
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const fields = SPECS.journal_entries

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const values: Record<string, unknown> = {}
    for (const f of fields) {
      if (f.name === "date") continue
      const v = fd.get(f.name)
      if (v === null || v === "") {
        values[f.name] = null
        continue
      }
      if (f.type === "number") {
        const n = Number(v)
        values[f.name] = Number.isFinite(n) ? n : null
      } else {
        values[f.name] = v
      }
    }
    const date = String(fd.get("date") ?? entry.date ?? "")
    if (!date) {
      setErr("Date is required")
      return
    }
    setErr(null)
    start(async () => {
      const res = await upsertJournalByDate(date, values)
      if (!res.ok) {
        setErr(res.error)
        toast.error(res.error)
        return
      }
      toast.success("Saved")
      setOpen(false)
    })
  }

  function remove() {
    if (!entry.id) return
    if (!confirm("Delete this journal entry?")) return
    start(async () => {
      const res = await deleteRow("journal_entries", entry.id, "/life/journal")
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Deleted")
      window.location.href = "/life/journal"
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5 mr-1.5" /> Edit entry
      </Button>
      <EditDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit journal entry"
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={remove}
              disabled={pending}
              className="text-destructive hover:text-destructive mr-auto"
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="journal-edit-form"
              size="sm"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <form id="journal-edit-form" onSubmit={submit} className="space-y-4">
          {fields.map((f) => {
            const dv =
              entry[f.name] == null ? "" : String(entry[f.name] as string | number)
            const id = `jf-${f.name}`
            const cls = "w-full rounded-md border bg-background px-3 py-2 text-sm"
            const label = (
              <label htmlFor={id} className="block text-sm font-medium mb-1.5">
                {f.label}
                {f.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )
            if (f.type === "textarea") {
              return (
                <div key={f.name}>
                  {label}
                  <textarea
                    id={id}
                    name={f.name}
                    rows={f.rows ?? 3}
                    defaultValue={dv}
                    className={cls}
                  />
                </div>
              )
            }
            return (
              <div key={f.name}>
                {label}
                <input
                  id={id}
                  name={f.name}
                  type={f.type ?? "text"}
                  defaultValue={dv}
                  min={f.min}
                  max={f.max}
                  required={f.required}
                  className={cls}
                />
              </div>
            )
          })}
          {err && <p className="text-sm text-destructive">{err}</p>}
        </form>
      </EditDrawer>
    </>
  )
}
