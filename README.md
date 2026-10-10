# aghost

Instagram comment-to-DM automation using Next.js, Zustand, Supabase, and Zernio.

## Run locally

Requirements: Node.js 22 or newer, pnpm, and Docker with Docker Compose.

```sh
pnpm install
pnpm dev
```

`pnpm dev` prepares the root `.env`, starts Supabase's Docker containers, applies pending local migrations, starts the API in Docker, and then starts Next.js on the host. API source changes reload inside its container; web changes use Next.js hot reload.

Open [localhost:3000](http://localhost:3000). The API is published at `127.0.0.1:4000`; Supabase Studio is at [localhost:54323](http://localhost:54323), and local email previews are at [localhost:54324](http://localhost:54324).

Closing the web process leaves the Docker services running. Stop this project's API, webhook tunnel, and Supabase with:

```sh
pnpm local:stop
```

This preserves database data. `pnpm local:start` starts or rebuilds the Docker backend without starting the web app. `pnpm local:logs` follows API logs, and `pnpm local:status` shows the API container. Re-run `pnpm local:start` after changing environment variables or dependencies.

The Supabase CLI manages its Docker services from `supabase/config.toml`; `compose.yaml` manages the API and connects it to Supabase's existing Docker network. This stack uses this project's fixed local ports and should run in one workspace at a time.

## Zernio webhooks locally

Zernio notifies the API when an Instagram account connects or disconnects. To receive those events on your machine:

```sh
pnpm local:tunnel
```

This starts a [Cloudflare quick tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) in Docker, which needs no Cloudflare account. The tunnel makes only `/api/webhooks/zernio` public, and Cloudflare answers 404 for every other path. The command then:

1. Generates `ZERNIO_WEBHOOK_SECRET` in the root `.env` if it is empty.
2. Creates or updates a Zernio webhook named `aghost local tunnel` that points to the tunnel address and subscribes to `account.connected` and `account.disconnected`.
3. Asks Zernio to send a test event through the tunnel and fails if it is not delivered.

`ZERNIO_API_KEY` is required. Deliveries and their status codes appear in `pnpm local:logs`; a 401 means the signature did not match the secret. The trycloudflare.com address changes each time the tunnel starts, so run `pnpm local:tunnel` again after `pnpm local:stop` or a Docker restart. While the tunnel is stopped, Zernio's deliveries to the previous address fail, and you can resend them from Zernio's webhook logs.

Connecting an account does not depend on the tunnel: after Zernio's authorization, `/accounts/callback` reads the account list from Zernio directly.

## One environment file

**`.env` at the repository root is the only local configuration file.** Its template is [.env.example](.env.example).

`pnpm dev` or `pnpm setup:local` creates it from the template and fills empty local Supabase credentials. Setup preserves existing values and does not reset the database. Do not add env files under `apps/server` or `apps/web`; both apps get their settings from the root file.

Fill this field in the root `.env`:

```dotenv
ZERNIO_API_KEY=your-api-key
```

Then run `pnpm local:start` to apply the changes to the API container. With the credentials empty, authentication and workspaces work locally; Instagram connections are explicitly unavailable. The application does not substitute sample accounts or analytics.

Only `API_URL` from the root file is passed to Next.js for its server-side `/api` proxy. Supabase and Zernio credentials are provided to the API container. The root env file and backups are ignored by Git and excluded from Docker images.

`SUPABASE_URL` is the host address used by local tools and tests. Compose supplies `http://supabase_kong_aghost:8000` to the API container so it connects directly over the Supabase Docker network.

`APP_URL` is the browser-facing origin used for request-origin checks and redirects. For a public or tunneled setup, update it and allow `/api/auth/callback` in Supabase's redirect URLs. Zernio redirects authorized Instagram connections to `/accounts/callback`. In production, configure the deployed `/api/webhooks/zernio` endpoint in Zernio with the same webhook secret and subscribe to `account.connected` and `account.disconnected`.

No provider credentials are exposed to browser JavaScript. Session cookies are HttpOnly and use Secure on HTTPS origins. The API's start command accepts injected environment variables without requiring an env file, which also supports container hosting.

## Structure

```text
.env.example          Single configuration template
compose.yaml          Local API container, webhook tunnel, and Supabase network
apps/web/             Next.js pages (Home, Contacts, Automations, Inbox,
                      Settings), UI features, and Zustand stores
apps/server/          HTTP server entry point and Dockerfile
packages/api/         Contracts, API client, domain services, HTTP routes,
                      Supabase repositories, and Zernio adapters
packages/supabase/    Backend database clients and generated database types
packages/ui/          Shared shadcn UI components
supabase/             CLI config and forward-only migrations
scripts/              Local setup, root env, and verification helpers
```

The web app calls the shared API client through a same-origin `/api` proxy. Business rules and provider calls live in `packages/api`. Supabase row-level security scopes reads to a workspace; the API verifies the user before privileged writes. Account webhook updates and their deduplication ledger entry commit in one database transaction.

## Checks

```sh
pnpm verify
pnpm verify:local
```

`pnpm verify` runs type checks, lint, root env tests, backend integration tests, and production builds. Integration tests require the local Supabase stack started by `pnpm setup:local` or `pnpm dev`. Provider adapter tests use a local HTTP fixture and do not send real Instagram messages.

With the app running, `pnpm verify:local` checks pages, HttpOnly authentication through the Next.js proxy, workspace persistence, sign-out, and password-recovery emails and PKCE callbacks through the running Docker API. It removes its disposable local user and test emails. Browser interaction and visual review are separate checks.

Live OAuth and comment-to-DM delivery require configured Zernio credentials and an authorized professional Instagram account.

Useful commands: `pnpm db:status` and `pnpm db:types`. `pnpm db:reset` is destructive and intended only for disposable local data.

