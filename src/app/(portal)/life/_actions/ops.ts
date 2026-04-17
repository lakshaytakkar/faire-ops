"use server"

import { revalidatePath } from "next/cache"
import { lifeAdmin, type ActionResult } from "./_client"

export async function toggleAppFavorite(id: string, value: boolean): Promise<ActionResult> {
  try {
    const { error } = await lifeAdmin().from("apps").update({ is_favorite: value }).eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/workspace/stack")
    return { ok: true, id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "toggle failed" }
  }
}
