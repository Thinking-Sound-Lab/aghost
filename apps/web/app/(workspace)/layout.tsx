import { WorkspaceShell } from "@/features/workspace/workspace-shell"
export const metadata = { robots: { index: false, follow: false } }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
