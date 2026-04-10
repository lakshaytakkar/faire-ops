import { NextResponse } from "next/server"
import crypto from "crypto"

/**
 * Initiates the Google OAuth flow for Gmail account connection.
 * Redirects the user to Google's consent screen with the Gmail scopes
 * we need to read + send email on their behalf.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URL  (e.g. https://faire-ops-flax.vercel.app/api/gmail/oauth/callback)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ""
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URL ?? `${url.origin}/api/gmail/oauth/callback`

  if (!clientId) {
    return NextResponse.json(
      {
        error: "GOOGLE_CLIENT_ID env var missing",
        hint:
          "Create OAuth credentials at https://console.cloud.google.com/apis/credentials, " +
          "enable the Gmail API, add this URL as an Authorized redirect URI, " +
          "and set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in your environment.",
        redirectUri,
      },
      { status: 500 }
    )
  }

  // CSRF state — verified in callback
  const state = crypto.randomBytes(16).toString("hex")

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ]

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  oauthUrl.searchParams.set("client_id", clientId)
  oauthUrl.searchParams.set("redirect_uri", redirectUri)
  oauthUrl.searchParams.set("response_type", "code")
  oauthUrl.searchParams.set("scope", scopes.join(" "))
  oauthUrl.searchParams.set("access_type", "offline")
  oauthUrl.searchParams.set("prompt", "consent")
  oauthUrl.searchParams.set("include_granted_scopes", "true")
  oauthUrl.searchParams.set("state", state)

  const res = NextResponse.redirect(oauthUrl.toString())
  // Persist state in a short-lived cookie so the callback can verify it
  res.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
  return res
}
