import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import type { HouseholdInvite } from "@/lib/data";

/**
 * One place that decides what an invite looks like when it leaves the app.
 * Used by Settings ▸ Family and the onboarding invite step so the two can't
 * drift — they used to build the same sentence twice, slightly differently.
 */

export function inviteLink(code: string) {
  return `petpal://join?code=${code}`;
}

export function inviteExpiryLabel(invite: HouseholdInvite) {
  return invite.expiresAt - Date.now() > 26 * 3_600_000 ? "7 days" : "24 hours";
}

/**
 * Share sheet payload. `url` is passed SEPARATELY from `message`, not just
 * concatenated into it: messaging apps linkify the url field reliably, whereas
 * a custom scheme buried in a text blob usually arrives as dead plain text.
 *
 * The code leads the message because that is the part a person can read out,
 * type in by hand, or paste — the deep link only works for someone who already
 * has the app installed on the device they're reading the message on.
 */
export async function shareInvite(invite: Pick<HouseholdInvite, "code" | "expiresAt">) {
  const expiry = inviteExpiryLabel(invite as HouseholdInvite);
  try {
    await Share.share({
      title: "Join our PetPal household",
      message: `Join our PetPal household. Your invite code is ${invite.code} — valid ${expiry}. Enter it in PetPal under Settings ▸ Household ▸ Join a household, or tap: ${inviteLink(invite.code)}`,
      url: inviteLink(invite.code),
    });
  } catch {
    // cancelled
  }
}

/** Copies the bare XXXX-XXXX code — nothing else, so it can be pasted straight
 * into the join screen's code field. */
export async function copyInviteCode(code: string) {
  await Clipboard.setStringAsync(code);
}

/** Legacy pre-0027 fallback: the permanent family-ID link. */
export async function shareFamilyIdLink(familyId: string) {
  try {
    await Share.share({
      title: "Join our PetPal household",
      message: `Join our PetPal household to share pet care: petpal://join?f=${familyId}`,
      url: `petpal://join?f=${familyId}`,
    });
  } catch {
    // cancelled
  }
}
