import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useHousehold, useSession } from "@/data";
import { normalizeInviteCode, peekPendingInvite, setPendingInvite } from "@/lib/pendingInvite";

/** The invite code in `peting://join?code=...` (or the Expo Go `exp://.../--/join?code=...` shape). */
function codeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  // `peting://join?code=...` puts "join" in the host; Expo Go puts it in the path.
  const path = (parsed.path ?? "").replace(/^\/+|\/+$/g, "");
  const isJoin = parsed.hostname === "join" || path === "join" || path.endsWith("/join");
  if (!isJoin) return null;
  const raw = parsed.queryParams?.code;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? normalizeInviteCode(value) : null;
}

/**
 * Renders nothing. Inbound invite links: signed out -> park the code for after
 * sign-in; signed in -> open /join with it. After sign-in, a parked code opens /join.
 */
export function InviteLinkHandler() {
  const { ready, session } = useSession();
  const household = useHousehold();
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !url || handledUrl.current === url) return;
    handledUrl.current = url;
    const code = codeFromUrl(url);
    if (!code) return;
    if (session) {
      // navigate() reuses an already-open /join (expo-router also routes the link itself).
      router.navigate({ pathname: "/join", params: { code } });
    } else {
      void setPendingInvite(code);
    }
  }, [ready, session, url]);

  // Replay a parked code once, after the household has loaded so Home's own redirect settles first.
  const replayed = useRef(false);
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      replayed.current = false;
      return;
    }
    if (!household.ready || replayed.current) return;
    replayed.current = true;
    setTimeout(() => {
      void peekPendingInvite().then((code) => {
        if (code) router.push("/join");
      });
    }, 400);
  }, [userId, household.ready]);

  return null;
}
