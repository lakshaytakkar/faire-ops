import { NextResponse } from "next/server"
import { fetchRecentDeployments, upsertDeploymentEvent } from "@/lib/vercel"

export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deployments = await fetchRecentDeployments(200)
  let ok = 0
  let failed = 0
  for (const dep of deployments) {
    const r = await upsertDeploymentEvent(dep)
    if (r.ok) ok += 1
    else failed += 1
  }
  return NextResponse.json({ ok: true, processed: deployments.length, upserted: ok, failed })
}
