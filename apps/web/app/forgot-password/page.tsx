import type { Metadata } from "next"
import { AuthForm } from "@/features/auth/auth-form"

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
}

export default function Page() {
  return <AuthForm mode="forgot" />
}
