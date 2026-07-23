-- Streak milestone bonus — every 10th consecutive care day pays +20 coins.
--
-- `last_streak_bonus` records the highest milestone already paid (0, 10, 20…)
-- so a reload or a second device can't re-award the same milestone: the client
-- only pays when the live streak crosses a multiple of 10 ABOVE this marker,
-- then advances it (both through the same debounced counters write as
-- coins/streak). When a streak breaks, the client lowers the marker to the
-- current streak's paid floor so future milestones pay again after a rebuild.
--
-- Additive: one defaulted column on households; the web demo ignores it (its
-- coins/streak writes don't touch it), so bonuses pay from mobile only until
-- the web client adopts the same logic.

alter table households add column if not exists last_streak_bonus int not null default 0;
