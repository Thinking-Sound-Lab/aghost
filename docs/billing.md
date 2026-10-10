# Pricing and billing

Every plan includes MCP and REST API access, the dashboard, and the current Instagram automation features, with unlimited automations, contacts and DMs within Instagram's limits and fair use. Plans differ by connected Instagram accounts, never by contacts or messages. There is no free plan or trial in the billing catalog.

| Plan     | Accounts | Monthly | Yearly |
| -------- | -------- | ------- | ------ |
| Pro      | 1        | $9      | $108   |
| Growth   | 2        | $19     | $228   |
| Business | 5        | $49     | $588   |

All countries, including India, pay in US dollars. Prices include tax. Yearly billing costs twelve months, paid upfront. The plan definitions in `packages/api/src/contract/billing.ts` are shared with the UI; the backend validates Dodo's catalog against them before checkout.

## Dodo setup

1. Set `DODO_PAYMENTS_ENVIRONMENT=test_mode` and `DODO_PAYMENTS_API_KEY` in the root `.env`.
2. Run `pnpm billing:setup`. It creates or updates six recurring SaaS products, tagged by plan and interval. Each product has a USD base price, tax-inclusive pricing, no trial and no automatic country discounts. Reruns reuse the tagged products and archive all country and currency overrides. Duplicate product tags are refused. Disable Charm Pricing under Dodo's Settings → Business so checkout uses the exact advertised amounts. This is a business-wide setting that also affects other products in that business; the setup script does not change it.
3. Run `pnpm local:tunnel`. It registers a Dodo test-mode endpoint, stores its signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`, and recreates the Docker API with it. The tunnel exposes only `/api/webhooks/zernio` and `/api/webhooks/dodo`.
4. Run `pnpm dev`, sign in, and open Settings → Plan and Billing. Choose a plan to open hosted checkout. Use Dodo's [test payment methods](https://docs.dodopayments.com/features/payment-methods/india#testing).

For production, create the catalog in `live_mode` with that mode's API key. Register `https://<ApiUrl>/api/webhooks/dodo` in Dodo and subscribe to subscription events plus `payment.succeeded`, `payment.failed`, `payment.cancelled`, and `payment.processing`. Add all three Dodo values to the existing `aghost/prod/api` Secrets Manager JSON **before deploying the changed ECS task definition**. Use empty key/secret strings if billing is intentionally unavailable. Apply `20261011090000_workspace_billing.sql` before releasing the API.

Checkout requests USD and disables currency selection, so every country pays in USD even if Adaptive Currency is enabled in the Dodo account. Before creating a session, the backend checks Dodo's USD checkout quote against the advertised initial and recurring amounts and refuses checkout if account settings such as Charm Pricing change them. Pricing does not depend on hosting geolocation or country headers. Customers enter their billing address at checkout; Dodo uses it to calculate the tax included in the price. Confirm both India and non-India hosted checkouts in the configured Dodo account before releasing billing.

See [Adaptive Currency](https://docs.dodopayments.com/features/adaptive-currency), [tax-inclusive pricing](https://docs.dodopayments.com/features/tax-inclusive-pricing), and [India payment methods](https://docs.dodopayments.com/features/payment-methods/india). UPI requires INR billing and is unavailable with this USD-only catalog. Updating the catalog applies to new subscriptions; it does not change the price of existing subscriptions.

## Subscription lifecycle

- Only the authenticated workspace owner can start checkout, change plans, or open the billing portal. API keys and MCP do not expose billing mutations. Payer details come from the authenticated identity, and the backend fixes all return URLs.
- Checkout return and Manage billing return open Settings → Plan and Billing. The UI reconciles with Dodo; it does not trust redirect query parameters. Customers can also refresh billing manually.
- Webhooks verify the raw body with Standard Webhooks, including timestamp freshness. Subscription and payment events cause a read of Dodo's current subscription and payment records. Redeliveries and delayed events converge to the current state.
- An initial active mandate does not grant access until Dodo reports a successful, nonzero payment belonging to that subscription and customer. Indian payments can remain processing for about 48 hours. Existing paid subscriptions retain Dodo's `past_due` grace period and stop on `on_hold`, `paused`, cancellation, failure or expiry.
- Plan changes charge prorated amounts immediately and use `prevent_change` on payment failure. A returned payment approval URL is forwarded to the browser. Access reflects the provider's actual product after payment, not the requested product.
- The application blocks a downgrade while too many accounts are connected. A downgrade performed in Dodo's portal is still reconciled; automations are paused if it exceeds the new limit. They must be turned on again after the owner disconnects accounts or upgrades.
- Postgres serializes new account connections per workspace, covering both OAuth sync and webhooks. A connection exceeding the plan is stored as disconnected and removed from Zernio. A failed provider disconnect is retried when the webhook is redelivered, even if the database event was already committed.
- When the plan ends, the backend pauses running automations at Zernio before marking them paused locally. Failed pauses fail the webhook request so Dodo can retry. The subscription is kept for payment recovery; accounts, drafts, contacts and history remain visible.

## Verification

`pnpm setup:test` starts this project's local Supabase and applies pending migrations without resetting data. `pnpm verify` runs typecheck, lint, tests, and the production build. Billing tests use the installed Dodo SDK with an in-process fixture transport, plus real local Postgres/Auth for the HTTP lifecycle, tenancy and concurrent account limits. They never call a live payment provider. A configured hosted checkout and actual sandbox payment must still be verified with Dodo credentials.
