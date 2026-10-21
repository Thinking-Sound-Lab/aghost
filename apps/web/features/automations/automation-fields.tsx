"use client"

import { Plus, X } from "lucide-react"
import {
  AUTOMATION_LIMITS,
  PERSONALIZATION_TOKENS,
} from "@workspace/api/contract"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field } from "@/components/interface"
import {
  DEFAULT_NOT_FOLLOWING_MESSAGE,
  confirmLabelOf,
  type AutomationDraft,
} from "@/lib/automation-draft"

import { FollowUpEditor, ProductCarouselEditor } from "./automation-extras"

const KEYWORD_EXAMPLES = ["Price", "Link", "Shop"]

/** What an automation sends, without its trigger. */
export type ResponseDraft = Pick<
  AutomationDraft,
  | "openingDm"
  | "dmMessage"
  | "dmButtons"
  | "commentReply"
  | "requireFollow"
  | "notFollowingMessage"
  | "productCarousel"
  | "followUp"
  | "dmFormat"
>

export type KeywordDraft = { keywordText: string; anyWord: boolean }

/** The comma-separated keywords, or none when any word counts. */
export function keywordsOf({ keywordText, anyWord }: KeywordDraft): string[] {
  if (anyWord) return []
  return keywordText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

/** "And this comment has" and, once shown, "They will get". */
export function AutomationFields({
  draft,
  keywords,
  fields,
  showResponse,
  autoFocus,
  onChange,
  onKeywords,
  onPreview,
}: {
  draft: ResponseDraft
  keywords: KeywordDraft
  /** Messages for invalid fields, by path within the automation. */
  fields: Record<string, string>
  showResponse: boolean
  autoFocus: boolean
  onChange: (patch: Partial<ResponseDraft>) => void
  onKeywords: (patch: Partial<KeywordDraft>) => void
  onPreview: (screen: "post" | "dm") => void
}) {
  const typed = keywordsOf({ ...keywords, anyWord: false })
  return (
    <>
      <Step title="And this comment has" onFocus={() => onPreview("post")}>
        <Option
          name="words"
          label="a specific word or words"
          checked={!keywords.anyWord}
          onSelect={() => onKeywords({ anyWord: false })}
        >
          <Field
            error={fields.keywords ?? fields["keywords.0"]}
            hint="Use commas to separate words"
          >
            <Input
              autoFocus={autoFocus}
              placeholder="Enter a word or multiple"
              value={keywords.keywordText}
              onChange={(event) =>
                onKeywords({ keywordText: event.target.value })
              }
            />
          </Field>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            For example:
            {KEYWORD_EXAMPLES.map((word) => (
              <button
                key={word}
                type="button"
                className="rounded-full bg-card px-2 py-0.5 hover:text-foreground"
                onClick={() =>
                  onKeywords({ keywordText: [...typed, word].join(", ") })
                }
              >
                {word}
              </button>
            ))}
          </div>
        </Option>
        <Option
          name="words"
          label="any word"
          checked={keywords.anyWord}
          onSelect={() => onKeywords({ anyWord: true })}
        />
      </Step>

      {showResponse && (
        <Step title="They will get" onFocus={() => onPreview("dm")}>
          <Card
            title="an opening DM"
            enabled={draft.openingDm !== null}
            onToggle={(on) =>
              onChange({
                openingDm: on
                  ? { message: "", buttonLabel: "Send me the link" }
                  : null,
              })
            }
          >
            {draft.openingDm && (
              <>
                <Field error={fields["openingDm.message"]}>
                  <Textarea
                    aria-label="Opening message"
                    placeholder="Thanks for the comment! Tap below and I'll send you the link."
                    maxLength={AUTOMATION_LIMITS.openingDmMaxLength}
                    value={draft.openingDm.message}
                    onChange={(event) =>
                      onChange({
                        openingDm: {
                          ...draft.openingDm!,
                          message: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field error={fields["openingDm.buttonLabel"]}>
                  <Input
                    aria-label="Opening button label"
                    maxLength={AUTOMATION_LIMITS.dmButtonLabelMaxLength}
                    value={draft.openingDm.buttonLabel}
                    onChange={(event) =>
                      onChange({
                        openingDm: {
                          ...draft.openingDm!,
                          buttonLabel: event.target.value,
                        },
                      })
                    }
                  />
                </Field>
              </>
            )}
          </Card>

          <ProductCarouselEditor
            draft={draft}
            fields={fields}
            onChange={onChange}
          />
          {draft.dmFormat === "text" && (
            <Card title="a DM with the link">
              <Field error={fields.dmMessage}>
                <Textarea
                  aria-label="Message"
                  placeholder="Here's your link!"
                  maxLength={AUTOMATION_LIMITS.dmMessageMaxLength}
                  value={draft.dmMessage}
                  onChange={(event) =>
                    onChange({ dmMessage: event.target.value })
                  }
                />
              </Field>
              <div className="flex gap-1.5">
                {PERSONALIZATION_TOKENS.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      onChange({ dmMessage: `${draft.dmMessage}${item.token}` })
                    }
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
              {draft.dmButtons.map((button, index) => (
                <div key={index} className="grid gap-1.5">
                  <div className="flex gap-1.5">
                    <Input
                      aria-label={`Link ${index + 1}`}
                      placeholder="https://"
                      inputMode="url"
                      value={button.url}
                      aria-invalid={!!fields[`dmButtons.${index}.url`]}
                      onChange={(event) =>
                        onChange({
                          dmButtons: draft.dmButtons.map((item, i) =>
                            i === index
                              ? { ...item, url: event.target.value }
                              : item
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove link ${index + 1}`}
                      onClick={() =>
                        onChange({
                          dmButtons: draft.dmButtons.filter(
                            (_, i) => i !== index
                          ),
                        })
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  <Input
                    aria-label={`Button label ${index + 1}`}
                    placeholder="Button label"
                    maxLength={AUTOMATION_LIMITS.dmButtonLabelMaxLength}
                    value={button.label}
                    aria-invalid={!!fields[`dmButtons.${index}.label`]}
                    onChange={(event) =>
                      onChange({
                        dmButtons: draft.dmButtons.map((item, i) =>
                          i === index
                            ? { ...item, label: event.target.value }
                            : item
                        ),
                      })
                    }
                  />
                  {(fields[`dmButtons.${index}.url`] ??
                    fields[`dmButtons.${index}.label`]) && (
                    <p className="text-xs text-destructive">
                      {fields[`dmButtons.${index}.url`] ??
                        fields[`dmButtons.${index}.label`]}
                    </p>
                  )}
                </div>
              ))}
              {draft.dmButtons.length < AUTOMATION_LIMITS.maxDmButtons && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-self-start"
                  onClick={() =>
                    onChange({
                      dmButtons: [...draft.dmButtons, { label: "", url: "" }],
                    })
                  }
                >
                  <Plus />
                  Add link
                </Button>
              )}
            </Card>
          )}
          <FollowUpEditor draft={draft} fields={fields} onChange={onChange} />

          <Card
            title="a reply to their comment"
            enabled={draft.commentReply !== null}
            onToggle={(on) => onChange({ commentReply: on ? "" : null })}
            onFocus={() => onPreview("post")}
          >
            {draft.commentReply !== null && (
              <Field error={fields.commentReply}>
                <Input
                  aria-label="Public reply"
                  placeholder="Sent you a DM!"
                  maxLength={AUTOMATION_LIMITS.commentReplyMaxLength}
                  value={draft.commentReply}
                  onChange={(event) =>
                    onChange({ commentReply: event.target.value })
                  }
                />
              </Field>
            )}
          </Card>

          <Card
            title="the link only if they follow you"
            enabled={draft.requireFollow}
            onToggle={(on) =>
              onChange({
                requireFollow: on,
                notFollowingMessage: on ? DEFAULT_NOT_FOLLOWING_MESSAGE : null,
              })
            }
          >
            {typeof draft.notFollowingMessage === "string" && (
              <Field
                label="If they don't follow you yet"
                error={fields.notFollowingMessage}
                hint={`Sent with a "${confirmLabelOf(draft.openingDm)}" button. The link follows once they follow you and tap it.`}
              >
                <Textarea
                  aria-label="Message if they don't follow you"
                  placeholder={DEFAULT_NOT_FOLLOWING_MESSAGE}
                  maxLength={AUTOMATION_LIMITS.notFollowingMessageMaxLength}
                  value={draft.notFollowingMessage}
                  onChange={(event) =>
                    onChange({ notFollowingMessage: event.target.value })
                  }
                />
              </Field>
            )}
          </Card>
        </Step>
      )}
    </>
  )
}

export function Step({
  title,
  onFocus,
  children,
}: {
  title: string
  onFocus?: () => void
  children: React.ReactNode
}) {
  return (
    <section
      className="grid gap-3"
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
    >
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function Option({
  name,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string
  label: string
  checked: boolean
  onSelect: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-md bg-muted p-4 [&_input]:bg-card">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onSelect}
          className="size-4 accent-foreground"
        />
        {label}
      </label>
      {checked && children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function Card({
  title,
  enabled,
  onToggle,
  onFocus,
  children,
}: {
  title: string
  enabled?: boolean
  onToggle?: (on: boolean) => void
  onFocus?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      className="grid gap-3 rounded-md bg-muted p-4 [&_input]:bg-card [&_textarea]:bg-card"
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
    >
      <div className="flex items-center justify-between text-sm">
        {title}
        {onToggle && (
          <Switch
            checked={enabled}
            aria-label={title}
            onCheckedChange={(checked) => onToggle(checked)}
          />
        )}
      </div>
      {children}
    </div>
  )
}
