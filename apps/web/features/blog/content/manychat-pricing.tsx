import Link from "next/link"
import { ComparisonTable, Source, sources, aghostPrice } from "./shared"
import type { ArticleContent } from "./types"

export const manychatPricing: ArticleContent = {
  answer:
    "ManyChat's new pricing model includes Free, Essential, Pro, Business, and Advanced. Essential is $17/month and Pro is $39/month on monthly subscriptions. Annual billing lowers their monthly equivalents to $14 and $29. Paid plans include an active-contact allowance; additional active contacts can add overage charges.",
  intro: (
    <>
      <p>
        A price comparison is useful only if it compares the same workload.
        Delivering a link to 100 people and managing thousands of customer
        conversations are different jobs, even when both start in Instagram DMs.
        Your bill also depends on the billing cycle and the plan available to
        your account.
      </p>
      <p>
        This guide explains the current ManyChat pricing structure and shows
        simple cost calculations. Prices were checked on October 12, 2026.
        Examples use US dollars and exclude taxes, channel charges, and extras.
      </p>
    </>
  ),
  sections: [
    {
      id: "current-plans",
      title: "ManyChat plans and prices in 2026",
      body: (
        <>
          <ComparisonTable
            caption="ManyChat's new plan model, checked October 12, 2026"
            headings={[
              "Plan",
              "Monthly billing",
              "Annual monthly equivalent",
              "Included active contacts",
            ]}
            rows={[
              ["Free", "$0", "$0", "25"],
              [
                <Source key="essential" href={sources.manychatEssential}>
                  Essential
                </Source>,
                "$17",
                "$14 ($168/year)",
                "250",
              ],
              [
                <Source key="pro" href={sources.manychatPro}>
                  Pro
                </Source>,
                "$39",
                "$29 ($348/year)",
                "2,500",
              ],
              [
                <Source key="business" href={sources.manychatBusiness}>
                  Business
                </Source>,
                "$99",
                "$69 ($828/year)",
                "7,500",
              ],
              [
                <Source key="advanced" href={sources.manychatAdvanced}>
                  Advanced
                </Source>,
                "$199",
                "$139 ($1,668/year)",
                "25,000",
              ],
            ]}
          />
          <p>
            Each linked plan name opens its official documentation. The annual
            figures are monthly equivalents: you pay the full annual
            subscription upfront. Essential and Pro have different channel and
            feature allowances, so the lower base price is not always the plan
            that covers your workflow.
          </p>
          <p>
            ManyChat introduced this model on March 2, 2026. Availability
            depends on account age and region, and older accounts may still show
            earlier pricing. Confirm your own subscription screen against the{" "}
            <Source href={sources.manychatPlans}>official plan guide</Source>{" "}
            before using an example as your expected bill.
          </p>
        </>
      ),
    },
    {
      id: "active-contacts",
      title: "An active contact is not an Instagram follower",
      body: (
        <>
          <p>
            ManyChat’s{" "}
            <Source href={sources.manychatContacts}>
              Active Contacts guide
            </Source>{" "}
            counts contacts that interact through ManyChat during the billing
            month. A follower who never engages through the tool is different
            from a person who participates in an automation.
          </p>
          <p>
            For planning, count the people you expect to engage in your
            campaign, not the size of your Instagram profile. A small account
            with a popular giveaway can generate a busier automation month than
            a larger account that rarely asks people to comment for a resource.
          </p>
          <p>
            Build a forecast from an ordinary month and a campaign month. Write
            down the expected number of unique participants, which channels they
            use, and whether your existing conversations continue into the new
            billing period. Compare the forecast with the usage displayed in
            your account after the campaign.
          </p>
        </>
      ),
    },
    {
      id: "cost-examples",
      title: "Worked examples: 1,000 and 3,000 active contacts",
      body: (
        <>
          <p>
            The monthly Essential plan includes 250 active contacts and charges
            $0.10 for each additional one. The monthly Pro plan includes 2,500
            and charges $0.05 for each additional one. These inputs come from
            the official{" "}
            <Source href={sources.manychatEssential}>Essential</Source> and{" "}
            <Source href={sources.manychatPro}>Pro</Source> guides.
          </p>
          <ComparisonTable
            caption="Illustrative monthly subscription costs before extras"
            headings={["Workload", "Calculation", "Example subtotal"]}
            rows={[
              [
                "Essential, 1,000 active contacts",
                "$17 + (1,000 − 250) × $0.10",
                "$92",
              ],
              [
                "Pro, 1,000 active contacts",
                "$39; within 2,500 included",
                "$39",
              ],
              [
                "Pro, 3,000 active contacts",
                "$39 + (3,000 − 2,500) × $0.05",
                "$64",
              ],
            ]}
          />
          <p>
            These are calculations, not checkout quotes. They show why choosing
            a plan solely by its headline price can cost more. A person sending
            the same volume may have a different total if their account uses
            legacy pricing, annual rates, extra inbox seats, or a paid channel.
          </p>
          <p>
            If your forecast changes, compare the higher plan before the
            campaign begins. Also check which budget controls your account
            offers, and decide how much additional usage you are willing to pay
            for. A viral post is a poor time to learn your billing settings.
          </p>
        </>
      ),
    },
    {
      id: "annual-billing",
      title: "How annual billing changes the comparison",
      body: (
        <>
          <p>
            Compare the annual commitment and the expected usage charges
            separately. Paying for a year does not make a contact allowance
            unlimited: the{" "}
            <Source href={sources.manychatPricing}>pricing page</Source> says
            active contacts are calculated monthly, with annual-plan overages
            also billed monthly.
          </p>
          <p>
            For a year-round resource funnel, an annual subscription may fit how
            you work. For an experiment, a seasonal launch, or a tool you have
            not yet tested, estimate the cost of the full commitment before
            choosing a discounted monthly equivalent.
          </p>
          <p>
            Keep a simple worksheet with four lines: subscription commitment,
            expected overages, optional extras, and time spent maintaining the
            workflow. This makes a cheaper subscription with significant setup
            work easier to compare with a more expensive tool you already know.
          </p>
        </>
      ),
    },
    {
      id: "choosing-a-plan",
      title: "Choose based on the campaign you actually run",
      body: (
        <>
          <p>
            Begin with your trigger and the required outcome. Does someone
            comment for a PDF, ask a question by DM, or start a conversation on
            another channel? Then identify the necessary branching, data
            collection, integrations, and human handoff. Pay for the
            capabilities that serve those steps.
          </p>
          <ul>
            <li>
              For a small test, check whether the free allowance covers the
              number of people you need to test with.
            </li>
            <li>
              For a live resource campaign, model the bill from likely
              participants and compare the plans that support your trigger.
            </li>
            <li>
              For a team, check who needs a login, who needs an inbox seat, and
              how conversations reach the right person.
            </li>
            <li>
              For several brands, calculate each account’s costs before
              combining them into an agency budget.
            </li>
          </ul>
          <p>
            Keep the experiment measurable: test the correct reply, a working
            destination link, and a completed sign-up. Contact counts tell you
            about billing; completed customer actions tell you about the
            campaign’s usefulness.
          </p>
        </>
      ),
    },
    {
      id: "aghost-comparison",
      title: "Where aghost's pricing fits",
      body: (
        <>
          <p>
            aghost’s <Link href="/pricing">Pro plan</Link> costs {aghostPrice()}
            /month for one Instagram account. Growth costs{" "}
            {aghostPrice("growth")} for two accounts, and Business costs{" "}
            {aghostPrice("business")} for five. Contacts and DMs do not change
            the subscription price; Instagram’s messaging rules and fair use
            still apply.
          </p>
          <p>
            That model suits a creator who wants comment-triggered link delivery
            with a predictable subscription. Dashboard, MCP, and REST access are
            included. aghost does not replace ManyChat’s broader multichannel
            flows or built-in conversational AI. Those differences matter more
            than a base-price comparison when your funnel needs them.
          </p>
          <p>
            Use the{" "}
            <Link href="/blog/manychat-alternatives">
              ManyChat alternatives guide
            </Link>{" "}
            to compare workflows, then test the one you intend to use. Choose
            the tool that completes your campaign within your budget.
          </p>
        </>
      ),
    },
  ],
  faqs: [
    {
      question: "Does ManyChat have a free plan?",
      answer: (
        <>
          The current{" "}
          <Source href={sources.manychatPricing}>pricing page</Source> lists a
          Free plan with 25 active contacts. Confirm the allowance available to
          your account; older plans and regional availability can differ.
        </>
      ),
    },
    {
      question: "Is ManyChat billed by follower count?",
      answer:
        "The new pricing model uses active contacts during a billing month. Your Instagram follower count alone does not determine that usage.",
    },
    {
      question: "Why do some guides say ManyChat Pro starts at $15?",
      answer:
        "Older articles may describe a previous pricing model. The current Pro documentation lists $39/month on monthly billing and a $29 monthly equivalent on annual billing. Check your account's plan because rollout varies.",
    },
  ],
}
