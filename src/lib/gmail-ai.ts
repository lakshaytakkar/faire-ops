/**
 * Gmail AI layer — auto-categorization + AI draft replies.
 *
 * Uses Gemini 2.5 Flash via `generateText` from "@/lib/gemini" and the
 * Gmail REST wrappers from "@/lib/gmail-api".
 *
 * Two public entry points:
 *   - categorizeMessages(accountId, options) — classifies recent INBOX
 *     messages into a fixed taxonomy and applies `TeamSync/<Category>`
 *     Gmail labels.
 *   - draftReply(messageRowId, options) — generates a reply body with
 *     Gemini and stores a Gmail draft (both in Gmail and in the local
 *     gmail_drafts table).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { generateText } from "@/lib/gemini"
import {
  loadAccount,
  getValidAccessToken,
  modifyMessage,
  buildRawMessage,
  findOrCreateLabel,
  createDraft,
} from "@/lib/gmail-api"

/* ------------------------------------------------------------------ */
/*  Types / constants                                                  */
/* ------------------------------------------------------------------ */

export const AI_CATEGORIES = [
  "Orders",
  "Customer Support",
  "Marketing & Promo",
  "Internal Team",
  "Personal",
  "Spam-like",
  "Important",
  "Other",
] as const

export type AiCategory = (typeof AI_CATEGORIES)[number]

const CATEGORY_SET: Set<string> = new Set(AI_CATEGORIES)
const LABEL_PREFIX = "TeamSync/"

export interface CategorizeOptions {
  max?: number
  onlyUncategorized?: boolean
}

export interface CategorizeResult {
  categorized: number
  byCategory: Record<string, number>
  errors: number
}

export interface DraftReplyOptions {
  tone?: "professional" | "friendly" | "concise" | "detailed"
  instructions?: string
}

export interface DraftReplyResult {
  draftId: string
  gmailDraftId: string | null
  subject: string
  body: string
}

interface MessageRow {
  id: string
  account_id: string
  gmail_id: string
  thread_id: string | null
  subject: string | null
  sender: string | null
  sender_email: string | null
  snippet: string | null
  body_text: string | null
  label_ids: string[] | null
  ai_category: string | null
}

/* ------------------------------------------------------------------ */
/*  Supabase admin                                                     */
/* ------------------------------------------------------------------ */

let _adminClient: SupabaseClient | null = null
function getAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient
  _adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
  return _adminClient
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Strip markdown code fences and extract the first JSON array we can find.
 * Gemini often wraps output in ```json ... ``` even when asked not to.
 */
function extractJsonArray(raw: string): unknown {
  if (!raw) return null
  let text = raw.trim()

  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) text = fenceMatch[1].trim()

  // Fast path: the whole thing is already JSON.
  try {
    return JSON.parse(text)
  } catch {
    /* fall through */
  }

  // Greedy match of the first [...] block in the text.
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      /* fall through */
    }
  }
  return null
}

function normalizeCategory(raw: unknown): AiCategory {
  if (typeof raw !== "string") return "Other"
  const trimmed = raw.trim()
  if (CATEGORY_SET.has(trimmed)) return trimmed as AiCategory

  // Loose case/spacing-insensitive match.
  const lower = trimmed.toLowerCase()
  for (const c of AI_CATEGORIES) {
    if (c.toLowerCase() === lower) return c
  }
  return "Other"
}

function buildCategorizePrompt(
  messages: { i: number; sender: string; subject: string; snippet: string }[]
): string {
  const list = AI_CATEGORIES.map((c) => `"${c}"`).join(", ")
  const body = messages
    .map(
      (m) =>
        `#${m.i}\nFrom: ${m.sender || "(unknown)"}\nSubject: ${m.subject || "(no subject)"}\nSnippet: ${m.snippet || "(empty)"}`
    )
    .join("\n\n")

  return `You are an email triage assistant. Classify each email below into EXACTLY ONE of these categories — use only these exact strings:
${list}

Guidelines:
- "Orders" — purchase orders, order status, invoices, shipping confirmations from customers or marketplaces
- "Customer Support" — customer questions, complaints, returns, help requests
- "Marketing & Promo" — newsletters, promotions, sales announcements, deals
- "Internal Team" — from coworkers, team communication, internal notifications
- "Personal" — non-business personal messages
- "Spam-like" — obvious spam, phishing, cold outreach, mass mail
- "Important" — time-sensitive, legal, financial, or executive communication that doesn't fit a more specific bucket
- "Other" — anything that genuinely doesn't match the above

Emails:

${body}

Return ONLY a JSON array, no prose, no markdown fences. Format:
[{"i": 0, "category": "Orders"}, {"i": 1, "category": "Marketing & Promo"}]

Include one object per email. The "i" field MUST match the #number above. The "category" field MUST be one of the allowed strings, byte-for-byte.`
}

function buildReplyPrompt(args: {
  fromName: string
  fromEmail: string
  subject: string
  bodyOrSnippet: string
  tone: string
  instructions?: string
}): string {
  return `You are drafting a reply to an email on behalf of the account owner. Write ONLY the reply body — no subject line, no greeting block (do not write "Dear X," or "Hi X,"), no signature block (do not write "Best,", "Regards,", or "[Your Name]"), no markdown, no code fences. Just the plain-text body of the email.

Original email:
From: ${args.fromName} <${args.fromEmail}>
Subject: ${args.subject || "(no subject)"}

${args.bodyOrSnippet}

---

Tone: ${args.tone}
${args.instructions ? `Additional instructions: ${args.instructions}\n` : ""}
Requirements:
- Match the tone of the original where appropriate.
- Reference specifics from the original message (names, order numbers, dates, questions) so the reply is clearly contextual.
- Be concise and actionable — get to the point.
- Do NOT include any placeholder text like [Your Name], [Company], [Date]. If a detail is unknown, phrase around it naturally.
- Plain text only. No markdown, no bullet lists unless the reply genuinely needs them.

Write the reply body now:`
}

/* ------------------------------------------------------------------ */
/*  categorizeMessages                                                 */
/* ------------------------------------------------------------------ */

export async function categorizeMessages(
  accountId: string,
  options: CategorizeOptions = {}
): Promise<CategorizeResult> {
  const max = Math.min(Math.max(options.max ?? 50, 1), 200)
  const onlyUncategorized = options.onlyUncategorized !== false
  const result: CategorizeResult = { categorized: 0, byCategory: {}, errors: 0 }

  const account = await loadAccount(accountId)
  if (!account) return result

  const token = await getValidAccessToken(account)
  if (!token) return result // demo account — skip silently

  const supabase = getAdmin()

  // Pull recent INBOX messages to classify.
  let q = supabase
    .from("gmail_messages")
    .select(
      "id, account_id, gmail_id, thread_id, subject, sender, sender_email, snippet, body_text, label_ids, ai_category"
    )
    .eq("account_id", accountId)
    .contains("label_ids", ["INBOX"])
    .order("received_at", { ascending: false })
    .limit(max)

  if (onlyUncategorized) q = q.is("ai_category", null)

  const { data: rows, error } = await q
  if (error) {
    console.error("[gmail-ai] fetch messages failed", error)
    return result
  }

  const messages = (rows ?? []) as MessageRow[]
  if (messages.length === 0) return result

  // Cache label ids per category so we only hit findOrCreateLabel once each.
  const labelCache = new Map<AiCategory, string>()

  const batchSize = 10
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)

    const prompt = buildCategorizePrompt(
      batch.map((m, idx) => ({
        i: idx,
        sender: `${m.sender ?? ""}${m.sender_email ? ` <${m.sender_email}>` : ""}`.trim(),
        subject: m.subject ?? "",
        snippet: (m.snippet ?? m.body_text ?? "").slice(0, 400),
      }))
    )

    let parsed: unknown = null
    try {
      const raw = await generateText(prompt)
      parsed = extractJsonArray(raw)
    } catch (err) {
      console.error("[gmail-ai] gemini call failed", err)
      result.errors += batch.length
      continue
    }

    if (!Array.isArray(parsed)) {
      console.error("[gmail-ai] could not parse gemini output as JSON array")
      result.errors += batch.length
      continue
    }

    // Map i -> category
    const catByIndex = new Map<number, AiCategory>()
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue
      const rec = entry as Record<string, unknown>
      const idx = typeof rec.i === "number" ? rec.i : Number(rec.i)
      if (!Number.isFinite(idx)) continue
      catByIndex.set(idx, normalizeCategory(rec.category))
    }

    for (let k = 0; k < batch.length; k++) {
      const row = batch[k]
      const category = catByIndex.get(k) ?? "Other"

      try {
        // Ensure the Gmail label exists and is cached.
        let labelId = labelCache.get(category)
        if (!labelId) {
          const label = await findOrCreateLabel(token, `${LABEL_PREFIX}${category}`)
          labelId = label.id
          labelCache.set(category, labelId)
        }

        // Apply label in Gmail.
        await modifyMessage(token, row.gmail_id, [labelId], [])

        // Merge into local label_ids.
        const existingLabels = row.label_ids ?? []
        const mergedLabels = existingLabels.includes(labelId)
          ? existingLabels
          : [...existingLabels, labelId]

        // Update Supabase row.
        const { error: updateErr } = await supabase
          .from("gmail_messages")
          .update({
            ai_category: category,
            ai_categorized_at: new Date().toISOString(),
            label_ids: mergedLabels,
          })
          .eq("id", row.id)

        if (updateErr) {
          console.error("[gmail-ai] update row failed", updateErr)
          result.errors += 1
          continue
        }

        result.categorized += 1
        result.byCategory[category] = (result.byCategory[category] ?? 0) + 1
      } catch (err) {
        console.error("[gmail-ai] apply category failed", row.gmail_id, err)
        result.errors += 1
      }
    }
  }

  return result
}

/* ------------------------------------------------------------------ */
/*  draftReply                                                         */
/* ------------------------------------------------------------------ */

export async function draftReply(
  messageRowId: string,
  options: DraftReplyOptions = {}
): Promise<DraftReplyResult> {
  const tone = options.tone ?? "professional"
  const supabase = getAdmin()

  const { data: row, error: loadErr } = await supabase
    .from("gmail_messages")
    .select(
      "id, account_id, gmail_id, thread_id, subject, sender, sender_email, snippet, body_text, label_ids, ai_category"
    )
    .eq("id", messageRowId)
    .maybeSingle()

  if (loadErr || !row) {
    throw new Error("Message not found")
  }

  const message = row as MessageRow

  const account = await loadAccount(message.account_id)
  if (!account) throw new Error("Account not found for message")

  const token = await getValidAccessToken(account)

  const bodyOrSnippet = (message.body_text && message.body_text.trim().length > 0
    ? message.body_text
    : message.snippet ?? "").slice(0, 6000)

  const prompt = buildReplyPrompt({
    fromName: message.sender ?? "",
    fromEmail: message.sender_email ?? "",
    subject: message.subject ?? "",
    bodyOrSnippet,
    tone,
    instructions: options.instructions,
  })

  const replyRaw = await generateText(prompt)
  const replyText = (replyRaw ?? "").trim()

  const originalSubject = message.subject ?? ""
  const replySubject = /^re:/i.test(originalSubject.trim())
    ? originalSubject
    : `Re: ${originalSubject}`

  let gmailDraftId: string | null = null
  let gmailMessageId: string | null = null

  if (token && message.sender_email) {
    try {
      const raw = buildRawMessage({
        from: account.email,
        to: message.sender_email,
        subject: replySubject,
        body: replyText,
      })
      const created = await createDraft(token, raw, message.thread_id ?? undefined)
      gmailDraftId = created.id
      gmailMessageId = created.message?.id ?? null
    } catch (err) {
      console.error("[gmail-ai] createDraft failed", err)
      // Fall back to a local-only demo id so we still persist the draft.
      gmailDraftId = `demo_${crypto.randomUUID()}`
    }
  } else {
    // Demo account or no recipient — synthesize a local id.
    gmailDraftId = `demo_${crypto.randomUUID()}`
  }

  const { data: insertedDraft, error: insertErr } = await supabase
    .from("gmail_drafts")
    .insert({
      account_id: message.account_id,
      gmail_draft_id: gmailDraftId,
      gmail_message_id: gmailMessageId,
      thread_id: message.thread_id,
      to_addr: message.sender_email,
      subject: replySubject,
      body_text: replyText,
      in_reply_to_message_id: message.id,
      is_ai_generated: true,
      ai_tone: tone,
      ai_instructions: options.instructions ?? null,
    })
    .select("id")
    .single()

  if (insertErr || !insertedDraft) {
    throw new Error(`Failed to insert draft row: ${insertErr?.message ?? "unknown"}`)
  }

  return {
    draftId: insertedDraft.id as string,
    gmailDraftId,
    subject: replySubject,
    body: replyText,
  }
}
