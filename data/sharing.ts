import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { normalizeInviteCode } from "@/lib/pendingInvite";
import { cache } from "./cache";
import { supabase } from "./client";
import { optimisticDelete } from "./persist";
import { switchHousehold } from "./household";
import { requireHouseholdId, sessionStore } from "./state";
import { showError, showToast } from "./toasts";

export async function createInvite(): Promise<{ code: string; expiresAt: number }> {
  const hid = requireHouseholdId();
  try {
    const { data, error } = await supabase.rpc("create_invite", {
      hid,
      invite_role: "member",
      target: null,
      ttl_hours: 168,
      uses: null,
    });
    if (error || !data) throw error ?? new Error("create_invite returned nothing");
    const invite = data as { code: string; expires_at: string };
    return { code: invite.code, expiresAt: Date.parse(invite.expires_at) };
  } catch (e) {
    if (__DEV__) console.warn("[data] create_invite failed:", e);
    showError("Couldn't create the invite. Please try again.");
    throw e;
  }
}

type RedeemResult = { ok: true } | { ok: false; reason: "not_found" | "expired" | "already_member" | "rate_limited" };
type Reason = Extract<RedeemResult, { ok: false }>["reason"];

const ERRCODE_REASON: Record<string, Reason> = { P0002: "not_found", P0003: "expired", P0004: "rate_limited" };
const REASONS: readonly string[] = ["not_found", "expired", "already_member", "rate_limited"];

/**
 * Handles both server shapes: the new jsonb `{ok, reason?, household_id?}` and
 * the older one that raises P0002/P0003/P0004 and returns `{household_id, status}`.
 */
export async function redeemInvite(code: string): Promise<RedeemResult> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return { ok: false, reason: "not_found" };

  const { data, error } = await supabase.rpc("redeem_invite", { invite_code: normalized });
  if (error) {
    const reason = ERRCODE_REASON[error.code ?? ""];
    if (reason) return { ok: false, reason };
    if (__DEV__) console.warn("[data] redeem_invite failed:", error.code, error.message);
    showError("Couldn't join. Please try again.");
    throw error;
  }

  const res = (data ?? {}) as { ok?: boolean; reason?: string; household_id?: string; status?: string };
  let outcome: RedeemResult;
  if (typeof res.ok === "boolean") {
    if (!res.ok) {
      const reason = REASONS.includes(res.reason ?? "") ? (res.reason as Reason) : "not_found";
      outcome = { ok: false, reason };
    } else {
      outcome = { ok: true };
    }
  } else {
    // Older server: "active" means the caller was already in that household.
    outcome = res.status === "active" ? { ok: false, reason: "already_member" } : { ok: true };
  }

  const joined = outcome.ok || (outcome.reason === "already_member" && !!res.household_id);
  if (joined && res.household_id && res.status !== "pending") {
    await activateHousehold(res.household_id);
  }
  return outcome;
}

async function activateHousehold(householdId: string): Promise<void> {
  const userId = sessionStore.get().userId;
  if (userId) {
    const { error } = await supabase.from("user_profiles").upsert({ user_id: userId, active_household_id: householdId });
    if (error && __DEV__) console.warn("[data] active household update failed:", error.message);
  }
  await switchHousehold();
}

export async function removeMember(memberId: string): Promise<void> {
  const hid = requireHouseholdId();
  const link = cache.all("links").find((l) => l.memberId === memberId);
  if (!link) {
    showError("That card has no account to remove.");
    return;
  }
  await optimisticDelete(
    "links",
    link.id,
    () => supabase.rpc("remove_household_member", { hid, target_user: link.userId }),
    "Couldn't remove that member"
  );
}

export async function leaveHousehold(): Promise<void> {
  const hid = requireHouseholdId();
  const { error } = await supabase.rpc("leave_household", { hid });
  if (error) {
    if (__DEV__) console.warn("[data] leave_household failed:", error.code, error.message);
    showError(error.code === "42501" ? "Owners can't leave their household." : "Couldn't leave the household.");
    return;
  }
  await switchHousehold();
}

// Invite sharing ---------------------------------------------------------------

export function inviteLink(code: string): string {
  return `peting://join?code=${code}`;
}

/**
 * `url` is passed separately from `message` because messaging apps linkify the
 * url field reliably but not a custom scheme buried in text. The code leads the
 * message since it works for people who haven't installed the app yet.
 */
export async function shareInvite(invite: { code: string; expiresAt: number }): Promise<void> {
  const days = Math.max(1, Math.round((invite.expiresAt - Date.now()) / 86_400_000));
  const validity = days > 1 ? `${days} days` : "24 hours";
  try {
    await Share.share({
      title: "Join me on Peting",
      message: `Join me on Peting. Your invite code is ${invite.code} (valid ${validity}). Enter it on the Join screen, or tap: ${inviteLink(invite.code)}`,
      url: inviteLink(invite.code),
    });
  } catch {
    // The user dismissed the sheet.
  }
}

/** The bare XXXX-XXXX code, so it pastes straight into the join field. */
export async function copyInviteCode(code: string): Promise<void> {
  await Clipboard.setStringAsync(code);
  showToast({ kind: "info", text: "Code copied" });
}
