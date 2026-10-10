import { AuthForm } from "@/features/auth/auth-form"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <AuthForm
      mode="login"
      initialError={
        error === "confirmation"
          ? "The email link is invalid or expired. Request a new link or log in."
          : undefined
      }
    />
  )
}
