import { SignIn } from "@/features/auth/sign-in"
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
