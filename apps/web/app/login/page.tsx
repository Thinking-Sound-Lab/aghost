import type { Metadata } from "next"
import { SignIn } from "@/features/auth/sign-in"
import { billingChoice } from "@workspace/api/contract"

export const metadata: Metadata = {
  title: "Log in or sign up",
  description:
    "Log in or sign up to aghost with Google, and turn Instagram comments into DMs.",
  alternates: { canonical: "/login" },
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    next?: string
    plan?: string
    interval?: string
  }>
}) {
  const query = await searchParams
  const { error, next } = query
  return (
    <SignIn
      billing={next === "billing"}
      choice={next === "billing" ? billingChoice(query) : null}
      error={
        error === "google" ? "Google sign-in did not finish. Try again." : null
      }
    />
  )
}
