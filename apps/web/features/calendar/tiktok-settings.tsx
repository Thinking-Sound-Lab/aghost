"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  TIKTOK_PRIVACY_LEVELS,
  type Account,
  type TikTokDisclosure,
  type TikTokPrivacyLevel,
} from "@workspace/api/contract"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { Field } from "@/components/interface"
import { Card } from "@/features/automations/automation-fields"
import {
  tiktokCreatorFor,
  tiktokMediaType,
  useComposerStore,
  type TikTokDraft,
} from "@/stores/composer-store"

const AUDIENCES: Record<TikTokPrivacyLevel, string> = {
  everyone: "Everyone",
  friends: "Friends",
  followers: "Followers",
  only_me: "Only you",
}

const DISCLOSURES: {
  value: Exclude<TikTokDisclosure, "none">
  label: string
  hint: string
}[] = [
  {
    value: "your_brand",
    label: "Your brand",
    hint: "You're promoting yourself or your own business. TikTok labels it “Promotional content”.",
  },
  {
    value: "branded_content",
    label: "Branded content",
    hint: "You're promoting another brand or a third party. TikTok labels it “Paid partnership”.",
  },
]

const TERMS = {
  music: "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en",
  branded: "https://www.tiktok.com/legal/page/global/bc-policy/en",
}

/**
 * Who sees a TikTok copy and what people can do with it. TikTok has no
 * defaults, so the owner chooses each one from what the creator allows.
 */
export function TikTokSettings({
  account,
  prefix,
  editable,
  busy,
}: {
  account: Account
  /** Where the save reports this copy's problems, such as "targets.1.". */
  prefix: string
  editable: boolean
  busy: boolean
}) {
  const composer = useComposerStore()
  const { draft, fields } = composer
  const settings = draft.tiktok[account.id]
  const mediaType = tiktokMediaType(draft.media)
  const video = mediaType === "video"
  const creator = tiktokCreatorFor(
    composer.tiktokCreators,
    account.id,
    draft.media
  )
  const loadTikTokCreator = composer.loadTikTokCreator
  useEffect(() => {
    if (editable) void loadTikTokCreator(account.id)
  }, [account.id, mediaType, editable, loadTikTokCreator])
  if (!settings) return null

  const locked = !editable || busy
  // Choices wait for the creator's options, so none has to be undone.
  const waiting = editable && !creator
  const set = (patch: Partial<TikTokDraft>) =>
    composer.setTikTok(account.id, patch)
  const error = (field: string) => fields[`${prefix}tiktok.${field}`]
  // TikTok's Business app, which aghost connects through, publishes videos
  // to everyone.
  const audiences = TIKTOK_PRIVACY_LEVELS.filter(
    (level) =>
      (!creator || creator.privacyLevels.includes(level)) &&
      (!video || level === "everyone")
  )
  const interactions = [
    {
      field: "allowComment",
      label: "Allow comments",
      on: settings.allowComment,
      allowed: creator?.comments ?? true,
      toggle: (on: boolean) => set({ allowComment: on }),
    },
    // Photo posts have no duets or stitches.
    ...(video
      ? [
          {
            field: "allowDuet",
            label: "Allow duets",
            on: settings.allowDuet,
            allowed: creator?.duets ?? true,
            toggle: (on: boolean) => set({ allowDuet: on }),
          },
          {
            field: "allowStitch",
            label: "Allow stitches",
            on: settings.allowStitch,
            allowed: creator?.stitches ?? true,
            toggle: (on: boolean) => set({ allowStitch: on }),
          },
        ]
      : []),
  ]
  const disclosing = settings.disclosure !== "none"
  const branded = settings.disclosure === "branded_content"

  return (
    <>
      <Card title="TikTok">
        <Field
          label="Who can see this post"
          error={error("privacyLevel")}
          hint={
            video
              ? "TikTok publishes videos from aghost to everyone."
              : undefined
          }
        >
          <span className="flex items-center gap-2">
            <NativeSelect
              aria-label={`Who can see the TikTok post on @${account.username}`}
              disabled={locked || waiting}
              aria-invalid={!!error("privacyLevel")}
              value={settings.privacyLevel ?? ""}
              onChange={(event) =>
                set({
                  privacyLevel:
                    (event.target.value as TikTokPrivacyLevel) || null,
                })
              }
              className="rounded-lg border-transparent bg-card"
            >
              <option value="" disabled>
                Choose…
              </option>
              {/* A stored level stays visible after the creator's options change. */}
              {(settings.privacyLevel &&
              !audiences.includes(settings.privacyLevel)
                ? [...audiences, settings.privacyLevel]
                : audiences
              ).map((level) => (
                <option
                  key={level}
                  value={level}
                  disabled={branded && level === "only_me"}
                >
                  {AUDIENCES[level]}
                </option>
              ))}
            </NativeSelect>
            {waiting && (
              <Loader2
                aria-label="Loading the account's options"
                className="size-4 animate-spin text-muted-foreground"
              />
            )}
          </span>
        </Field>
        <div className="grid gap-2.5">
          {interactions.map((item) => (
            <div
              key={item.field}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="grid">
                {item.label}
                {!item.allowed && (
                  <span className="text-xs text-muted-foreground">
                    Turned off in this account’s TikTok settings
                  </span>
                )}
                {error(item.field) && (
                  <span className="text-xs text-destructive">
                    {error(item.field)}
                  </span>
                )}
              </span>
              <Switch
                aria-label={item.label}
                checked={item.on}
                disabled={locked || waiting || !item.allowed}
                onCheckedChange={item.toggle}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card
        title="Disclose commercial content"
        enabled={disclosing}
        onToggle={
          locked ? undefined : (on) => set({ disclosure: on ? null : "none" })
        }
      >
        {disclosing && (
          <div
            role="radiogroup"
            aria-label="What the post promotes"
            className="grid gap-2"
          >
            {DISCLOSURES.map((option) => (
              <label key={option.value} className="flex gap-2.5 text-sm">
                <input
                  type="radio"
                  name={`tiktok-disclosure-${account.id}`}
                  disabled={locked}
                  checked={settings.disclosure === option.value}
                  onChange={() => set({ disclosure: option.value })}
                  className="mt-0.5 accent-foreground"
                />
                <span className="grid">
                  {option.label}
                  <span className="text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
            {error("disclosure") && (
              <p role="alert" className="text-xs text-destructive">
                {error("disclosure")}
              </p>
            )}
          </div>
        )}
      </Card>
      {editable && (
        <p className="text-xs text-muted-foreground">
          By scheduling, you agree to TikTok’s{" "}
          {branded && (
            <>
              <a
                href={TERMS.branded}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Branded Content Policy
              </a>{" "}
              and{" "}
            </>
          )}
          <a
            href={TERMS.music}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Music Usage Confirmation
          </a>
          .
        </p>
      )}
    </>
  )
}
