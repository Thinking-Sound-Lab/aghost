import { buttonVariants } from "@workspace/ui/components/button"
import { Brand } from "@/components/brand"
import { Google } from "@/components/google-icon"
import { ErrorBanner } from "@/components/interface"
import { api } from "@/lib/api"
import type { ChoosePlanInput } from "@workspace/api/contract"

export function SignIn({
  error,
  billing = false,
  choice = null,
}: {
  error: string | null
  billing?: boolean
  choice?: ChoosePlanInput | null
}) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="grid w-full max-w-sm gap-5">
        <Brand />
        <h1 className="text-xl font-semibold tracking-tight">
          Log in or sign up
        </h1>
        <ErrorBanner message={error} />
        {/* A full navigation: the API sends the browser to Google and back. */}
        <a
          href={`${api.auth.googleSignInUrl}${billing ? `?${new URLSearchParams({ next: "billing", ...choice })}` : ""}`}
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          <Google size={16} />
          Continue with Google
        </a>
      </div>
    </main>
  )
}
