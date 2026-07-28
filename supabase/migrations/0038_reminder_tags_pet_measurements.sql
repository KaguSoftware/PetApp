-- Two additive columns sets, both nullable, both tolerated by the web-demo
-- client's `select *`. No renames, no drops, no retightening.
--
-- 1. reminders.tag — free-text category for a reminder ("Feeding", "Vet", or
--    anything the user types). The app offers a preset chip list but never
--    constrains the value, so no enum/check here: a check constraint would
--    reject custom tags and would need a migration every time the preset list
--    grows. Auto-raised care alerts get tagged from their alert_kind.
--
-- 2. pets.height_cm / pets.length_cm — body measurements, stored canonically
--    in centimetres (converted to inches for display when the household unit
--    is lb, exactly like weight_kg). Nullable because every pet that already
--    exists has neither, and the add-pet form keeps them optional.

alter table reminders add column if not exists tag text;

alter table pets add column if not exists height_cm numeric
  check (height_cm is null or (height_cm > 0 and height_cm <= 400));
alter table pets add column if not exists length_cm numeric
  check (length_cm is null or (length_cm > 0 and length_cm <= 500));
