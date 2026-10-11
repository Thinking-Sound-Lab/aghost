import DodoPayments from "dodopayments"
import { PLAN_IDS, BILLING_INTERVALS } from "../contract/billing"
import { productSpec } from "../infrastructure/dodo/dodo-catalog"

type FixtureObject = Record<string, unknown>

/** Uses the real Dodo SDK with an in-process transport; no provider is contacted. */
export function dodoFixture(withProducts = true) {
  const products = new Map<string, FixtureObject>()
  const rules = new Map<string, FixtureObject[]>()
  const requests: {
    method: string
    path: string
    query: URLSearchParams
    body: FixtureObject
  }[] = []
  const checkouts = new Map<string, FixtureObject>()
  const state = {
    subscription: null as FixtureObject | null,
    payments: [] as FixtureObject[],
    paymentLink: null as string | null,
    failChange: false,
    quotedTotal: null as number | null,
  }
  if (withProducts) {
    for (const plan of PLAN_IDS)
      for (const interval of BILLING_INTERVALS) {
        const { price, ...spec } = productSpec(plan, interval)
        const id = `pdt_${plan}_${interval}`
        products.set(id, {
          ...spec,
          product_id: id,
          price_detail: price,
          tax_inclusive: true,
        })
        rules.set(id, [])
      }
  }

  function subscription(overrides: FixtureObject = {}) {
    return {
      subscription_id: "sub_1",
      customer: { customer_id: "cus_1" },
      product_id: "pdt_pro_monthly",
      status: "active",
      currency: "USD",
      next_billing_date: "2026-11-11T00:00:00Z",
      previous_billing_date: "2026-10-11T00:00:00Z",
      cancel_at_next_billing_date: false,
      created_at: "2026-10-11T00:00:00Z",
      ...overrides,
    }
  }
  function payment(overrides: FixtureObject = {}) {
    return {
      payment_id: "pay_1",
      status: "succeeded",
      total_amount: 900,
      currency: "USD",
      customer: { customer_id: "cus_1" },
      subscription_id: "sub_1",
      subscription_ids: ["sub_1"],
      created_at: "2026-10-11T00:00:00Z",
      ...overrides,
    }
  }
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = init?.method ?? "GET"
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as FixtureObject)
        : {}
    requests.push({ method, path: url.pathname, query: url.searchParams, body })
    const respond = (value: unknown, status = 200) =>
      Response.json(value, { status })
    const items = (value: unknown[]) => ({
      items:
        Number(url.searchParams.get("page_number") ?? 1) === 1 ? value : [],
    })
    if (url.pathname === "/products") {
      if (method === "GET")
        return respond(
          items(
            [...products.values()].filter(
              (product) =>
                url.searchParams.get("archived") !== "false" ||
                !product.is_archived
            )
          )
        )
      const id = `pdt_created_${products.size}`
      products.set(id, {
        ...body,
        product_id: id,
        price_detail: body.price,
        tax_inclusive: true,
      })
      return respond({ ...products.get(id), product_id: id }, 201)
    }
    const localized = url.pathname.match(
      /^\/products\/([^/]+)\/localized-prices(?:\/([^/]+))?$/
    )
    if (localized) {
      const id = localized[1]!
      const current = rules.get(id) ?? []
      if (method === "GET") return respond({ items: current })
      if (method === "DELETE") {
        rules.set(
          id,
          current.filter((rule) => rule.id !== localized[2])
        )
        return new Response(null, { status: 204 })
      }
      if (method === "POST") {
        const rule = {
          ...body,
          id: `lcp_${id}`,
          mode: products.get(id)?.pricing_mode,
        }
        rules.set(id, [...current, rule])
        return respond(rule, 201)
      }
      const updated = current.map((rule) =>
        rule.id === localized[2] ? { ...rule, ...body } : rule
      )
      rules.set(id, updated)
      return respond(updated[0])
    }
    const product = url.pathname.match(/^\/products\/([^/]+)$/)
    if (product && method === "GET")
      return products.has(product[1]!)
        ? respond(products.get(product[1]!))
        : respond({ message: "Not found" }, 404)
    if (product && method === "PATCH") {
      // Dodo archives rules whose mode differs from the updated product.
      if ("pricing_mode" in body) {
        rules.set(
          product[1]!,
          (rules.get(product[1]!) ?? []).filter(
            (rule) => rule.mode === body.pricing_mode
          )
        )
      }
      products.set(product[1]!, {
        ...products.get(product[1]!),
        ...body,
        price_detail: body.price,
        tax_inclusive: true,
      })
      return respond(products.get(product[1]!))
    }
    if (url.pathname === "/customers")
      return respond({ customer_id: "cus_1", ...body }, 201)
    if (url.pathname === "/checkouts/preview") {
      const cart = body.product_cart as { product_id: string }[]
      const price = products.get(cart[0]!.product_id)!.price_detail as {
        price: number
      }
      const total = state.quotedTotal ?? price.price
      return respond({
        currency: "USD",
        current_breakup: { total_amount: total },
        recurring_breakup: { total_amount: total },
      })
    }
    if (url.pathname === "/checkouts") {
      const id = `cks_${checkouts.size + 1}`
      checkouts.set(id, {
        id,
        created_at: new Date().toISOString(),
        payment_id: null,
        payment_status: null,
      })
      return respond(
        {
          checkout_url: "https://checkout.example/session",
          session_id: id,
        },
        201
      )
    }
    const checkout = url.pathname.match(/^\/checkouts\/([^/]+)$/)
    if (checkout) return respond(checkouts.get(checkout[1]!))
    if (url.pathname === "/subscriptions")
      return respond(items(state.subscription ? [state.subscription] : []))
    // Dodo lists payments without their discounts.
    if (url.pathname === "/payments")
      return respond(
        items(state.payments.map(({ discounts: _discounts, ...rest }) => rest))
      )
    const paymentDetail = url.pathname.match(/^\/payments\/([^/]+)$/)
    if (paymentDetail) {
      const found = state.payments.find(
        (candidate) => candidate.payment_id === paymentDetail[1]
      )
      return found ? respond(found) : respond({ message: "Not found" }, 404)
    }
    if (url.pathname === "/subscriptions/sub_1")
      return state.subscription
        ? respond(state.subscription)
        : respond({ message: "Not found" }, 404)
    if (url.pathname === "/subscriptions/sub_1/change-plan") {
      if (state.failChange) return respond({ message: "Payment declined" }, 400)
      if (!state.paymentLink && state.subscription)
        state.subscription = {
          ...state.subscription,
          product_id: body.product_id,
        }
      return respond({ payment_link: state.paymentLink })
    }
    if (url.pathname === "/customers/cus_1/customer-portal/session")
      return respond({ link: "https://portal.example/session" })
    throw new Error(
      `Unexpected Dodo fixture request: ${method} ${url.pathname}`
    )
  }
  const client = new DodoPayments({
    bearerToken: "fixture-dodo-key",
    baseURL: "http://dodo.fixture",
    fetch: transport,
    maxRetries: 0,
  })
  return {
    client,
    products,
    rules,
    requests,
    checkouts,
    state,
    subscription,
    payment,
  }
}
