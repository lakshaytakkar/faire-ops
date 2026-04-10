import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture: string
}

/**
 * Google OAuth callback handler.
 * Exchanges the authorization code for access + refresh tokens, fetches the
 * user profile, and stores the credentials in the gmail_accounts table.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const stateFromUrl = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/workspace/gmail?oauth_error=${encodeURIComponent(errorParam)}`, url.origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/workspace/gmail?oauth_error=missing_code", url.origin)
    )
  }

  // Verify CSRF state
  const cookieHeader = request.headers.get("cookie") ?? ""
  const stateCookie = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((c) => c.startsWith("gmail_oauth_state="))
    ?.split("=")[1]

  if (!stateCookie || stateCookie !== stateFromUrl) {
    return NextResponse.redirect(
      new URL("/workspace/gmail?oauth_error=state_mismatch", url.origin)
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? ""
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ""
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URL ?? `${url.origin}/api/gmail/oauth/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/workspace/gmail?oauth_error=missing_env", url.origin)
    )
  }

  try {
    // Exchange the code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    })

    const tokenData: GoogleTokenResponse = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Gmail OAuth] token exchange failed", tokenData)
      return NextResponse.redirect(
        new URL("/workspace/gmail?oauth_error=token_exchange_failed", url.origin)
      )
    }

    // Fetch user profile
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    const profile: GoogleUserInfo = await profileRes.json()
    if (!profileRes.ok || !profile.email) {
      console.error("[Gmail OAuth] profile fetch failed", profile)
      return NextResponse.redirect(
        new URL("/workspace/gmail?oauth_error=profile_failed", url.origin)
      )
    }

    const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    const supabase = getSupabase()

    // Upsert account by email
    const { data: existing } = await supabase
      .from("gmail_accounts")
      .select("id, refresh_token, is_primary")
      .eq("email", profile.email)
      .maybeSingle()

    if (existing) {
      await supabase
        .from("gmail_accounts")
        .update({
          display_name: profile.name,
          access_token: tokenData.access_token,
          // Google only returns refresh_token on first consent. Keep the old one if absent.
          refresh_token: tokenData.refresh_token ?? existing.refresh_token,
          token_expiry: expiry,
          profile_photo: profile.picture,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      // First account becomes primary
      const { count } = await supabase
        .from("gmail_accounts")
        .select("*", { count: "exact", head: true })

      await supabase.from("gmail_accounts").insert({
        email: profile.email,
        display_name: profile.name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        token_expiry: expiry,
        profile_photo: profile.picture,
        is_primary: (count ?? 0) === 0,
        is_active: true,
        total_messages: 0,
        unread_count: 0,
        last_synced_at: new Date().toISOString(),
      })
    }

    const res = NextResponse.redirect(
      new URL(
        `/workspace/gmail?oauth=success&email=${encodeURIComponent(profile.email)}`,
        url.origin
      )
    )
    res.cookies.delete("gmail_oauth_state")
    return res
  } catch (err) {
    console.error("[Gmail OAuth] callback error", err)
    return NextResponse.redirect(
      new URL("/workspace/gmail?oauth_error=server_error", url.origin)
    )
  }
}
