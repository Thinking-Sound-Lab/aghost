-- Scheduled Instagram posts, which Zernio publishes at their time, and
-- automations that answer comments on one of them once it is published.

--------------------------------------------------------------------------------
-- scheduled_posts: posts scheduled through aghost, mirrored from Zernio
--------------------------------------------------------------------------------

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  instagram_account_id uuid not null
    references public.instagram_accounts (id) on delete cascade,
  zernio_post_id text not null,
  kind text not null,
  caption text,
  -- In order, the first is a carousel's cover: [{ "url": …, "type": … }].
  media jsonb not null,
  scheduled_for timestamptz not null,
  status text not null,
  -- What Instagram reports once the post is published.
  platform_post_id text,
  permalink text,
  published_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_posts_zernio_post_id_key unique (zernio_post_id),
  constraint scheduled_posts_kind_check check (kind in ('post', 'story')),
  constraint scheduled_posts_status_check
    check (status in ('scheduled', 'publishing', 'published', 'failed')),
  constraint scheduled_posts_caption_length
    check (char_length(caption) between 1 and 2200),
  constraint scheduled_posts_media_check
    check (
      jsonb_typeof(media) = 'array'
      and jsonb_array_length(media) between 1 and 10
    ),
  constraint scheduled_posts_error_check
    check (status = 'failed' or error is null)
);

create index scheduled_posts_workspace_id_scheduled_for_idx
  on public.scheduled_posts (workspace_id, scheduled_for);

create index scheduled_posts_instagram_account_id_idx
  on public.scheduled_posts (instagram_account_id);

create trigger scheduled_posts_set_updated_at
  before update on public.scheduled_posts
  for each row execute function private.set_updated_at();

alter table public.scheduled_posts enable row level security;

revoke all on table public.scheduled_posts from anon, authenticated, service_role;
grant select on table public.scheduled_posts to authenticated;
grant select, insert, update, delete on table public.scheduled_posts to service_role;

create policy "Owners can read their workspace's scheduled posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );

--------------------------------------------------------------------------------
-- automations: a third trigger, a post scheduled in aghost
--------------------------------------------------------------------------------

-- The backend deletes a post's automations from Zernio before the post. The
-- cascade only applies when the account or workspace itself is deleted.
alter table public.automations
  add column scheduled_post_id uuid
    references public.scheduled_posts (id) on delete cascade,
  drop constraint automations_post_scope_check,
  add constraint automations_post_scope_check
    check (post_scope in ('specific_post', 'any_post', 'scheduled_post')),
  add constraint automations_scheduled_post_check
    check ((post_scope = 'scheduled_post') = (scheduled_post_id is not null));

create index automations_scheduled_post_id_idx
  on public.automations (scheduled_post_id);

--------------------------------------------------------------------------------
-- api_keys: permissions to read and schedule posts
--------------------------------------------------------------------------------

alter table public.api_keys
  drop constraint api_keys_scopes_check,
  add constraint api_keys_scopes_check check (
    cardinality(scopes) between 1 and 9
    and scopes <@ array[
      'workspace:read', 'accounts:read', 'automations:read',
      'automations:write', 'posts:read', 'posts:write', 'contacts:read',
      'inbox:read', 'inbox:write'
    ]::text[]
  );

-- Keys that held every permission keep full access, and keys that held every
-- read permission can read posts too.
update public.api_keys
set scopes = scopes || array['posts:read', 'posts:write']
where scopes @> array[
  'workspace:read', 'accounts:read', 'automations:read', 'automations:write',
  'contacts:read', 'inbox:read', 'inbox:write'
]::text[];

update public.api_keys
set scopes = scopes || array['posts:read']
where not scopes @> array['posts:read']::text[]
  and scopes @> array[
    'workspace:read', 'accounts:read', 'automations:read', 'contacts:read',
    'inbox:read'
  ]::text[];
