import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getHqAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { db: { schema: "hq" } },
  )
}

const PERFORMANCE_VALUES = new Set(["dark_green", "green", "yellow", "red"])
const STATUS_VALUES = new Set([
  "active",
  "probation",
  "onboarding",
  "on_leave",
  "notice_period",
  "resigned",
  "terminated",
  "offboarded",
])

type PatchBody = {
  performance_tag?: string | null
  status?: string | null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as PatchBody

    const update: Record<string, unknown> = {}

    if ("performance_tag" in body) {
      const tag = body.performance_tag
      if (tag !== null && tag !== undefined && !PERFORMANCE_VALUES.has(tag)) {
        return NextResponse.json({ error: "Invalid performance_tag" }, { status: 400 })
      }
      update.performance_tag = tag ?? null
    }

    if ("status" in body) {
      const status = body.status
      if (status !== null && status !== undefined && !STATUS_VALUES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      update.status = status ?? null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
    }

    const supabase = getHqAdmin()
    const { data, error } = await supabase
      .from("employees")
      .update(update)
      .eq("id", id)
      .select("id, performance_tag, status")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, employee: data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
