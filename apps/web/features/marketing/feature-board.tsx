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
import { Pill } from "./shell"
import { CalendarPreview } from "./scheduling"

/** Card backgrounds, from the brand's blue and cyan, plus its green. */
export const gradients = {
  blue: "bg-linear-to-br from-brand-blue to-[#0a2a8a]",
  ocean: "bg-linear-to-br from-[#0b6fd6] to-[#08245f]",
  teal: "bg-linear-to-br from-[#0a8f98] to-[#0a3a8c]",
  deep: "bg-linear-to-br from-[#1638c9] via-[#0d2272] to-[#071437]",
  green: "bg-linear-to-br from-brand to-brand-cyan text-black",
}

/** The mascot's colours, its green body and four orbs, as card backgrounds. */
export const mascotTones = {
  orange: "bg-linear-to-br from-[#ffcb52] to-brand-orange text-black",
  blue: "bg-linear-to-br from-[#4683ff] to-[#0c46d6] text-white",
  cyan: "bg-linear-to-br from-[#52e1e7] to-[#0fb1b9] text-black",
  green: "bg-linear-to-br from-[#5eec9c] to-[#1bbf62] text-black",
  red: "bg-linear-to-br from-[#ff7258] to-brand-red text-black",
}

type Card = {
  id?: string
  label: string
  gradient: keyof typeof gradients
  picture: ReactNode
}

const agentCard: Card = {
  label: "Agentic",
  gradient: "deep",
  picture: <ClaudeCodeApp />,
}

const schedulingCard: Card = {
  id: "scheduling",
  label: "Scheduling",
  gradient: "blue",
  picture: (
    <div className="overflow-hidden rounded-2xl lg:h-88">
      <CalendarPreview />
    </div>
  ),
}

const cards: Card[] = [
  schedulingCard,
  agentCard,
  {
    label: "Comment automation",
    gradient: "blue",
    picture: <Screen>{keywordScene}</Screen>,
  },
  {
    label: "Public replies",
    gradient: "teal",
    picture: <Screen>{replyScene}</Screen>,
  },
  {
    label: "Link buttons",
    gradient: "green",
    picture: <Screen>{buttonsScene}</Screen>,
  },
  {
    label: "Tap to open",
    gradient: "ocean",
    picture: <Screen>{tapScene}</Screen>,
  },
  {
    label: "Follower growth",
    gradient: "blue",
    picture: <Screen>{followScene}</Screen>,
  },
  {
    label: "Analytics",
    gradient: "deep",
    picture: <StatsScene />,
  },
  {
    label: "Product carousel · Growth and up",
    gradient: "ocean",
    picture: (
      <Screen>
        <ProductCarouselScene />
      </Screen>
    ),
  },
  {
    label: "Follow-up nudges · Business and up",
    gradient: "blue",
    picture: (
      <Screen>
        <FollowUpScene />
      </Screen>
    ),
  },
  {
    label: "Inbox",
    gradient: "teal",
    picture: <InboxScene />,
  },
]

function feature(label: string) {
  const found = features.find((item) => item.label === label)
  if (!found) throw new Error(`No feature is labelled "${label}".`)
  return found
}

/** The features as a grid of gradient cards, each with a small picture. */
export function FeatureBoard() {
  return (
    <ul className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 lg:grid-cols-5">
      {cards.map((card, index) => {
        const { title, text } = feature(card.label)
        const light = card.gradient === "green"
        // Alternate 60/40 and 40/60 pairs, with a full-width card between them.
        const wide = index % 3 === 2
        const larger = index % 6 === 0 || index % 6 === 4
        const span = larger ? "lg:col-span-3" : "lg:col-span-2"
        const pictureFirst = index % 3 === 1
        return (
          <li
            key={card.label}
            id={card.id}
            className={cn(
              "grid min-w-0 scroll-mt-24 content-start gap-8 overflow-hidden rounded-[2rem] p-7 sm:p-10",
              gradients[card.gradient],
              wide ? "lg:col-span-5 lg:grid-cols-2 lg:items-center" : span,
              !wide && "lg:flex lg:flex-col lg:justify-between"
            )}
          >
            <div className="grid content-start gap-4">
              <Pill className={light ? "bg-black/10" : undefined}>
                {card.label}
              </Pill>
              <h3 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
                {title}
              </h3>
              <p
                className={cn(
                  "max-w-xl text-lg",
                  light ? "text-black/75" : "text-white/85"
                )}
              >
                {text}
              </p>
            </div>
            <div
              aria-hidden="true"
              className={cn(
                "min-w-0",
                !wide && "lg:max-h-88 lg:overflow-hidden lg:rounded-2xl",
                pictureFirst && "lg:order-first"
              )}
            >
              {card.picture}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
