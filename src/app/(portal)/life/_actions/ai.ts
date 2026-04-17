"use server"

import { revalidatePath } from "next/cache"
import { lifeAdmin, type ActionResult } from "./_client"
import { whisperTranscribe, chat, openaiConfigured } from "../_lib/openai"
import { LIFE_TABLES, type LifeTable } from "./crud"

/**
 * Pull the audio from storage, transcribe via Whisper, write transcript
 * + summary back onto the capture row.
 */
export async function transcribeCapture(captureId: string): Promise<ActionResult> {
  if (!openaiConfigured()) return { ok: false, error: "OPENAI_API_KEY not configured" }
  try {
    const admin = lifeAdmin()
    const { data: cap } = await admin
      .from("captures")
      .select("id, audio_url, transcript")
      .eq("id", captureId)
      .maybeSingle()
    if (!cap) return { ok: false, error: "Capture not found" }
    if (!cap.audio_url) return { ok: false, error: "Capture has no audio_url" }
    if (cap.transcript) return { ok: true, id: captureId } // idempotent

    const dl = await admin.storage.from("life-voice-notes").download(cap.audio_url as string)
    if (dl.error || !dl.data) return { ok: false, error: dl.error?.message ?? "download failed" }

    const tx = await whisperTranscribe(dl.data, "audio.webm")
    if (!tx.ok) return { ok: false, error: tx.error }

    // Quick one-line summary via chat
    const sumRes = await chat<string>({
      system:
        "You are a precise summariser. Given a short voice-note transcript, produce ONE line (max 14 words) that captures the essence in plain English. No emojis, no quotation marks.",
      user: tx.data,
      temperature: 0.2,
    })
    const summary = sumRes.ok ? (sumRes.data as string).trim() : null

    const { error } = await admin
      .from("captures")
      .update({ transcript: tx.data, summary })
      .eq("id", captureId)
    if (error) return { ok: false, error: error.message }

    revalidatePath("/life/inbox")
    revalidatePath(`/life/inbox/${captureId}`)
    return { ok: true, id: captureId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "transcribe failed" }
  }
}

export type ProposedRow = {
  table: LifeTable
  values: Record<string, unknown>
  reason?: string
}

/**
 * Ask the LLM to suggest structured rows. Returns the proposed rows for
 * the user to review + approve. Does NOT insert anything.
 */
export async function suggestExtraction(captureId: string): Promise<
  | { ok: true; proposed: ProposedRow[] }
  | { ok: false; error: string }
> {
  if (!openaiConfigured()) return { ok: false, error: "OPENAI_API_KEY not configured" }
  try {
    const admin = lifeAdmin()
    const { data: cap } = await admin
      .from("captures")
      .select("id, content, transcript, summary, category")
      .eq("id", captureId)
      .maybeSingle()
    if (!cap) return { ok: false, error: "Capture not found" }

    const text = (cap.transcript as string | null) ?? (cap.content as string | null) ?? ""
    if (!text.trim()) return { ok: false, error: "Capture has no text or transcript" }

    const sys = `You are an extraction agent for a personal-life database. Given a short narration, propose 0..N database INSERT rows.

Allowed tables: ${LIFE_TABLES.join(", ")}

Rules:
- ONLY emit rows where the narration explicitly states the data. Do not invent values.
- Use today's date if a date is implied by "today" / present tense / no date stated.
- Use 'INR' as currency unless another is stated.
- For amounts use plain numbers (not strings).
- For mood/energy/day_rating use integers 1-10.
- For sleep quality use 1-5.
- Status enums to respect:
  life_goals.status ∈ active|on_hold|complete|dropped
  life_issues.status ∈ open|in_progress|resolved|accepted
  habit_logs.status ∈ done|skip|miss
  habits.frequency ∈ daily|weekdays|custom
  books.status ∈ want_to_read|reading|finished|abandoned
  people.contact_health ∈ great|good|needs_attention|drifting
- Output strict JSON: { "proposed": [ { "table": "<one of allowed>", "values": { ... }, "reason": "<one line>" }, ... ] }
- If nothing is extractable, return { "proposed": [] }.`

    const user = `Narration:\n"""\n${text}\n"""\n${cap.category ? `Tag hint: ${cap.category}\n` : ""}Today's date: ${new Date().toISOString().slice(0, 10)}`

    const res = await chat<{ proposed?: ProposedRow[] }>({ system: sys, user, jsonMode: true, temperature: 0.1 })
    if (!res.ok) return { ok: false, error: res.error }
    const proposed = Array.isArray((res.data as { proposed?: ProposedRow[] })?.proposed)
      ? ((res.data as { proposed: ProposedRow[] }).proposed as ProposedRow[])
      : []
    // Filter to allow-listed tables only
    const allow = new Set<string>(LIFE_TABLES)
    return { ok: true, proposed: proposed.filter((p) => allow.has(p.table)) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "suggest failed" }
  }
}

/**
 * Apply user-approved rows. Inserts each into its table, then marks the
 * capture as `processed` and stores the audit log in `extracted_rows`.
 */
export async function applyExtraction(
  captureId: string,
  rows: ProposedRow[],
): Promise<ActionResult> {
  try {
    const admin = lifeAdmin()
    const allow = new Set<string>(LIFE_TABLES)
    const inserted: Array<{ table: string; id?: string; error?: string }> = []
    for (const r of rows) {
      if (!allow.has(r.table)) {
        inserted.push({ table: r.table, error: "table not in allow-list" })
        continue
      }
      const { data, error } = await admin.from(r.table).insert(r.values).select("id").maybeSingle()
      inserted.push({
        table: r.table,
        id: data?.id as string | undefined,
        error: error?.message,
      })
    }

    const allOk = inserted.every((i) => !i.error)
    const { error } = await admin
      .from("captures")
      .update({
        status: allOk ? "processed" : "inbox",
        extracted_rows: inserted,
        extracted_at: allOk ? new Date().toISOString() : null,
      })
      .eq("id", captureId)
    if (error) return { ok: false, error: error.message }

    revalidatePath("/life/inbox")
    revalidatePath(`/life/inbox/${captureId}`)
    revalidatePath("/life")
    if (!allOk) {
      const firstErr = inserted.find((i) => i.error)?.error ?? "unknown"
      return { ok: false, error: `Some inserts failed: ${firstErr}` }
    }
    return { ok: true, id: captureId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "apply failed" }
  }
}

export async function archiveCapture(captureId: string): Promise<ActionResult> {
  try {
    const { error } = await lifeAdmin().from("captures").update({ status: "archived" }).eq("id", captureId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/life/inbox")
    revalidatePath("/life")
    return { ok: true, id: captureId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "archive failed" }
  }
}

export async function reopenCapture(captureId: string): Promise<ActionResult> {
  try {
    const { error } = await lifeAdmin().from("captures").update({ status: "inbox" }).eq("id", captureId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/life/inbox")
    revalidatePath("/life")
    return { ok: true, id: captureId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "reopen failed" }
  }
}

export async function deleteCapture(captureId: string): Promise<ActionResult> {
  try {
    const admin = lifeAdmin()
    const { data: cap } = await admin
      .from("captures")
      .select("audio_url")
      .eq("id", captureId)
      .maybeSingle()
    if (cap?.audio_url) {
      await admin.storage.from("life-voice-notes").remove([cap.audio_url as string])
    }
    const { error } = await admin.from("captures").delete().eq("id", captureId)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/life/inbox")
    revalidatePath("/life")
    return { ok: true, id: captureId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "delete failed" }
  }
}

/**
 * Server action — autosave the day's journal entry. Upserts on `date`.
 */
export async function saveJournalToday(values: Record<string, unknown>): Promise<ActionResult> {
  try {
    const date = (values.date as string | undefined) ?? new Date().toISOString().slice(0, 10)
    const admin = lifeAdmin()
    const { data: existing } = await admin
      .from("journal_entries")
      .select("id")
      .eq("date", date)
      .maybeSingle()
    if (existing?.id) {
      const { error } = await admin.from("journal_entries").update(values).eq("id", existing.id)
      if (error) return { ok: false, error: error.message }
      revalidatePath("/life")
      revalidatePath(`/life/journal/${date}`)
      return { ok: true, id: existing.id as string }
    }
    const { data, error } = await admin
      .from("journal_entries")
      .insert({ ...values, date })
      .select("id")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    revalidatePath("/life")
    revalidatePath(`/life/journal/${date}`)
    return { ok: true, id: data?.id as string | undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "save failed" }
  }
}
