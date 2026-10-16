"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp, Layers, LockKeyhole, Plus, X } from "lucide-react"
import {
  AUTOMATION_LIMITS,
  PLANS,
  billingPath,
  type CreateAutomationInput,
  type FollowUp,
  type ProductCard,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field } from "@/components/interface"
import { useWorkspaceStore } from "@/stores/workspace-store"

type ExtrasDraft = Pick<
  CreateAutomationInput,
  "productCarousel" | "followUp" | "dmButtons" | "dmMessage"
>

type ExtrasProps = {
  draft: ExtrasDraft
  fields: Record<string, string>
  onChange: (patch: Partial<ExtrasDraft>) => void
}

const emptyCard = (): ProductCard => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  buttonLabel: "Shop now",
  url: "",
})

function Upgrade({
  plan,
  children,
}: {
  plan: "growth" | "business"
  children: React.ReactNode
}) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <LockKeyhole className="size-3.5" aria-hidden="true" />
      {children}
      <Link
        className="font-medium text-foreground underline underline-offset-4"
        href={billingPath({ plan, interval: "monthly" })}
      >
        View {PLANS[plan].name}
      </Link>
    </p>
  )
}

export function ProductCarouselEditor({
  draft,
  fields,
  onChange,
}: ExtrasProps) {
  const planId = useWorkspaceStore(
    (state) => state.billing?.subscription?.plan ?? "pro"
  )
  const canUse = PLANS[planId].features.productCarousel
  const cards = draft.productCarousel ?? null
  const patchCard = (index: number, patch: Partial<ProductCard>) =>
    onChange({
      productCarousel: cards!.map((card, i) =>
        i === index ? { ...card, ...patch } : card
      ),
    })
  function move(index: number, to: number) {
    const next = [...cards!]
    ;[next[index], next[to]] = [next[to]!, next[index]!]
    onChange({ productCarousel: next })
  }
  return (
    <section
      className="grid gap-3 rounded-xl bg-muted p-5"
      aria-label="DM format"
    >
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Choose your DM</legend>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-3">
            <input
              type="radio"
              name="dm-format"
              value="text"
              checked={!cards}
              onChange={() =>
                onChange({
                  productCarousel: null,
                  dmButtons: [{ label: "", url: "" }],
                })
              }
            />
            Message & links
          </label>
          <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3">
            <input
              type="radio"
              name="dm-format"
              value="carousel"
              checked={Boolean(cards)}
              disabled={!canUse && !cards}
              onChange={() =>
                onChange({
                  productCarousel: [emptyCard()],
                  dmButtons: [],
                  dmMessage: draft.dmMessage || "Browse the collection.",
                })
              }
            />
            Product carousel
          </label>
        </div>
      </fieldset>
      {!canUse && (
        <Upgrade plan="growth">Product carousels start on Growth.</Upgrade>
      )}
      {cards && (
        <>
          <p className="text-xs text-muted-foreground">
            Give each product an image, a short description, and its own link.
            People can swipe through up to {AUTOMATION_LIMITS.maxCarouselCards}{" "}
            cards.
          </p>
          <Field error={fields.productCarousel}>
            <span className="sr-only">Product cards</span>
          </Field>
          {cards.map((card, index) => (
            <fieldset
              key={index}
              className="grid gap-3 rounded-lg border bg-card p-4"
              disabled={!canUse}
            >
              <legend className="sr-only">Product {index + 1}</legend>
              <div className="flex items-center gap-1">
                <Layers className="mr-1 size-4" aria-hidden="true" />
                <p className="mr-auto text-sm font-semibold">
                  Product {index + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move product ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move product ${index + 1} down`}
                  disabled={index === cards.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove product ${index + 1}`}
                  disabled={cards.length === 1}
                  onClick={() =>
                    onChange({
                      productCarousel: cards.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X />
                </Button>
              </div>
              {(
                [
                  ["title", "Product title", "Your product", 80],
                  [
                    "subtitle",
                    "Description or price",
                    "A short description",
                    80,
                  ],
                  ["imageUrl", "Image URL", "https://…", undefined],
                  ["url", "Product link", "https://…", undefined],
                  ["buttonLabel", "Button label", "Shop now", 20],
                ] as const
              ).map(([key, label, placeholder, maxLength]) => (
                <Field
                  key={key}
                  label={label}
                  error={fields[`productCarousel.${index}.${key}`]}
                  hint={
                    key === "imageUrl"
                      ? "Use a public HTTPS image link."
                      : undefined
                  }
                >
                  <Input
                    aria-label={`Product ${index + 1} ${label.toLowerCase()}`}
                    value={card[key]}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    inputMode={
                      key === "url" || key === "imageUrl" ? "url" : "text"
                    }
                    onChange={(event) =>
                      patchCard(index, { [key]: event.target.value })
                    }
                  />
                </Field>
              ))}
            </fieldset>
          ))}
          {cards.length < AUTOMATION_LIMITS.maxCarouselCards && (
            <Button
              type="button"
              variant="secondary"
              className="justify-self-start"
              disabled={!canUse}
              onClick={() =>
                onChange({ productCarousel: [...cards, emptyCard()] })
              }
            >
              <Plus /> Add product
            </Button>
          )}
        </>
      )}
    </section>
  )
}

export function FollowUpEditor({ draft, fields, onChange }: ExtrasProps) {
  const planId = useWorkspaceStore(
    (state) => state.billing?.subscription?.plan ?? "pro"
  )
  const canUse = PLANS[planId].features.followUpNudge
  const followUp = draft.followUp ?? null
  const patch = (value: Partial<FollowUp>) =>
    onChange({ followUp: { ...followUp!, ...value } })
  function enable(on: boolean) {
    const first = draft.dmButtons[0]
    const card = draft.productCarousel?.[0]
    onChange({
      followUp: on
        ? {
            message: "Still interested? Here's your link again 👇",
            delayMinutes: 60,
            button: first?.url
              ? first
              : card?.url
                ? { label: card.buttonLabel, url: card.url }
                : null,
          }
        : null,
    })
  }
  return (
    <section
      className="grid gap-3 rounded-xl bg-muted p-5"
      aria-label="Follow-up nudge"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">a follow-up nudge</h3>
        <Switch
          aria-label="Enable follow-up nudge"
          checked={Boolean(followUp)}
          disabled={!canUse && !followUp}
          onCheckedChange={enable}
        />
      </div>
      {!canUse && (
        <Upgrade plan="business">
          Automatic reminders are included on Business.
        </Upgrade>
      )}
      <p className="text-xs text-muted-foreground">
        One gentle reminder if they haven’t replied or clicked. It sends only
        while Instagram allows another message.
      </p>
      {followUp && (
        <fieldset disabled={!canUse} className="grid gap-3">
          <legend className="sr-only">Reminder settings</legend>
          <Field
            label="Send after"
            error={fields["followUp.delayMinutes"]}
            hint="30 minutes to 20 hours after the DM."
          >
            <div className="flex items-center gap-2">
              <Input
                aria-label="Reminder delay in minutes"
                type="number"
                min={30}
                max={1200}
                value={followUp.delayMinutes}
                onChange={(event) =>
                  patch({ delayMinutes: Number(event.target.value) })
                }
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </Field>
          <Field label="Reminder message" error={fields["followUp.message"]}>
            <Textarea
              aria-label="Reminder message"
              value={followUp.message}
              maxLength={640}
              onChange={(event) => patch({ message: event.target.value })}
            />
          </Field>
          <label className="flex items-center justify-between text-sm">
            Include a link button
            <Switch
              aria-label="Include reminder link button"
              checked={Boolean(followUp.button)}
              onCheckedChange={(on) =>
                patch({
                  button: on ? { label: "Get the link", url: "" } : null,
                })
              }
            />
          </label>
          {followUp.button && (
            <>
              <Field label="Link" error={fields["followUp.button.url"]}>
                <Input
                  aria-label="Reminder link"
                  inputMode="url"
                  value={followUp.button.url}
                  placeholder="https://…"
                  onChange={(event) =>
                    patch({
                      button: { ...followUp.button!, url: event.target.value },
                    })
                  }
                />
              </Field>
              <Field
                label="Button label"
                error={fields["followUp.button.label"]}
              >
                <Input
                  aria-label="Reminder button label"
                  value={followUp.button.label}
                  maxLength={20}
                  onChange={(event) =>
                    patch({
                      button: {
                        ...followUp.button!,
                        label: event.target.value,
                      },
                    })
                  }
                />
              </Field>
            </>
          )}
        </fieldset>
      )}
    </section>
  )
}
