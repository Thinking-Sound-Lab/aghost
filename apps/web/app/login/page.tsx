import type { Metadata } from "next"
import { SignIn } from "@/features/auth/sign-in"
import { billingChoice } from "@workspace/api/contract"

export const metadata: Metadata = {
  title: "Log in or sign up",
  description:
    "Sign in to aghost with Google and let your AI agent manage Instagram DM automations, inbox conversations, and activity.",
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
    request?: string
    link?: string
  }>
}) {
  const query = await searchParams
  const { error, next, request, link } = query
  return (
    <SignIn
      returnTo={
        next === "billing"
          ? { next, ...billingChoice(query) }
          : next === "authorize" && request
            ? { next, request }
            : next === "upload" && link
              ? { next, link }
              : null
      }
      error={
        error === "google" ? "Google sign-in did not finish. Try again." : null
      }
    />
  )
}
