-- Trial Reel launch intent. Instagram does not expose whether or when a
-- trial graduated, so publishing-state reconciliation leaves this unchanged.
-- Nullable and additive so the previous API can run during the rollout.
alter table public.scheduled_posts
  add column trial_graduation_strategy text,
  add constraint scheduled_posts_trial_reel_check check (
    trial_graduation_strategy is null
    or (
      trial_graduation_strategy in ('manual', 'automatic')
      and kind = 'post'
      and jsonb_array_length(media) = 1
      and media @> '[{"type":"video"}]'::jsonb
    )
  );
