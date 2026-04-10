import { NextResponse } from "next/server"

export const maxDuration = 300

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Call the main sync route internally
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  const res = await fetch(`${baseUrl}/api/qa/sync?days=2`, { method: "POST" })
  const data = await res.json()

  return NextResponse.json({
    success: res.ok,
    triggered_at: new Date().toISOString(),
    result: data,
  })
}
