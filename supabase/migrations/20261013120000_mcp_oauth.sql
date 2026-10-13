-- MCP clients such as Claude connect by signing in with OAuth. A client
-- registers itself (RFC 7591), the workspace owner approves it, and the access
-- token it receives is an ordinary workspace API key.
create table public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  -- Null for public clients, which prove themselves with PKCE alone.
  secret_hash text check (secret_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

-- One sign-in in progress. Approval sets the workspace and the hash of a
-- single-use code; exchanging the code deletes the row.
create table public.oauth_authorizations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.oauth_clients (id) on delete cascade,
  redirect_uri text not null check (char_length(redirect_uri) <= 2000),
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  state text check (char_length(state) <= 2000),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  code_hash text unique check (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint oauth_authorizations_approval_check check (
    (workspace_id is null) = (code_hash is null)
  )
);

create index oauth_authorizations_client_id_idx on public.oauth_authorizations (client_id);
create index oauth_authorizations_workspace_id_idx on public.oauth_authorizations (workspace_id);
create index oauth_authorizations_expires_at_idx on public.oauth_authorizations (expires_at);

alter table public.oauth_clients enable row level security;
alter table public.oauth_authorizations enable row level security;
revoke all on public.oauth_clients from public, anon, authenticated, service_role;
revoke all on public.oauth_authorizations from public, anon, authenticated, service_role;
grant select, insert on public.oauth_clients to service_role;
grant select, insert, update, delete on public.oauth_authorizations to service_role;
-- No user-facing policies: only the backend reads and writes these tables.
