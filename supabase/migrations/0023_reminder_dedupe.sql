-- Kills duplicate auto-generated alert reminders at the database level.
--
-- The app raises care/feeding alerts as `reminders` rows with `alert = true`
-- (health alerts also set `alert_kind`; vet-flavored ones leave it null and are
-- distinguished by title). The raise paths run on every hydration AND on a
-- 15-minute timer, on every device — in-memory guards race across
-- devices/loads, so the table grew a duplicate row per cycle ("billions of
-- reminders"). The clients then deduped at render time, masking the growth.
--
-- Additive: one generated column + a partial unique index scoped to open alert
-- rows only (`alert = true and done = false`). Manual reminders and the web
-- demo's inserts are untouched unless they insert the exact same open alert —
-- in which case being rejected is the fix, not a regression.
--
-- Order matters: purge existing duplicates BEFORE creating the unique index.

-- 1) Purge duplicates, keeping the earliest row of each (pet, kind-or-title,
--    local-agnostic UTC day) group. `due` is a ms-epoch bigint.
delete from reminders r
using reminders keep
where r.alert = true and keep.alert = true
  and r.done = false and keep.done = false
  and r.pet_id = keep.pet_id
  and coalesce(r.alert_kind, r.title) = coalesce(keep.alert_kind, keep.title)
  and (to_timestamp(r.due / 1000.0) at time zone 'utc')::date
      = (to_timestamp(keep.due / 1000.0) at time zone 'utc')::date
  and r.ctid > keep.ctid;

-- 2) The alert's calendar day (UTC), derived once by the database so every
--    client agrees on the dedupe key.
alter table reminders add column if not exists alert_day date
  generated always as ((to_timestamp(due / 1000.0) at time zone 'utc')::date) stored;

-- 3) One open alert per (pet, kind-or-title, day). Partial + expression index:
--    ordinary reminders (alert = false/null) and completed alerts are exempt.
create unique index if not exists reminders_alert_dedupe
  on reminders (pet_id, coalesce(alert_kind, title), alert_day)
  where alert = true and done = false;
