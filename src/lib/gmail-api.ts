/**
 * Gmail API v1 client.
 *
 * Wraps https://gmail.googleapis.com/gmail/v1/users/me/* with:
 *   - automatic OAuth access-token refresh
 *   - retry on 429/5xx with exponential backoff
 *   - typed helpers for the endpoints we use
 *   - MIME parsing for message bodies
 *
 * Reference: https://developers.google.com/workspace/gmail/api/reference/rest
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GmailAccountRow {
  id: string
  email: string
  display_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  history_id: string | null
}

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailPart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { size?: number; data?: string; attachmentId?: string }
  parts?: GmailPart[]
}

export interface GmailMessageResource {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  historyId?: string
  internalDate?: string
  payload?: GmailPart
  sizeEstimate?: number
  raw?: string
}

export interface GmailListResponse {
  messages?: { id: string; threadId: string }[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

export interface ParsedMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  historyId: string | null
  internalDate: Date | null
  subject: string
  fromName: string
  fromEmail: string
  to: string
  cc: string
  bcc: string
  bodyText: string
  bodyHtml: string
  hasAttachment: boolean
  isRead: boolean
  isStarred: boolean
}

/* ------------------------------------------------------------------ */
/*  Supabase admin client                                              */
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
/*  OAuth token refresh                                                */
/* ------------------------------------------------------------------ */

/**
 * Returns a valid access token for the given account, refreshing it
 * (and persisting the new value) if expired or close to expiring.
 */
export async function getValidAccessToken(account: GmailAccountRow): Promise<string | null> {
  if (!account.access_token) return null

  const expiresAtMs = account.token_expiry ? new Date(account.token_expiry).getTime() : 0
  const isExpired = expiresAtMs - Date.now() < 60_000 // 1 min skew

  if (!isExpired) return account.access_token
  if (!account.refresh_token) return null

  const clientId = process.env.GOOGLE_CLIENT_ID ?? ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ""
  if (!clientId || !clientSecret) return null

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    console.error("[gmail-api] refresh failed", data)
    // If the refresh token is revoked, mark the account inactive so the UI
    // can prompt re-connection.
    if (data.error === "invalid_grant") {
      await getAdmin()
        .from("gmail_accounts")
        .update({ is_active: false, access_token: null, refresh_token: null })
        .eq("id", account.id)
    }
    return null
  }

  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
  await getAdmin()
    .from("gmail_accounts")
    .update({ access_token: data.access_token, token_expiry: expiry })
    .eq("id", account.id)

  return data.access_token as string
}

/**
 * Loads a gmail_accounts row by id (or the primary account if id is null).
 */
export async function loadAccount(accountId?: string | null): Promise<GmailAccountRow | null> {
  let q = getAdmin()
    .from("gmail_accounts")
    .select("id, email, display_name, access_token, refresh_token, token_expiry, history_id")
    .eq("is_active", true)
    .limit(1)

  q = accountId ? q.eq("id", accountId) : q.eq("is_primary", true)
  const { data } = await q
  return (data?.[0] as GmailAccountRow) ?? null
}

/* ------------------------------------------------------------------ */
/*  Fetch wrapper with retry                                           */
/* ------------------------------------------------------------------ */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

interface GmailFetchOpts {
  method?: string
  query?: Record<string, string | number | string[] | undefined>
  body?: unknown
  retries?: number
}

export class GmailApiError extends Error {
  status: number
  details: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Authorized request to the Gmail API with retry on 429 and 5xx.
 * Throws GmailApiError on non-2xx after retries are exhausted.
 */
export async function gmailFetch<T = unknown>(
  token: string,
  path: string,
  opts: GmailFetchOpts = {}
): Promise<T> {
  const url = new URL(`${GMAIL_BASE}${path}`)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v == null) continue
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item))
      } else {
        url.searchParams.set(k, String(v))
      }
    }
  }

  const maxRetries = opts.retries ?? 3
  let attempt = 0
  while (true) {
    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })

    if (res.status === 204) return undefined as T

    if (res.ok) {
      return (await res.json()) as T
    }

    // Retry on 429 / 5xx
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const backoff = Math.min(8000, 500 * Math.pow(2, attempt)) + Math.random() * 250
      await sleep(backoff)
      attempt++
      continue
    }

    let details: unknown
    try { details = await res.json() } catch { /* ignore */ }
    throw new GmailApiError(res.status, `Gmail ${res.status} on ${path}`, details)
  }
}

/* ------------------------------------------------------------------ */
/*  MIME parsing                                                       */
/* ------------------------------------------------------------------ */

function decodeBase64Url(input: string): string {
  if (!input) return ""
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
  try {
    return Buffer.from(padded, "base64").toString("utf-8")
  } catch {
    return ""
  }
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return ""
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value ?? ""
}

/**
 * Walks a Gmail payload (which can be deeply nested multipart) and pulls
 * out the text/plain body, text/html body, and an attachment flag.
 */
function walkParts(part: GmailPart | undefined, acc: { text: string; html: string; attach: boolean }) {
  if (!part) return
  const mime = (part.mimeType ?? "").toLowerCase()
  const isAttachment = !!part.filename && part.filename.length > 0
  if (isAttachment) acc.attach = true

  if (mime === "text/plain" && !isAttachment && part.body?.data) {
    acc.text += decodeBase64Url(part.body.data)
  } else if (mime === "text/html" && !isAttachment && part.body?.data) {
    acc.html += decodeBase64Url(part.body.data)
  }

  if (part.parts && part.parts.length > 0) {
    for (const child of part.parts) walkParts(child, acc)
  }
}

/**
 * Parses a raw Gmail message resource into a flat shape we can store
 * in Supabase.
 */
export function parseMessage(msg: GmailMessageResource): ParsedMessage {
  const headers = msg.payload?.headers
  const subject = getHeader(headers, "Subject")
  const from = getHeader(headers, "From")
  const to = getHeader(headers, "To")
  const cc = getHeader(headers, "Cc")
  const bcc = getHeader(headers, "Bcc")

  // "Name <email@x.com>" or just "email@x.com"
  const fromMatch = from.match(/^\s*"?([^"<]*?)"?\s*<(.+?)>\s*$/)
  const fromName = (fromMatch ? fromMatch[1].trim() : from.split("@")[0]).trim() || from
  const fromEmail = (fromMatch ? fromMatch[2] : from).trim()

  const acc = { text: "", html: "", attach: false }
  walkParts(msg.payload, acc)

  // Some messages put the body directly on payload (no parts)
  if (!acc.text && !acc.html && msg.payload?.body?.data) {
    const decoded = decodeBase64Url(msg.payload.body.data)
    if ((msg.payload.mimeType ?? "").includes("html")) acc.html = decoded
    else acc.text = decoded
  }

  const labelIds = msg.labelIds ?? []
  const internalDate = msg.internalDate ? new Date(parseInt(msg.internalDate, 10)) : null

  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds,
    snippet: msg.snippet ?? "",
    historyId: msg.historyId ?? null,
    internalDate,
    subject,
    fromName,
    fromEmail,
    to,
    cc,
    bcc,
    bodyText: acc.text,
    bodyHtml: acc.html,
    hasAttachment: acc.attach,
    isRead: !labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
  }
}

/* ------------------------------------------------------------------ */
/*  Endpoint helpers                                                   */
/* ------------------------------------------------------------------ */

/** users.getProfile */
export async function getProfile(token: string) {
  return gmailFetch<{
    emailAddress: string
    messagesTotal: number
    threadsTotal: number
    historyId: string
  }>(token, "/profile")
}

/** users.messages.list */
export async function listMessages(
  token: string,
  opts: { q?: string; labelIds?: string[]; pageToken?: string; maxResults?: number } = {}
) {
  return gmailFetch<GmailListResponse>(token, "/messages", {
    query: {
      q: opts.q,
      labelIds: opts.labelIds,
      pageToken: opts.pageToken,
      maxResults: opts.maxResults ?? 50,
    },
  })
}

/** users.messages.get */
export async function getMessage(
  token: string,
  id: string,
  format: "minimal" | "full" | "metadata" | "raw" = "full"
) {
  return gmailFetch<GmailMessageResource>(token, `/messages/${id}`, {
    query: { format },
  })
}

/** users.messages.modify */
export async function modifyMessage(
  token: string,
  id: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
) {
  return gmailFetch<GmailMessageResource>(token, `/messages/${id}/modify`, {
    method: "POST",
    body: { addLabelIds, removeLabelIds },
  })
}

/** users.messages.batchModify */
export async function batchModify(
  token: string,
  ids: string[],
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
) {
  return gmailFetch<void>(token, `/messages/batchModify`, {
    method: "POST",
    body: { ids, addLabelIds, removeLabelIds },
  })
}

/** users.messages.trash */
export async function trashMessage(token: string, id: string) {
  return gmailFetch<GmailMessageResource>(token, `/messages/${id}/trash`, { method: "POST" })
}

/** users.messages.untrash */
export async function untrashMessage(token: string, id: string) {
  return gmailFetch<GmailMessageResource>(token, `/messages/${id}/untrash`, { method: "POST" })
}

/** users.messages.delete (permanent — use sparingly) */
export async function deleteMessage(token: string, id: string) {
  return gmailFetch<void>(token, `/messages/${id}`, { method: "DELETE" })
}

/** users.messages.send — pass threadId to thread a reply into an existing conversation. */
export async function sendMessage(token: string, raw: string, threadId?: string) {
  const message: { raw: string; threadId?: string } = { raw }
  if (threadId) message.threadId = threadId
  return gmailFetch<{ id: string; threadId: string; labelIds?: string[] }>(
    token,
    `/messages/send`,
    { method: "POST", body: message }
  )
}

/** users.labels.list */
export async function listLabels(token: string) {
  return gmailFetch<{ labels: { id: string; name: string; type: string }[] }>(token, "/labels")
}

/* ------------------------------------------------------------------ */
/*  MIME builder                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build an RFC 2822 message and base64url-encode it for the Gmail API.
 */
export function buildRawMessage(opts: {
  from: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
  html?: boolean
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : null,
    opts.bcc ? `Bcc: ${opts.bcc}` : null,
    `Subject: ${opts.subject}`,
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : null,
    opts.references ? `References: ${opts.references}` : null,
    "MIME-Version: 1.0",
    `Content-Type: ${opts.html ? "text/html" : "text/plain"}; charset=UTF-8`,
    "Content-Transfer-Encoding: 7bit",
  ]
    .filter(Boolean)
    .join("\r\n")

  const message = `${headers}\r\n\r\n${opts.body}`
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/* ------------------------------------------------------------------ */
/*  High-level: pull recent messages and persist                       */
/* ------------------------------------------------------------------ */

/**
 * Persists a parsed Gmail message into Supabase. Upserts on (account_id, gmail_id).
 */
export async function upsertParsedMessage(accountId: string, parsed: ParsedMessage) {
  const supabase = getAdmin()
  await supabase.from("gmail_messages").upsert(
    {
      account_id: accountId,
      gmail_id: parsed.id,
      thread_id: parsed.threadId,
      subject: parsed.subject,
      sender: parsed.fromName,
      sender_email: parsed.fromEmail,
      recipients: parsed.to,
      snippet: parsed.snippet,
      body_text: parsed.bodyText || parsed.snippet,
      body_html: parsed.bodyHtml,
      label_ids: parsed.labelIds,
      is_read: parsed.isRead,
      is_starred: parsed.isStarred,
      has_attachment: parsed.hasAttachment,
      received_at: parsed.internalDate?.toISOString() ?? null,
      internal_date: parsed.internalDate?.toISOString() ?? null,
    },
    { onConflict: "account_id,gmail_id" }
  )
}

/**
 * Updates the cached read/star/labels state of a message in Supabase.
 * Used after a successful Gmail modify call.
 */
export async function syncLocalLabels(
  accountId: string,
  gmailId: string,
  labelIds: string[]
) {
  const supabase = getAdmin()
  await supabase
    .from("gmail_messages")
    .update({
      label_ids: labelIds,
      is_read: !labelIds.includes("UNREAD"),
      is_starred: labelIds.includes("STARRED"),
    })
    .eq("account_id", accountId)
    .eq("gmail_id", gmailId)
}

/**
 * Deletes a cached message row in Supabase. Used when the user permanently deletes.
 */
export async function deleteLocalMessage(accountId: string, gmailId: string) {
  await getAdmin()
    .from("gmail_messages")
    .delete()
    .eq("account_id", accountId)
    .eq("gmail_id", gmailId)
}

/* ------------------------------------------------------------------ */
/*  Drafts                                                             */
/* ------------------------------------------------------------------ */

export interface GmailDraftResource {
  id: string
  message: GmailMessageResource
}

export interface GmailDraftListResponse {
  drafts?: { id: string; message: { id: string; threadId: string } }[]
  nextPageToken?: string
  resultSizeEstimate?: number
}

/**
 * users.drafts.create — creates a new draft from a base64url-encoded raw MIME
 * message. Pass threadId to attach the draft to an existing conversation so
 * that sending it lands as a threaded reply.
 */
export async function createDraft(token: string, raw: string, threadId?: string) {
  const message: { raw: string; threadId?: string } = { raw }
  if (threadId) message.threadId = threadId
  return gmailFetch<GmailDraftResource>(token, `/drafts`, {
    method: "POST",
    body: { message },
  })
}

/** users.drafts.get — fetches a single draft, optionally in a specific format. */
export async function getDraft(
  token: string,
  draftId: string,
  format: "minimal" | "full" | "metadata" | "raw" = "full"
) {
  return gmailFetch<GmailDraftResource>(token, `/drafts/${draftId}`, {
    query: { format },
  })
}

/**
 * users.drafts.update — replaces the raw content of an existing draft.
 * threadId is optional and behaves the same as createDraft.
 */
export async function updateDraft(
  token: string,
  draftId: string,
  raw: string,
  threadId?: string
) {
  const message: { raw: string; threadId?: string } = { raw }
  if (threadId) message.threadId = threadId
  return gmailFetch<GmailDraftResource>(token, `/drafts/${draftId}`, {
    method: "PUT",
    body: { message },
  })
}

/** users.drafts.delete — permanently deletes a draft. */
export async function deleteDraft(token: string, draftId: string) {
  return gmailFetch<void>(token, `/drafts/${draftId}`, { method: "DELETE" })
}

/**
 * users.drafts.send — sends an existing draft. Returns the sent message
 * resource (id, threadId, labelIds).
 */
export async function sendDraft(token: string, draftId: string) {
  return gmailFetch<{ id: string; threadId: string; labelIds?: string[] }>(
    token,
    `/drafts/send`,
    { method: "POST", body: { id: draftId } }
  )
}

/** users.drafts.list — lists drafts for the authenticated user, with pagination. */
export async function listDrafts(
  token: string,
  opts: { pageToken?: string; maxResults?: number } = {}
) {
  return gmailFetch<GmailDraftListResponse>(token, `/drafts`, {
    query: {
      pageToken: opts.pageToken,
      maxResults: opts.maxResults ?? 50,
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Labels                                                             */
/* ------------------------------------------------------------------ */

export interface GmailLabelResource {
  id: string
  name: string
  type?: string
  messageListVisibility?: string
  labelListVisibility?: string
}

/**
 * users.labels.create — creates a user label. Defaults to showing the label
 * in both the message list and the label list unless overridden.
 */
export async function createLabel(
  token: string,
  name: string,
  opts: {
    messageListVisibility?: "show" | "hide"
    labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide"
  } = {}
) {
  return gmailFetch<GmailLabelResource>(token, `/labels`, {
    method: "POST",
    body: {
      name,
      messageListVisibility: opts.messageListVisibility ?? "show",
      labelListVisibility: opts.labelListVisibility ?? "labelShow",
    },
  })
}

/**
 * Looks up a label by (case-insensitive) name, creating it if it doesn't
 * already exist. Useful for AI categorization flows that want to ensure a
 * category label exists before applying it to a message.
 */
export async function findOrCreateLabel(token: string, name: string) {
  const { labels } = await listLabels(token)
  const existing = (labels ?? []).find(
    (l) => l.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) return existing as GmailLabelResource
  return createLabel(token, name)
}
