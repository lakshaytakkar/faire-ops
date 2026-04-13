import { redirect } from "next/navigation"

// HQ → Projects surfaces the global delivery portfolio (already built at
// /projects with list + detail routes). Rather than duplicate the page at
// /hq/projects, redirect so there's one canonical URL for the projects
// catalogue. The HQ top-nav still reads "Projects".
export default function HqProjectsPage() {
  redirect("/projects")
}
