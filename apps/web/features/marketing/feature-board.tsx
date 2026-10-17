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
  label: string
  gradient: keyof typeof gradients
  /** Wide cards sit alone on their row, the text beside the picture. */
  wide?: boolean
  span?: string
  picture: ReactNode
}

const agentCard: Card = {
  label: "Agentic",
  gradient: "deep",
  wide: true,
  picture: <ClaudeCodeApp />,
}

const schedulingCard: Card = {
  label: "Scheduling",
  gradient: "blue",
  wide: true,
  picture: <CalendarPreview />,
}

const cards: Card[] = [
  {
    label: "Comment automation",
    gradient: "blue",
    span: "lg:col-span-3",
    picture: <Screen>{keywordScene}</Screen>,
  },
  {
    label: "Public replies",
    gradient: "teal",
    span: "lg:col-span-2",
    picture: <Screen>{replyScene}</Screen>,
  },
  {
    label: "Link buttons",
    gradient: "green",
    wide: true,
    picture: <Screen>{buttonsScene}</Screen>,
  },
  {
    label: "Tap to open",
    gradient: "ocean",
    span: "lg:col-span-2",
    picture: <Screen>{tapScene}</Screen>,
  },
  {
    label: "Follower growth",
    gradient: "blue",
    span: "lg:col-span-3",
    picture: <Screen>{followScene}</Screen>,
  },
  {
    label: "Analytics",
    gradient: "deep",
    wide: true,
    picture: <StatsScene />,
  },
  {
    label: "Product carousel · Growth and Business",
    gradient: "ocean",
    span: "lg:col-span-3",
    picture: (
      <Screen>
        <ProductCarouselScene />
      </Screen>
    ),
  },
  {
    label: "Follow-up nudges · Business",
    gradient: "blue",
    span: "lg:col-span-2",
    picture: (
      <Screen>
        <FollowUpScene />
      </Screen>
    ),
  },
  {
    label: "Inbox",
    gradient: "teal",
    wide: true,
    picture: <InboxScene />,
  },
]

function feature(label: string) {
  const found = features.find((item) => item.label === label)
  if (!found) throw new Error(`No feature is labelled "${label}".`)
  return found
}

/** The features as a grid of gradient cards, each with a small picture. */
export function FeatureBoard({
  agentic = false,
  scheduling = false,
}: {
  agentic?: boolean
  scheduling?: boolean
}) {
  const visibleCards = [
    ...(scheduling ? [schedulingCard] : []),
    ...(agentic ? [agentCard] : []),
    ...cards,
  ]
  return (
    <ul className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 lg:grid-cols-5">
      {visibleCards.map((card) => {
        const { title, text } = feature(card.label)
        const light = card.gradient === "green"
        return (
          <li
            key={card.label}
            className={cn(
              "grid min-w-0 content-start gap-8 overflow-hidden rounded-[2rem] p-7 sm:p-10",
              gradients[card.gradient],
              card.wide ? "lg:col-span-5 lg:grid-cols-2 lg:items-center" : "",
              card.span
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
            {card.picture}
          </li>
        )
      })}
    </ul>
  )
}
