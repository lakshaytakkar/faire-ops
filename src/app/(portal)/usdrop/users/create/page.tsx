import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createUser } from "../../_actions/user-actions"

export const metadata = { title: "Create User — USDrop | Suprans" }

export default function CreateUserPage() {
  async function handleCreate(formData: FormData) {
    "use server"
    const email = formData.get("email") as string
    const full_name = formData.get("full_name") as string
    const phone_number = (formData.get("phone_number") as string) || undefined
    const account_type = (formData.get("account_type") as string) || "free"

    if (!email || !full_name) return

    const result = await createUser({ email, full_name, phone_number, account_type })
    if (result.ok) redirect("/usdrop/users")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link href="/usdrop/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <h1 className="text-2xl font-bold font-heading">Create User</h1>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-6 max-w-lg">
        <form action={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email <span className="text-destructive">*</span></label>
            <input id="email" name="email" type="email" required placeholder="user@example.com" className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium mb-1.5">Full Name <span className="text-destructive">*</span></label>
            <input id="full_name" name="full_name" type="text" required placeholder="John Doe" className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium mb-1.5">Phone Number</label>
            <input id="phone_number" name="phone_number" type="text" placeholder="+91..." className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="account_type" className="block text-sm font-medium mb-1.5">Account Type</label>
            <select id="account_type" name="account_type" defaultValue="free" className="w-full h-9 rounded-md border bg-background px-3 text-sm">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Create User
            </button>
            <Link href="/usdrop/users" className="h-9 px-5 rounded-md border text-sm font-medium inline-flex items-center hover:bg-muted/40 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
