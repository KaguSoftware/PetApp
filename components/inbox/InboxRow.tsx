import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { actionTone, Icon } from "@/components/Icons";
import { FadeInItem } from "@/components/Motion";
import PetAvatar from "@/components/PetAvatar";
// The document primitives the Care page introduced. Two pages now set their
// bodies as a document, and one button shape between them is the point of it.
import { PageButton } from "@/components/plan/Chapter";
import { PressableScale, PRESS_SCALE_SMALL } from "@/components/ui";
import { toneColor } from "@/components/inbox/InboxSummary";
import type { InboxItem } from "@/lib/inbox";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/**
 * One thing the household is being told.
 *
 * Set as a document line, like the Care page: no card, no chevron column, the
 * label left and the time right, with a hairline under it. What it borrows from
 * the Logs tab instead is the *state* language — the time is drawn in the item's
 * tone, so a scan down the right-hand edge reads red-red-amber before it reads
 * a single word.
 *
 * There are exactly two targets. The circle on the left completes the thing
 * (44pt, a slim 28pt of ink) — that is the whole reason a reminder exists. The
 * body opens it, which is where everything rarer lives: the sentence explaining
 * what raised it, and the two or three places it can lead. Delete is in there
 * on purpose; a permanent × next to a permanent ✓ is two destructive-adjacent
 * targets a thumb-width apart, and this list is read in a hurry.
 */
export default function InboxRow({
  item,
  expanded,
  onToggleExpand,
  onComplete,
  onDelete,
  onOpenPet,
  onOpenVets,
  onOpenLogs,
  last,
}: {
  item: InboxItem;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Reminder/alert only — a care slot is answered by logging it, not by a tick. */
  onComplete?: () => void;
  onDelete?: () => void;
  onOpenPet: (petId: string) => void;
  onOpenVets: () => void;
  onOpenLogs: () => void;
  /** The chapter's last row drops its rule — the chapter's own rule follows. */
  last: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const tint = toneColor(colors, item.tone);
  const care = item.kind === "care";
  const glyph = item.action ? actionTone(colors, item.action) : undefined;

  const meta = [item.pet?.name, item.repeat ? `repeats ${item.repeat}` : null, item.tag]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.wrap, !last && styles.ruled]}>
      <View style={styles.line}>
        {/* Left: the completion target for a reminder, the lever's own glyph for
            a care slot. Same 44pt box either way, so every title starts on the
            same vertical. */}
        {onComplete ? (
          <PressableScale
            scaleTo={PRESS_SCALE_SMALL}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${item.title} as done`}
            accessibilityState={{ checked: false }}
          >
            <View style={styles.leadZone}>
              <View style={[styles.check, item.tone === "alert" && { borderColor: withAlpha(colors.red, 0.5) }]} />
            </View>
          </PressableScale>
        ) : (
          <View style={styles.leadZone}>
            <View style={[styles.glyph, { backgroundColor: glyph?.bg ?? colors.fill }]}>
              <Icon name={glyph?.icon ?? "clock"} size={16} color={glyph?.tint ?? colors.label2} />
            </View>
          </View>
        )}

        <PressableScale
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.when}`}
          accessibilityHint="Opens this item"
          style={styles.bodyPress}
        >
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={expanded ? undefined : 1} style={[styles.title, item.tone === "alert" && { color: colors.red }]}>
                {item.title}
              </Text>
              <Text numberOfLines={1} style={[styles.when, { color: tint }]}>
                {item.when}
              </Text>
            </View>
            {meta ? (
              <View style={styles.metaRow}>
                {item.pet ? <PetAvatar pet={item.pet} size="xs" showCosmetics={false} /> : null}
                <Text numberOfLines={1} style={styles.meta}>
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        </PressableScale>
      </View>

      {expanded ? (
        <FadeInItem style={styles.expand}>
          <Text style={styles.expandBody}>{item.body}</Text>
          <View style={styles.actions}>
            {item.vetId ? <PageButton label="Book a vet" tint={colors.vetTint} icon="cross" size="sm" onPress={onOpenVets} /> : null}
            {care ? <PageButton label="Log it" tint={colors.accent} icon="check" size="sm" onPress={onOpenLogs} /> : null}
            {item.pet ? (
              <PageButton
                label={`Open ${item.pet.name}`}
                tint={colors.accent}
                icon="paw"
                size="sm"
                chevron={false}
                onPress={() => onOpenPet(item.pet!.id)}
              />
            ) : null}
            {onDelete ? (
              <PageButton label="Delete" tint={colors.red} icon="trash" size="sm" chevron={false} onPress={onDelete} />
            ) : null}
          </View>
        </FadeInItem>
      ) : null}
    </View>
  );
}

/**
 * A completed reminder. Same line, spent: struck through, no time, and one
 * button to put it back. It is only ever seen inside the folded-away "Done"
 * chapter, so it doesn't have to carry any state on its face.
 */
export function DoneRow({ title, petName, onReopen, last }: { title: string; petName?: string; onReopen: () => void; last: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, !last && styles.ruled]}>
      <View style={styles.line}>
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          onPress={onReopen}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${title} as not done`}
          accessibilityState={{ checked: true }}
        >
          <View style={styles.leadZone}>
            <View style={[styles.check, styles.checkDone]}>
              <Icon name="check" size={14} color={colors.white} strokeWidth={2.6} />
            </View>
          </View>
        </PressableScale>
        <View style={styles.body}>
          <Text numberOfLines={1} style={[styles.title, styles.titleDone]}>
            {title}
          </Text>
          {petName ? (
            <Text numberOfLines={1} style={styles.meta}>
              {petName}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { paddingVertical: 10 },
    // Inset to where the titles start, so the rules read as the document's own
    // ruling rather than as the edges of invisible cards.
    ruled: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.sep },
    line: { flexDirection: "row", alignItems: "center" },
    leadZone: { width: 44, height: 44, marginVertical: -8, marginLeft: -8, alignItems: "center", justifyContent: "center" },
    check: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: withAlpha(colors.label, 0.25),
      alignItems: "center",
      justifyContent: "center",
    },
    checkDone: { borderColor: colors.accent, backgroundColor: colors.accent },
    glyph: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    bodyPress: { flex: 1 },
    body: { flex: 1, paddingLeft: 4 },
    titleRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
    title: { flex: 1, fontSize: 16, fontFamily: font.medium, letterSpacing: -0.2, color: colors.label },
    titleDone: { color: colors.label3, textDecorationLine: "line-through" },
    when: { flexShrink: 0, maxWidth: 150, fontSize: 12.5, fontFamily: font.semibold },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    meta: { flexShrink: 1, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
    expand: { paddingLeft: 40, paddingTop: 8, gap: 12 },
    expandBody: { fontSize: 14, fontFamily: font.regular, lineHeight: 20, color: colors.label2 },
    actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  });
