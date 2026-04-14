import { redirect } from "next/navigation"
// HQ People group root — lands users on the Directory per SPACE_PATTERN.md.
// See suprans-hq-full-spec.md §2.
export default function HqPeopleIndex() {
  redirect("/hq/people/directory")
}
