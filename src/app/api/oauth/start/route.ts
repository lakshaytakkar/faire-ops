import { NextResponse } from "next/server"
import crypto from "crypto"

/**
 * Initiates the Faire OAuth flow
 * Add ?disabled=true to save the store as inactive (grayed out)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const appId = process.env.FAIRE_NEW_APP_ID ?? ""
  const disabled = url.searchParams.get("disabled") === "true"
  const redirectUrl = process.env.FAIRE_OAUTH_REDIRECT_URL ?? `${url.origin}/api/oauth/callback`

  if (!appId) {
    return NextResponse.json({ error: "FAIRE_NEW_APP_ID env var required" }, { status: 500 })
  }

  // Encode disabled flag in state so callback can read it
  const stateData = JSON.stringify({ csrf: crypto.randomBytes(16).toString("hex"), disabled })
  const state = Buffer.from(stateData).toString("base64url")

  const scopes = [
    "READ_PRODUCTS", "WRITE_PRODUCTS",
    "READ_ORDERS", "WRITE_ORDERS",
    "READ_BRAND", "READ_RETAILER",
    "READ_INVENTORIES", "WRITE_INVENTORIES",
    "READ_SHIPMENTS", "READ_REVIEWS",
  ]

  const oauthUrl = new URL("https://faire.com/oauth2/authorize")
  oauthUrl.searchParams.set("applicationId", appId)
  oauthUrl.searchParams.set("state", state)
  oauthUrl.searchParams.set("redirectUrl", redirectUrl)
  for (const scope of scopes) {
    oauthUrl.searchParams.append("scope", scope)
  }

  return NextResponse.redirect(oauthUrl.toString())
}
