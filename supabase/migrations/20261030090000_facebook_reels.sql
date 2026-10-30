-- A Facebook copy publishes as a feed post or as a reel from one video.
-- Additive: the previous API only schedules feed posts, which the default
-- keeps, so it can run during the rollout.
alter table public.scheduled_posts
  add column facebook_reel boolean not null default false,
  add constraint scheduled_posts_facebook_reel_check check (
    not facebook_reel
    or (
      platform = 'facebook'
      and kind = 'post'
      and jsonb_array_length(media) = 1
      and media @> '[{"type":"video"}]'::jsonb
    )
  );
