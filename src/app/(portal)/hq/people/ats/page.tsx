import { redirect } from "next/navigation"

// ATS moved to /hq/hiring. Old bookmarks redirect so nothing 404s.
export default function AtsDashboardRedirect() {
  redirect("/hq/hiring")
}
