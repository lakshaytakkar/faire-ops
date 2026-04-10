import { NextRequest, NextResponse } from "next/server"
import { categorizeMessages } from "@/lib/gmail-ai"
import { createClient } from "@supabase/supabase-js"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 300

/**
 * POST /api/gmail/ai/categorize
 * Body: { accountId?: string, max?: number, onlyUncategorized?: boolean }
 *
 * Classifies recent INBOX messages into the fixed AI category taxonomy and
 * applies `TeamSync/<Category>` Gmail labels. If `accountId` is omitted we
 * fall back to the primary account.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let accountId: string | undefined = body.accountId
    const max: number | undefined = body.max
    const onlyUncategorized: boolean | undefined = body.onlyUncategorized

    if (!accountId) {
      const { data } = await getAdmin()
        .from("gmail_accounts")
        .select("id")
        .eq("is_active", true)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle()
      accountId = (data?.id as string | undefined) ?? undefined
    }

    if (!accountId) {
      return NextResponse.json({ error: "No Gmail account found" }, { status: 404 })
    }

    const result = await categorizeMessages(accountId, {
      max,
      onlyUncategorized,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("[api/gmail/ai/categorize] error", err)
    return NextResponse.json(
      { error: (err as Error).message ?? "Categorize failed" },
      { status: 500 }
    )
  }
}
