import { redirect } from "next/navigation"

// Legacy route — /development is now the canonical overview. Kept so old
// bookmarks and external links don't 404.
export default function DevelopmentOverviewRedirect() {
  redirect("/development")
}
