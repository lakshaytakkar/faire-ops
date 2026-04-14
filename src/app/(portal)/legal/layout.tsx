export const metadata = {
  title: "Legal | Suprans",
};

// Pass-through. Shell is rendered by src/app/(portal)/layout.tsx.
// See SPACE_PATTERN.md §2.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
