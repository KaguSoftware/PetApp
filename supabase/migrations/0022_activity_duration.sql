-- Exercise/play measurement — how long a walk/play session lasted, in minutes.
-- Additive to the web-demo schema: one nullable column the web client's
-- `select *` tolerates harmlessly. No renames, no drops, no retightening.
--
-- Only `walk` activities set it today (the Logs duration picker); the column is
-- action-agnostic so future measured actions (swim, training…) can reuse it.

alter table activities add column if not exists duration_minutes int
  check (duration_minutes is null or duration_minutes between 1 and 1440);
