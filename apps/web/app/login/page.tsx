import { SignIn } from "@/features/auth/sign-in"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  return (
    <SignIn
      billing={next === "billing"}
      error={
        error === "google" ? "Google sign-in did not finish. Try again." : null
      }
    />
  )
}
