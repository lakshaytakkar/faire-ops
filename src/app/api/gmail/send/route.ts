import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

interface GmailAccountRow {
  id: string
  email: string
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
}

/**
 * Refresh an expired Google access token using the stored refresh token.
 * Returns the new access token (and persists it back to the row).
 */
async function refreshAccessToken(account: GmailAccountRow): Promise<string | null> {
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
    console.error("[Gmail Send] refresh failed", data)
    return null
  }

  const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString()
  await getSupabase()
    .from("gmail_accounts")
    .update({ access_token: data.access_token, token_expiry: expiry })
    .eq("id", account.id)

  return data.access_token as string
}

/**
 * Encode a MIME message in base64url for the Gmail API.
 */
function buildRawMessage(opts: {
  from: string
  to: string
  cc?: string
  subject: string
  body: string
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : null,
    `Subject: ${opts.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
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

export async function POST(req: NextRequest) {
  try {
    const { to, cc, subject, body: emailBody, accountId } = await req.json()

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Resolve the account — either explicit or the primary one
    let query = supabase
      .from("gmail_accounts")
      .select("id, email, access_token, refresh_token, token_expiry")
      .eq("is_active", true)
      .limit(1)

    query = accountId
      ? query.eq("id", accountId)
      : query.eq("is_primary", true)

    const { data: accounts } = await query
    const account = (accounts?.[0] ?? null) as GmailAccountRow | null

    if (!account || !account.access_token) {
      // Demo accounts (no real OAuth) — accept the send as a no-op so the UI works.
      console.log("[Gmail Send] No connected account, accepting as demo:", { to, subject })
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Saved locally (no Google account connected)",
      })
    }

    // Refresh token if expired
    let token = account.access_token
    const expired =
      account.token_expiry && new Date(account.token_expiry).getTime() < Date.now() + 60_000
    if (expired) {
      const refreshed = await refreshAccessToken(account)
      if (!refreshed) {
        return NextResponse.json(
          { error: "Token expired and refresh failed. Please reconnect the account." },
          { status: 401 }
        )
      }
      token = refreshed
    }

    const raw = buildRawMessage({
      from: account.email,
      to,
      cc,
      subject,
      body: emailBody,
    })

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    )

    const sendData = await sendRes.json()
    if (!sendRes.ok) {
      console.error("[Gmail Send] Gmail API error:", sendData)
      return NextResponse.json(
        { error: "Gmail API send failed", details: sendData },
        { status: sendRes.status }
      )
    }

    return NextResponse.json({ success: true, gmailId: sendData.id })
  } catch (err) {
    console.error("[Gmail Send] Error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
