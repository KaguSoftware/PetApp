// Supabase Edge Function: send-due-reminders (EAS phase — not yet scheduled)
//
// Runs on a pg_cron schedule (every 5 minutes) once remote push goes live:
//   select cron.schedule('send-due-reminders', '*/5 * * * *', $$
//     select net.http_post(
//       url := '<PROJECT_URL>/functions/v1/send-due-reminders',
//       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
//     ) $$);
//
// Finds reminders due in the last window that aren't done, joins household
// members to their push tokens, dedupes per recipient by reminder id, and
// POSTs to Expo's push API. Requires migration 0015_push_tokens.sql.

import { createClient } from "npm:@supabase/supabase-js@2";

const WINDOW_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();

  const { data: due, error } = await admin
    .from("reminders")
    .select("id, title, due, household_id, pet_id")
    .eq("done", false)
    .gte("due", now - WINDOW_MS)
    .lte("due", now);
  if (error) return new Response(error.message, { status: 500 });
  if (!due || due.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });

  const householdIds = [...new Set(due.map((r) => r.household_id))];
  const { data: memberships } = await admin.from("household_members").select("household_id, user_id").in("household_id", householdIds);
  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  const { data: tokens } = await admin.from("push_tokens").select("user_id, expo_token").in("user_id", userIds);

  const messages: { to: string; title: string; body?: string; data: { url: string } }[] = [];
  for (const reminder of due) {
    const users = (memberships ?? []).filter((m) => m.household_id === reminder.household_id).map((m) => m.user_id);
    for (const token of (tokens ?? []).filter((t) => users.includes(t.user_id))) {
      messages.push({ to: token.expo_token, title: reminder.title, data: { url: "/reminders" } });
    }
  }

  // Expo accepts up to 100 messages per request.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (res.ok) sent += Math.min(100, messages.length - i);
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
