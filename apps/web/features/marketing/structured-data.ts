import {
  PLAN_IDS,
  PLANS,
  TRIAL_DAYS,
  socialSetCount,
} from "@workspace/api/contract"
import { site } from "@/lib/site"
import { features } from "./content"

// Schema.org descriptions shared by the pages that show the product, so search
// engines and AI assistants read the same plans everywhere.

export const organizationRef = { "@id": `${site.url}/#organization` }

/** aghost as a web app, with each plan as a monthly offer. */
export function applicationSchema() {
  const offers = PLAN_IDS.map((id) => {
    const plan = PLANS[id]
    const amount = plan.prices.USD.monthly / 100
    return {
      "@type": "Offer",
      name: plan.name,
      description: `${socialSetCount(plan.socialSets)}, with a ${TRIAL_DAYS}-day free trial.`,
      url: `${site.url}/pricing`,
      price: amount,
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: amount,
        priceCurrency: "USD",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MON",
        },
      },
    }
  })
  return {
    "@type": "WebApplication",
    "@id": `${site.url}/#app`,
    name: site.name,
    url: site.url,
    description: site.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    featureList: features.map((feature) => feature.title),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...offers.map((offer) => offer.price)),
      highPrice: Math.max(...offers.map((offer) => offer.price)),
      offerCount: offers.length,
      offers,
    },
    publisher: organizationRef,
  }
}

/** A JSON-LD script, escaped so its text can't close the tag. */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
