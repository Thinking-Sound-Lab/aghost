"use client"

import { useEffect, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Brand } from "@/components/brand"
import { ErrorBanner, Field } from "@/components/interface"
import { api } from "@/lib/api"
import { useAuthForm, useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

type Mode = "login" | "signup" | "forgot" | "reset"
const copy = {
  login: { title: "Log in", action: "Log in" },
  signup: { title: "Create your account", action: "Sign up" },
  forgot: { title: "Reset your password", action: "Send reset link" },
  reset: { title: "Choose a new password", action: "Save password" },
}

export function AuthForm({
  mode,
  initialError,
}: {
  mode: Mode
  initialError?: string
}) {
  const form = useAuthForm()
  const router = useRouter()
  useEffect(() => {
    form.reset()
    if (initialError) useAuthForm.setState({ error: initialError })
  }, [mode, initialError, form.reset])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.busy) return
    form.set({ busy: true, error: null, message: null })
    try {
      if (mode === "forgot") {
        await api.auth.resetPassword(form.email)
        form.set({ message: "Check your email for a password reset link." })
      } else if (mode === "reset") {
        await api.auth.updatePassword(form.password)
        router.replace("/home")
      } else if (mode === "signup") {
        const result = await api.auth.signUp({
          email: form.email,
          password: form.password,
        })
        if (result.needsConfirmation)
          form.set({
            message: "Check your email to confirm your account, then log in.",
          })
        else if (result.user) {
          useAuthStore.getState().setUser(result.user)
          useWorkspaceStore.getState().clear()
          router.replace("/home")
        }
      } else {
        const { user } = await api.auth.signIn({
          email: form.email,
          password: form.password,
        })
        useAuthStore.getState().setUser(user)
        useWorkspaceStore.getState().clear()
        router.replace("/home")
      }
    } catch (error) {
      form.set({
        error:
          error instanceof Error
            ? error.message
            : "Could not complete the request.",
      })
    } finally {
      form.set({ busy: false, password: "" })
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="grid w-full max-w-sm gap-5">
        <Brand />
        <h1 className="text-xl font-semibold tracking-tight">
          {copy[mode].title}
        </h1>
        <ErrorBanner message={form.error} />
        {form.message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {form.message}
          </p>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            {mode !== "reset" && (
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={(event) => form.set({ email: event.target.value })}
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field
                label={mode === "reset" ? "New password" : "Password"}
                hint={
                  mode === "signup" || mode === "reset"
                    ? "At least 8 characters"
                    : undefined
                }
              >
                <Input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  name="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={form.password}
                  onChange={(event) =>
                    form.set({ password: event.target.value })
                  }
                />
              </Field>
            )}
            <Button type="submit" size="lg" disabled={form.busy}>
              {copy[mode].action}
            </Button>
          </form>
        )}
        <p className="flex justify-between text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <Link href="/signup" className="hover:text-foreground">
                Create an account
              </Link>
              <Link href="/forgot-password" className="hover:text-foreground">
                Forgot password?
              </Link>
            </>
          )}
          {mode !== "login" && (
            <Link href="/login" className="hover:text-foreground">
              Back to log in
            </Link>
          )}
        </p>
      </div>
    </main>
  )
}
