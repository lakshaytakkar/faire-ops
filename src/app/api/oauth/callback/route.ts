import { NextResponse } from "next/server"
import { supabaseB2B } from "@/lib/supabase"

/**
 * OAuth callback handler for Faire
 * Faire redirects here with ?authorizationCode=XXX&state=YYY
 * We exchange the code for an access token and save it
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const authorizationCode = url.searchParams.get("authorizationCode")
  const stateRaw = url.searchParams.get("state") ?? ""

  // Decode state to check disabled flag
  let storeDisabled = false
  try {
    const stateData = JSON.parse(Buffer.from(stateRaw, "base64url").toString())
    storeDisabled = stateData.disabled === true
  } catch { /* state is plain string, not disabled */ }

  if (!authorizationCode) {
    return NextResponse.json({ error: "Missing authorizationCode" }, { status: 400 })
  }

  const appId = process.env.FAIRE_NEW_APP_ID ?? ""
  const appSecret = process.env.FAIRE_NEW_APP_SECRET ?? ""
  const redirectUrl = process.env.FAIRE_OAUTH_REDIRECT_URL ?? `${url.origin}/api/oauth/callback`

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "FAIRE_NEW_APP_ID and FAIRE_NEW_APP_SECRET env vars required" }, { status: 500 })
  }

  // Exchange authorization code for access token
  try {
    const tokenRes = await fetch("https://www.faire.com/api/external-api-oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_token: appId,
        application_secret: appSecret,
        redirect_url: redirectUrl,
        scope: [
          "READ_PRODUCTS", "WRITE_PRODUCTS",
          "READ_ORDERS", "WRITE_ORDERS",
          "READ_BRAND", "READ_RETAILER",
          "READ_INVENTORIES", "WRITE_INVENTORIES",
          "READ_SHIPMENTS", "READ_REVIEWS",
        ],
        grant_type: "AUTHORIZATION_CODE",
        authorization_code: authorizationCode,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({
        error: "Token exchange failed",
        details: tokenData,
        status: tokenRes.status,
      }, { status: 500 })
    }

    const oauthToken = tokenData.access_token
    const appCredentials = Buffer.from(`${appId}:${appSecret}`).toString("base64")

    // Fetch brand profile to get store name
    const profileRes = await fetch("https://www.faire.com/external-api/v2/brands/profile", {
      headers: {
        "X-FAIRE-OAUTH-ACCESS-TOKEN": oauthToken,
        "X-FAIRE-APP-CREDENTIALS": appCredentials,
        "Content-Type": "application/json",
      },
    })

    let storeName = "New Store"
    let brandData: Record<string, unknown> = {}
    if (profileRes.ok) {
      brandData = await profileRes.json()
      storeName = (brandData.name as string) ?? "New Store"
    }

    // Generate a color for the store
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"]
    const color = colors[Math.floor(Math.random() * colors.length)]

    // Insert or update store in DB
    const { data: existing } = await supabaseB2B
      .from("faire_stores")
      .select("id")
      .eq("oauth_token", oauthToken)
      .single()

    if (existing) {
      // Update existing
      await supabaseB2B.from("faire_stores").update({
        oauth_token: oauthToken,
        app_credentials: appCredentials,
        active: !storeDisabled,
      }).eq("id", existing.id)
    } else {
      // Insert new store
      const short = storeName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
      await supabaseB2B.from("faire_stores").insert({
        name: storeName,
        faire_store_id: (brandData.id as string) ?? `store_${Date.now()}`,
        oauth_token: oauthToken,
        app_credentials: appCredentials,
        color,
        short,
        category: (brandData.category as string) ?? "",
        active: !storeDisabled,
        total_orders: 0,
        total_products: 0,
      })
    }

    // Redirect to dashboard with success
    return NextResponse.redirect(new URL(`/dashboard?oauth=success&store=${encodeURIComponent(storeName)}`, url.origin))
  } catch (err) {
    return NextResponse.json({
      error: "OAuth flow failed",
      details: (err as Error).message,
    }, { status: 500 })
  }
}
