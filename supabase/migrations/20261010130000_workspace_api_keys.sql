-- API keys grant a bounded set of capabilities to exactly one workspace.
-- Tokens have 256 bits of entropy; only their SHA-256 hashes are stored.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  token_prefix text not null check (char_length(token_prefix) = 12),
  scopes text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint api_keys_scopes_check check (
    cardinality(scopes) between 1 and 7
    and scopes <@ array[
      'workspace:read', 'accounts:read', 'automations:read',
      'automations:write', 'contacts:read', 'inbox:read', 'inbox:write'
    ]::text[]
  )
);

create index api_keys_workspace_id_idx on public.api_keys (workspace_id);
alter table public.api_keys enable row level security;
revoke all on public.api_keys from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.api_keys to service_role;
-- No user-facing policies. Cookie-authenticated backend routes manage keys
-- and return metadata only, never the hash or an existing token.
