-- Pages where the owner uploads photos and videos from their browser for an
-- agent that cannot send files to storage itself, such as one whose sandbox
-- blocks the storage host.

create table public.upload_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- In the owner's order, the first is a carousel's cover: [{ "url": …, "type": … }].
  media jsonb,
  expires_at timestamptz not null,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint upload_links_media_check
    check (
      (media is null) = (uploaded_at is null)
      and (
        media is null
        or (
          jsonb_typeof(media) = 'array'
          and jsonb_array_length(media) between 1 and 10
        )
      )
    )
);

create index upload_links_workspace_id_created_at_idx
  on public.upload_links (workspace_id, created_at);

alter table public.upload_links enable row level security;

revoke all on table public.upload_links from anon, authenticated, service_role;
grant select on table public.upload_links to authenticated;
grant select, insert, update, delete on table public.upload_links to service_role;

create policy "Owners can read their workspace's upload links"
  on public.upload_links
  for select
  to authenticated
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = (select auth.uid())
    )
  );
