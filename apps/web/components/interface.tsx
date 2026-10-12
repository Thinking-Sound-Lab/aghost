"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Loader2, Search } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

/** A single-column page, centred with room around its content. */
export function Page({
  title,
  back,
  actions,
  children,
}: {
  title: string
  back?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto grid w-full max-w-5xl content-start gap-8 px-4 py-6 sm:px-6 md:px-10 md:py-10">
        <header className="flex min-h-9 items-center gap-2">
          {back && (
            <Link
              href={back}
              aria-label="Back"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "-ml-2",
              })}
            >
              <ArrowLeft />
            </Link>
          )}
          <h1 className="mr-auto truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {actions}
        </header>
        {children}
      </div>
    </div>
  )
}

/** One column of a multi-column page. */
export function Panel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("flex min-h-0 min-w-0 flex-col bg-card", className)}
      {...props}
    />
  )
}

export function PanelHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="box-content flex h-9 shrink-0 items-center gap-2 px-5 pt-10 pb-4">
      <h1 className="mr-auto text-xl font-semibold tracking-tight">{title}</h1>
      {children}
    </header>
  )
}

export function SearchInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={label}
        placeholder="Search"
        className="pl-8"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function ErrorBanner({
  message,
  retry,
  className,
}: {
  message: string | null
  retry?: () => void
  className?: string
}) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <span className="mr-auto">{message}</span>
      {retry && (
        <Button size="xs" variant="ghost" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Loading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "grid flex-1 place-items-center p-8 text-muted-foreground",
        className
      )}
    >
      <Loader2 className="size-5 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  )
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label && <span className="font-medium">{label}</span>}
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  )
}

/** Avatar from a remote picture, or the name's first letter. */
export function Avatar({
  src,
  name,
  className,
}: {
  src: string | null
  name: string | null
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground uppercase",
        className
      )}
    >
      {src && src !== failedSrc ? (
        // Profile photos can expire, so they are shown as-is.
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        (name?.charAt(0) ?? "?")
      )}
    </span>
  )
}

export function ConfirmButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  busy,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  children: React.ReactNode
  busy: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" disabled={busy} />}
      >
        {children}
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <div className="grid gap-1.5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" disabled={busy} />}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
