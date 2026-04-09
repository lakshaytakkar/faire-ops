import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, cc, subject, body: emailBody, accountId } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: "Missing required fields: to, subject, body" }, { status: 400 })
    }

    // TODO: integrate with Gmail API to actually send
    // For now, return success as a placeholder
    console.log("[Gmail Send] Placeholder —", { to, cc, subject, accountId })

    return NextResponse.json({ success: true, message: "Email queued (placeholder)" })
  } catch (err) {
    console.error("[Gmail Send] Error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
