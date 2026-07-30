import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { captureRef } from "react-native-view-shot";
import { CARD_H, CARD_W, SHARE_SCALE } from "@/components/PetShareCard";
import type { Pet } from "@/lib/data";

/**
 * One place that decides what a pet looks like when it leaves the app —
 * the image counterpart to lib/inviteShare.ts.
 *
 * Instagram, WhatsApp status and the like are image surfaces: a text-only
 * share arrives as a wall of "Weight: 4.2 kg" lines, which is why the card
 * needed a template. We capture the off-screen <PetShareCard/> and hand the
 * PNG to the OS share sheet.
 */

/**
 * The caption that goes out with the poster.
 *
 * Written as a social post, not as a copy of the card: the image already states
 * the pet's name, breed and the two facts, so repeating them reads like a data
 * dump under a picture. The emergency variant is the exception — if someone is
 * posting a lost pet, the caption has to carry the actionable details as TEXT,
 * because a phone number baked into a JPEG can't be tapped, copied, or read by
 * a screen reader, and reposts routinely crop the image.
 *
 * Deliberately no link: there's no App Store listing yet, and a dead URL in a
 * caption is worse than none. `SIGNOFF` is the single place to add one later.
 */
const SIGNOFF = "Made with PetPal";

/** Hashtags are how pet posts actually get found; kept short and non-spammy. */
const TAGS: Record<"emergency" | "profile", string[]> = {
  emergency: ["#lostpet", "#helpmefindmyway", "#petpal"],
  profile: ["#petpal", "#petsofinstagram"],
};

export function petCaption(pet: Pet, variant: "emergency" | "profile", subtitle: string): string {
  const species = pet.species === "cat" ? "cat" : "dog";
  const lines: string[] =
    variant === "emergency"
      ? [
          `🚨 Please share — this is ${pet.name}, our ${pet.breed} ${species}.`,
          "",
          `If you see ${pet.name}, or you're looking after them, everything you need to reach us is on the card.`,
          ...(pet.allergies ? ["", `⚠️ Important: ${pet.allergies}`] : []),
        ]
      : [`Meet ${pet.name} 💚`, "", subtitle];
  return [...lines, "", SIGNOFF, "", TAGS[variant].join(" ")].join("\n");
}

/** Rasterises the off-screen template to a PNG in the cache dir. */
export async function capturePetCard(ref: Parameters<typeof captureRef>[0]): Promise<string> {
  return captureRef(ref, {
    format: "png",
    quality: 1,
    // Explicit pixel size rather than `pixelRatio`, so a 1080x1920 image comes
    // off a 2x phone and a 3x phone alike.
    width: CARD_W * SHARE_SCALE,
    height: CARD_H * SHARE_SCALE,
    result: "tmpfile",
  });
}

/**
 * Shares the rendered poster and puts the caption on the clipboard.
 *
 * The caption cannot ride along with the image. `expo-sharing` sends a file and
 * nothing else, and RN's `Share.share` — which does take both — has most iOS
 * targets accept one or the other, with Instagram and Photos dropping the image
 * outright when text is attached. Losing the poster to gain a caption is the
 * wrong trade, so the image goes through the sheet and the caption goes to the
 * clipboard, ready to paste into the post. `onCaptionCopied` lets the caller say
 * so, because a silent clipboard write is indistinguishable from nothing
 * happening.
 *
 * Without a share UI (simulator, web) there's no image path at all, so the
 * caption is sent as the message instead — the button is never a dead end.
 */
export async function sharePetCardImage(
  uri: string,
  opts: { dialogTitle: string; caption: string; onCaptionCopied?: () => void }
) {
  if (!(await Sharing.isAvailableAsync())) {
    await Share.share({ title: opts.dialogTitle, message: opts.caption });
    return;
  }
  // Copy BEFORE presenting: the share sheet blocks until dismissed, and on some
  // targets the app is backgrounded, where clipboard writes can be dropped.
  await Clipboard.setStringAsync(opts.caption);
  opts.onCaptionCopied?.();
  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: opts.dialogTitle,
  });
}
