"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { saveJournalToday } from "../_actions/ai"
import { cn } from "@/lib/utils"

export interface JournalToday {
  date: string
  brain_dump: string | null
  best_part: string | null
  change_one_thing: string | null
  grateful_for: string | null
  worried_about: string | null
  one_learning: string | null
  mood: number | null
  energy: number | null
  day_rating: number | null
}

const FIELDS: { name: keyof JournalToday; label: string; rows?: number; placeholder: string }[] = [
  { name: "brain_dump",       label: "Brain dump",        rows: 5, placeholder: "What's on your mind right now?" },
  { name: "best_part",        label: "Best part of today",rows: 2, placeholder: "What worked? What felt good?" },
  { name: "change_one_thing", label: "One thing to change",rows: 2, placeholder: "If you could redo today…" },
  { name: "grateful_for",     label: "Grateful for",      rows: 2, placeholder: "Who or what helped today?" },
  { name: "worried_about",    label: "Worried about",     rows: 2, placeholder: "What's eating at you?" },
  { name: "one_learning",     label: "One learning",      rows: 2, placeholder: "Distill today into one line." },
]

const SLIDERS: { name: "mood" | "energy" | "day_rating"; label: string }[] = [
  { name: "mood",       label: "Mood" },
  { name: "energy",     label: "Energy" },
  { name: "day_rating", label: "Day rating" },
]

export function DailyJournalForm({ initial }: { initial: JournalToday }) {
  const [draft, setDraft] = useState<JournalToday>(initial)
  const [pending, start] = useTransition()
  const [savedAt, setSavedAt] = useState<string | null>(null)

  function save(partial: Partial<JournalToday>) {
    start(async () => {
      const merged = { ...draft, ...partial }
      setDraft(merged)
      const wordCount = countWords(merged)
      const res = await saveJournalToday({
        date: merged.date,
        brain_dump: merged.brain_dump,
        best_part: merged.best_part,
        change_one_thing: merged.change_one_thing,
        grateful_for: merged.grateful_for,
        worried_about: merged.worried_about,
        one_learning: merged.one_learning,
        mood: merged.mood,
        energy: merged.energy,
        day_rating: merged.day_rating,
        word_count: wordCount,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }))
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">How's today?</p>
          <p className="text-sm text-muted-foreground">
            {pending ? "Saving…" : savedAt ? `Saved ${savedAt}` : "Autosaves on change"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SLIDERS.map((s) => (
            <Slider
              key={s.name}
              label={s.label}
              value={draft[s.name] ?? 0}
              onChange={(v) => save({ [s.name]: v } as Partial<JournalToday>)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.name} className={cn("rounded-lg border bg-card p-4", f.rows && f.rows >= 5 && "lg:col-span-2")}>
            <label className="block text-sm font-semibold mb-2">{f.label}</label>
            <textarea
              defaultValue={(draft[f.name] as string) ?? ""}
              onBlur={(e) => save({ [f.name]: e.target.value || null } as Partial<JournalToday>)}
              rows={f.rows ?? 3}
              placeholder={f.placeholder}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-semibold tabular-nums">{value || "—"} <span className="text-muted-foreground font-normal">/ 10</span></span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function countWords(j: JournalToday): number {
  const all = [j.brain_dump, j.best_part, j.change_one_thing, j.grateful_for, j.worried_about, j.one_learning]
    .filter(Boolean)
    .join(" ")
  return all ? all.trim().split(/\s+/).length : 0
}
