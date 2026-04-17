import { NextResponse } from "next/server"
import { upsertDeploymentEvent, verifyWebhookSignature } from "@/lib/vercel"

export const runtime = "nodejs"
export const maxDuration = 30

type VercelWebhookPayload = {
  type?: string
  payload?: {
    deployment?: Record<string, unknown>
    project?: { name?: string }
    team?: { id?: string }
  }
}

export async function POST(request: Request) {
  const raw = await request.text()
  const sig = request.headers.get("x-vercel-signature")
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let body: VercelWebhookPayload
  try {
    body = JSON.parse(raw) as VercelWebhookPayload
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }

  const type = body.type ?? ""
  if (!type.startsWith("deployment.")) {
    return NextResponse.json({ ok: true, skipped: type })
  }

  const dep = body.payload?.deployment
  if (!dep) return NextResponse.json({ ok: true, skipped: "no-deployment" })

  const merged = {
    ...dep,
    name: (dep as { name?: string }).name ?? body.payload?.project?.name,
  }
  const result = await upsertDeploymentEvent(merged)
  return NextResponse.json({ ok: result.ok, type, result })
}
