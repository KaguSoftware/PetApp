revoke update on public.households from authenticated;

grant update (
  name,
  units,
  seen_welcome,
  current_member_id,
  country
) on public.households to authenticated;