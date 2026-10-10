import type { Metadata } from "next"
import { AuthForm } from "@/features/auth/auth-form"

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create an aghost account and turn Instagram comments into DMs, automatically.",
  alternates: { canonical: "/signup" },
}

export default function Page() {
  return <AuthForm mode="signup" />
}
