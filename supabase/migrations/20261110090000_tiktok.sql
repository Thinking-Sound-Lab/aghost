-- TikTok channels next to the other six platforms.
--
-- Additive rollout: apply before the API. The previous API never connects a
-- TikTok account or writes the new column, so it keeps working until the new
-- API replaces it.

alter table public.instagram_accounts
  drop constraint instagram_accounts_platform_check,
  add constraint instagram_accounts_platform_check check (
    platform in ('instagram', 'facebook', 'linkedin', 'twitter', 'threads', 'youtube', 'tiktok')
  );

-- TikTok requires an audience, interactions and a disclosure on every post,
-- and needs a photo or video.
alter table public.scheduled_posts
  add column tiktok jsonb,
  add constraint scheduled_posts_tiktok_check check (
    (platform = 'tiktok') = (tiktok is not null)
    and (
      tiktok is null
      or (
        jsonb_typeof(tiktok) = 'object'
        and tiktok->>'privacyLevel' in ('everyone', 'friends', 'followers', 'only_me')
      )
    )
  ),
  drop constraint scheduled_posts_media_check,
  add constraint scheduled_posts_media_check check (
    jsonb_typeof(media) = 'array'
    and jsonb_array_length(media) <= 10
    and (caption is not null or jsonb_array_length(media) > 0)
    and (platform not in ('instagram', 'youtube', 'tiktok') or jsonb_array_length(media) > 0)
  );

-- Account webhooks store TikTok connections and disconnections too.
create or replace function public.process_account_webhook(
  p_id text, p_type text, p_kind text, p_payload jsonb, p_account jsonb
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_set uuid;
  v_workspace uuid;
  v_outcome text := 'ignored';
  v_rows integer;
  v_supported boolean := p_account->>'platform' in (
    'instagram', 'facebook', 'linkedin', 'twitter', 'threads', 'youtube', 'tiktok'
  );
begin
  insert into public.webhook_events (id, type, payload, status)
  values (p_id, p_type, p_payload, 'received') on conflict (id) do nothing;
  select status into v_status from public.webhook_events where id = p_id for update;
  if v_status in ('processed', 'ignored') then return 'duplicate'; end if;

  if p_kind = 'account_connected' and v_supported then
    select id, workspace_id into v_set, v_workspace from public.social_sets
    where zernio_profile_id = p_account->>'providerProfileId';
    if v_workspace is not null then
      insert into public.instagram_accounts (
        workspace_id, social_set_id, zernio_account_id, platform, username,
        display_name, status
      ) values (
        v_workspace, v_set, p_account->>'providerAccountId', p_account->>'platform',
        p_account->>'username', p_account->>'displayName', 'connected'
      ) on conflict (zernio_account_id) do update set
        username = excluded.username, display_name = excluded.display_name,
        status = 'connected', disconnect_reason = null
      where public.instagram_accounts.workspace_id = excluded.workspace_id;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then v_outcome := 'processed'; end if;
    end if;
  elsif p_kind = 'account_disconnected' and v_supported then
    update public.instagram_accounts set status = 'disconnected',
      disconnect_reason = p_account->>'reason'
    where zernio_account_id = p_account->>'providerAccountId';
    get diagnostics v_rows = row_count;
    if v_rows > 0 then v_outcome := 'processed'; end if;
  end if;
  update public.webhook_events set status = v_outcome, error = null,
    processed_at = now() where id = p_id;
  return v_outcome;
end;
$$;
