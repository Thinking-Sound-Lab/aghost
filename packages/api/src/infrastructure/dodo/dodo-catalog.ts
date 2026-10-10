import type DodoPayments from "dodopayments"

import {
  BILLING_INTERVALS,
  PLAN_IDS,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "../../contract/billing"
import { accountCount } from "../../modules/billing/plan-entitlements"
import { InternalError } from "../../shared/errors"
import { request, type DodoClient } from "./dodo-client"

// Every plan and interval is one Dodo product, tagged with these metadata keys.
const PLAN_KEY = "aghost_plan"
const INTERVAL_KEY = "aghost_interval"
const SETUP_COMMAND = "pnpm billing:setup"

const FREQUENCY: Record<BillingInterval, DodoPayments.TimeInterval> = {
  monthly: "Month",
  yearly: "Year",
}

// A plan renews until it is cancelled, but Dodo needs a term for it.
const TERM_YEARS = 10

export type CatalogEntry = { plan: PlanId; interval: BillingInterval }

type Product = DodoPayments.ProductListResponse

const key = (plan: PlanId, interval: BillingInterval) => `${plan}:${interval}`

const entries = PLAN_IDS.flatMap((plan) =>
  BILLING_INTERVALS.map((interval) => ({ plan, interval }))
)

/** The Dodo product that sells each plan and interval. */
export class DodoCatalog {
  private readonly entriesByProduct = new Map<string, CatalogEntry>()

  constructor(private readonly productsByEntry: Map<string, string>) {
    for (const entry of entries) {
      const productId = productsByEntry.get(key(entry.plan, entry.interval))
      if (productId) this.entriesByProduct.set(productId, entry)
    }
  }

  productId(plan: PlanId, interval: BillingInterval): string {
    const productId = this.productsByEntry.get(key(plan, interval))
    if (!productId) {
      throw new InternalError(`The catalog has no product for ${plan}.`)
    }
    return productId
  }

  /** Null for a product that is not one of the plans. */
  entry(productId: string): CatalogEntry | null {
    return this.entriesByProduct.get(productId) ?? null
  }
}

/** What the product for a plan and interval must look like. */
export function productSpec(plan: PlanId, interval: BillingInterval) {
  const { name, instagramAccounts, prices } = PLANS[plan]
  return {
    name: `aghost ${name} (${interval === "monthly" ? "Monthly" : "Yearly"})`,
    description: `${accountCount(instagramAccounts)}, with unlimited automations, DMs and contacts.`,
    tax_category: "saas" as const,
    // Clear country and currency overrides so only the USD base price remains.
    pricing_mode: null,
    metadata: { [PLAN_KEY]: plan, [INTERVAL_KEY]: interval },
    price: {
      type: "recurring_price" as const,
      currency: "USD" as const,
      price: prices.USD[interval],
      payment_frequency_count: 1,
      payment_frequency_interval: FREQUENCY[interval],
      subscription_period_count: TERM_YEARS,
      subscription_period_interval: "Year" as const,
      tax_inclusive: true,
      trial_period_days: 0,
      purchasing_power_parity: false,
    },
  }
}

function tagged(product: Product): CatalogEntry | null {
  const plan = PLAN_IDS.find((id) => id === product.metadata[PLAN_KEY])
  const interval = BILLING_INTERVALS.find(
    (id) => id === product.metadata[INTERVAL_KEY]
  )
  return plan && interval ? { plan, interval } : null
}

/** Describes how the product differs from its spec, or null when it matches. */
function priceDifference(product: Product, entry: CatalogEntry): string | null {
  const spec = productSpec(entry.plan, entry.interval)
  const price = product.price_detail

  if (price?.type !== "recurring_price") return "it is not a subscription"
  if (
    price.currency !== spec.price.currency ||
    price.price !== spec.price.price
  )
    return `it costs ${price.price} ${price.currency}, not ${spec.price.price} ${spec.price.currency}`
  if (
    price.payment_frequency_interval !==
      spec.price.payment_frequency_interval ||
    price.payment_frequency_count !== 1
  )
    return "it renews on a different schedule"
  if (product.tax_inclusive !== true) return "its price is not tax inclusive"
  if (product.pricing_mode !== spec.pricing_mode)
    return "it has localized pricing enabled"
  if (price.trial_period_days !== 0) return "it has an unexpected trial"
  if (price.purchasing_power_parity) return "it has automatic country discounts"
  return null
}

async function listTaggedProducts(
  client: DodoClient
): Promise<Map<string, Product[]>> {
  const found = new Map<string, Product[]>()

  await request("list the billing products", async () => {
    for await (const product of client.products.list({
      recurring: true,
      archived: false,
    })) {
      const entry = tagged(product)
      if (!entry) continue
      const id = key(entry.plan, entry.interval)
      found.set(id, [...(found.get(id) ?? []), product])
    }
  })

  return found
}

async function localizedPrices(client: DodoClient, productId: string) {
  const { items } = await request("list the product's localized prices", () =>
    client.products.localizedPrices.list(productId)
  )
  return items
}

/**
 * Finds the product for every plan and interval and checks that Dodo charges
 * what the plans say, so the prices shown are the prices paid.
 */
export async function loadCatalog(client: DodoClient): Promise<DodoCatalog> {
  const tagged = await listTaggedProducts(client)
  const productsByEntry = new Map<string, string>()

  for (const entry of entries) {
    const label = `${PLANS[entry.plan].name} (${entry.interval})`
    const products = tagged.get(key(entry.plan, entry.interval)) ?? []
    const product = products[0]

    if (!product) {
      throw new InternalError(
        `Dodo Payments has no product for ${label}. Run ${SETUP_COMMAND}.`
      )
    }
    if (products.length > 1) {
      throw new InternalError(
        `Dodo Payments has several products for ${label}. Archive all but one.`
      )
    }

    const difference = priceDifference(product, entry)
    const localized = await localizedPrices(client, product.product_id)
    const problem =
      difference ?? (localized.length > 0 ? "it has localized prices" : null)

    if (problem) {
      throw new InternalError(
        `The Dodo Payments product for ${label} does not match the plan: ${problem}. Run ${SETUP_COMMAND}.`
      )
    }

    productsByEntry.set(key(entry.plan, entry.interval), product.product_id)
  }

  return new DodoCatalog(productsByEntry)
}

/**
 * Creates or corrects the product for every plan and interval. A price change
 * applies to new subscriptions; Dodo keeps existing ones at their price.
 */
export async function syncCatalog(
  client: DodoClient,
  log: (line: string) => void
): Promise<void> {
  const tagged = await listTaggedProducts(client)

  for (const entry of entries) {
    const spec = productSpec(entry.plan, entry.interval)
    const products = tagged.get(key(entry.plan, entry.interval)) ?? []

    if (products.length > 1) {
      throw new Error(
        `Several products are tagged ${entry.plan} ${entry.interval}: ${products
          .map((product) => product.product_id)
          .join(", ")}. Archive all but one, then run this again.`
      )
    }

    const existing = products[0]
    let productId: string
    if (!existing) {
      const created = await request(`create ${spec.name}`, () =>
        client.products.create(spec)
      )
      productId = created.product_id
      log(`Created ${spec.name}: ${productId}`)
    } else {
      productId = existing.product_id
      if (priceDifference(existing, entry)) {
        await request(`update ${spec.name}`, () =>
          client.products.update(productId, spec)
        )
        log(`Updated ${spec.name}: ${productId}`)
      } else {
        log(`${spec.name} is up to date: ${productId}`)
      }
    }

    // Dodo normally archives rules when pricing_mode is cleared. Also remove
    // any remaining active rules, including products already in base-only mode.
    for (const rule of await localizedPrices(client, productId)) {
      await request(`archive a localized price of ${spec.name}`, () =>
        client.products.localizedPrices.archive(rule.id, {
          product_id: productId,
        })
      )
      log(`  Archived localized price: ${rule.id}`)
    }
  }
}
