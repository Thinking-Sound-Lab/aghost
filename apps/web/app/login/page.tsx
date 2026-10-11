import type { Metadata } from "next"
import { SignIn } from "@/features/auth/sign-in"

export const metadata: Metadata = {
  title: "Log in or sign up",
  description:
    "Log in or sign up to aghost with Google, and turn Instagram comments into DMs.",
  alternates: { canonical: "/login" },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <SignIn
      error={
        error === "google" ? "Google sign-in did not finish. Try again." : null
      }
    />
  )
}
