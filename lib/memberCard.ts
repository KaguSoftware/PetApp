import type { IconName } from "@/components/Icons";

/**
 * How a family card LOOKS: the icon on the avatar and the gradient behind it.
 *
 * Both live in columns the shared backend already has (`members.emoji`,
 * `members.gradient_from` / `gradient_to`), so picking one needs no migration
 * and the web demo keeps rendering the same card.
 */

export type MemberIcon = { id: IconName; emoji: string; label: string };

/**
 * The icon is stored as an EMOJI GLYPH rather than as our own icon name,
 * because the web demo renders that column as plain text — storing `"paw"`
 * there would literally print "paw" on the web card. Mobile maps the glyph
 * back to the app's stroke icon set, since the UI language here is stroke
 * icons, not emoji.
 */
export const MEMBER_ICONS: MemberIcon[] = [
  { id: "person", emoji: "👤", label: "Person" },
  { id: "people", emoji: "👪", label: "Family" },
  { id: "paw", emoji: "🐾", label: "Paw" },
  { id: "heart-text", emoji: "❤️", label: "Heart" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "sparkles", emoji: "✨", label: "Sparkles" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "sun", emoji: "☀️", label: "Sun" },
  { id: "moon", emoji: "🌙", label: "Moon" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "home", emoji: "🏠", label: "Home" },
  { id: "bowl", emoji: "🍽️", label: "Bowl" },
  { id: "stethoscope", emoji: "🩺", label: "Vet" },
  { id: "scissors", emoji: "✂️", label: "Groomer" },
  { id: "yarn", emoji: "🧶", label: "Yarn" },
  { id: "gift", emoji: "🎁", label: "Gift" },
];

/**
 * What an untouched card stores. The server-side join/create RPCs seed '🧑' and
 * '🧑‍💻'; neither is in MEMBER_ICONS on purpose — "never chosen" renders as the
 * person's initial, which tells a household of five apart far better than five
 * identical person glyphs.
 */
export const DEFAULT_MEMBER_EMOJI = "🧑";

const ICON_BY_EMOJI = new Map(MEMBER_ICONS.map((i) => [i.emoji, i.id]));

/** The stroke icon for a stored glyph, or null to fall back to the initial. */
export function memberIconFor(emoji: string | null | undefined): IconName | null {
  if (!emoji) return null;
  return ICON_BY_EMOJI.get(emoji) ?? null;
}

/**
 * Avatar gradients. `addMember` cycles through them for new cards; the edit
 * sheet lets anyone pick one — which matters more than it looks, because the
 * server-side RPCs seed `oklch(...)` strings that `safeGradient` can't parse,
 * so every account that joined via an invite starts on the fallback accent.
 */
export const MEMBER_GRADIENTS: [string, string][] = [
  ["#4385e4", "#544ec5"],
  ["#db6ea5", "#c43e49"],
  ["#24ab7e", "#00848c"],
  ["#cd9c1f", "#cf630d"],
  ["#00969f", "#00649e"],
  ["#40a35c", "#007a5f"],
  ["#a06ee0", "#6d3fbd"],
  ["#5b6b7f", "#333d4d"],
];

/** Same gradient? Compared by value — the arrays come from separate objects. */
export function sameGradient(a: [string, string], b: [string, string]) {
  return a[0] === b[0] && a[1] === b[1];
}
