-- Opening DM: an optional first message with one button. The automation's DM
-- follows when the commenter taps it. Both columns are set, or neither is.
alter table public.automations
  add column opening_dm_message text,
  add column opening_dm_button text,
  add constraint automations_opening_dm_check
    check ((opening_dm_message is null) = (opening_dm_button is null)),
  add constraint automations_opening_dm_message_length
    check (char_length(opening_dm_message) between 1 and 640),
  add constraint automations_opening_dm_button_length
    check (char_length(opening_dm_button) between 1 and 20);
