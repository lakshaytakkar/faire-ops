"use server"

import { revalidatePath } from "next/cache"
import { usdropAdmin, type ActionResult } from "./_client"

/* ------------------------------------------------------------------ */
/*  Course CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function createCourse(
  data: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const { data: row, error } = await usdropAdmin()
      .from("courses")
      .insert(data)
      .select("id")
      .single()
    if (error) return { ok: false, error: error.message }
    revalidatePath("/usdrop/courses")
    return { ok: true, id: row.id as string }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateCourse(
  id: string,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("courses")
      .update(patch)
      .eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/usdrop/courses/${id}`)
    revalidatePath("/usdrop/courses")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()
    // Delete modules first (cascade)
    await admin.from("course_modules").delete().eq("course_id", id)
    const { error } = await admin.from("courses").delete().eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath("/usdrop/courses")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/* ------------------------------------------------------------------ */
/*  Module CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function createModule(
  courseId: string,
  data: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const { data: row, error } = await usdropAdmin()
      .from("course_modules")
      .insert({ ...data, course_id: courseId })
      .select("id")
      .single()
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/usdrop/courses/${courseId}`)
    revalidatePath(`/usdrop/courses/${courseId}/builder`)
    return { ok: true, id: row.id as string }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function updateModule(
  id: string,
  courseId: string,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("course_modules")
      .update(patch)
      .eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/usdrop/courses/${courseId}`)
    revalidatePath(`/usdrop/courses/${courseId}/builder`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function deleteModule(
  id: string,
  courseId: string,
): Promise<ActionResult> {
  try {
    const { error } = await usdropAdmin()
      .from("course_modules")
      .delete()
      .eq("id", id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/usdrop/courses/${courseId}`)
    revalidatePath(`/usdrop/courses/${courseId}/builder`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}

export async function reorderModules(
  courseId: string,
  moduleIds: string[],
): Promise<ActionResult> {
  try {
    const admin = usdropAdmin()
    const updates = moduleIds.map((id, idx) =>
      admin
        .from("course_modules")
        .update({ order_index: idx })
        .eq("id", id),
    )
    const results = await Promise.all(updates)
    const firstError = results.find((r) => r.error)
    if (firstError?.error) return { ok: false, error: firstError.error.message }
    revalidatePath(`/usdrop/courses/${courseId}`)
    revalidatePath(`/usdrop/courses/${courseId}/builder`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" }
  }
}
