-- Not-following message: sent to a commenter known not to follow the account
-- when the automation is for followers only. It carries the follow-confirmation
-- button, and the automation's DM follows once they tap it as a follower. Null
-- leaves known non-followers without a reply.
alter table public.automations
  add column not_following_message text,
  add constraint automations_not_following_message_length
    check (char_length(not_following_message) between 1 and 640),
  add constraint automations_not_following_message_follow_check
    check (not_following_message is null or require_follow);
