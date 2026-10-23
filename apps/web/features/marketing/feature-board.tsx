import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { ClaudeCodeApp } from "./agent-apps"
import { features } from "./content"
import {
  FollowUpScene,
  InboxScene,
  ProductCarouselScene,
  Screen,
  StatsScene,
  buttonsScene,
  followScene,
  keywordScene,
  replyScene,
  tapScene,
} from "./illustrations"
import { ComposerCard, PreviewCard, ScheduleCard } from "./product-cards"
import { CalendarPreview } from "./scheduling"
import { Painting, Pill } from "./shell"

type Tone = "sky" | "dusk" | "mist" | "gold"

type Card = {
  id?: string
  label: string
  tone: Tone
  picture: ReactNode
}

const cards: Card[] = [
  {
    label: "Cross-posting",
    tone: "sky",
    picture: <ScheduleCard className="w-full max-w-xs" />,
  },
  {
    label: "Platform previews",
    tone: "gold",
    picture: <PreviewCard className="w-full max-w-md" />,
  },
  {
    label: "Per-channel captions",
    tone: "mist",
    picture: <ComposerCard className="w-full max-w-md" />,
  },
  {
    id: "scheduling",
    label: "Scheduling",
    tone: "dusk",
    picture: (
      <div className="w-full overflow-hidden lg:max-h-88">
        <CalendarPreview />
      </div>
    ),
  },
  { label: "Agentic", tone: "sky", picture: <ClaudeCodeApp /> },
  {
    label: "Comment automation",
    tone: "gold",
    picture: <Screen>{keywordScene}</Screen>,
  },
  {
    label: "Public replies",
    tone: "mist",
    picture: <Screen>{replyScene}</Screen>,
  },
  {
    label: "Link buttons",
    tone: "dusk",
    picture: <Screen>{buttonsScene}</Screen>,
  },
  {
    label: "Tap to open",
    tone: "sky",
    picture: <Screen>{tapScene}</Screen>,
  },
  {
    label: "Follower growth",
    tone: "gold",
    picture: <Screen>{followScene}</Screen>,
  },
  { label: "Analytics", tone: "mist", picture: <StatsScene /> },
  {
    label: "Product carousel · Growth and up",
    tone: "dusk",
    picture: (
      <Screen>
        <ProductCarouselScene />
      </Screen>
    ),
  },
  {
    label: "Follow-up nudges · Business and up",
    tone: "sky",
    picture: (
      <Screen>
        <FollowUpScene />
      </Screen>
    ),
  },
  { label: "Inbox", tone: "gold", picture: <InboxScene /> },
]

function feature(label: string) {
  const found = features.find((item) => item.label === label)
  if (!found) throw new Error(`No feature is labelled "${label}".`)
  return found
}

/** The features as a grid of bordered cells, each with a painted picture. */
export function FeatureBoard() {
  return (
    <ul className="mx-auto grid max-w-7xl border-t border-l border-ink/10 lg:grid-cols-2">
      {cards.map((card) => {
        const { title, text } = feature(card.label)
        return (
          <li
            key={card.label}
            id={card.id}
            className="grid min-w-0 scroll-mt-24 content-start gap-8 border-r border-b border-ink/10 p-6 sm:p-10"
          >
            <div className="grid content-start gap-4">
              <Pill>{card.label}</Pill>
              <h3 className="text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight font-medium tracking-[-0.04em]">
                {title}
              </h3>
              <p className="max-w-xl text-lg text-ink/65">{text}</p>
            </div>
            <Painting
              tone={card.tone}
              className={cn("grid min-h-80 place-items-center p-6 sm:p-10")}
            >
              <div
                aria-hidden="true"
                className="grid w-full min-w-0 place-items-center"
              >
                {card.picture}
              </div>
            </Painting>
          </li>
        )
      })}
    </ul>
  )
}
