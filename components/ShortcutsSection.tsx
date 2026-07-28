import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import PetAvatar from "@/components/PetAvatar";
import ShortcutBuilderSheet from "@/components/ShortcutBuilderSheet";
import { ACTION_ICON, Icon, type IconName } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL, SectionHeader } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { shortcutPets, shortcutTileLabel, type ActionType, type Pet, type Shortcut } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

const COLS = 2;
const GAP = 10;
const FLASH_MS = 900;

/**
 * Home "Shortcuts" — the three everyday logs are always there as fixed buttons
 * (food across both columns, then the bathroom chore and grooming beside each
 * other), and they act on whichever pet the Home carousel is showing. Anything
 * else the family repeats gets pinned underneath as a custom tile via the thin
 * "Add a custom shortcut" row. An Edit toggle reveals remove badges — only the
 * custom tiles can be removed; the three built-ins are permanent.
 */
export default function ShortcutsSection({ pet }: { pet?: Pet }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, logAction, deleteShortcut, toast } = useStore();
  const pets = state.pets;

  const [editing, setEditing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [portionShortcut, setPortionShortcut] = useState<Shortcut | null>(null);
  const [justLoggedId, setJustLoggedId] = useState<string | null>(null);
  const [gridW, setGridW] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Only show shortcuts that still cover at least one existing pet — a deleted
  // pet's rows are pruned server-side, but a stale local/degraded copy could linger.
  const shortcuts = state.shortcuts
    .filter((s) => s.petIds.some((id) => pets.some((p) => p.id === id)))
    .sort((a, b) => a.sort - b.sort);

  // Nothing left to edit once the custom list empties (e.g. the last tile was
  // just removed) — drop out of edit mode so a freshly added shortcut doesn't
  // land straight back into it.
  useEffect(() => {
    if (shortcuts.length === 0 && editing) setEditing(false);
  }, [shortcuts.length, editing]);

  // Nothing to log against yet — Home already shows its own empty state.
  if (!pet) return null;

  const flash = (id: string) => {
    setJustLoggedId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustLoggedId(null), FLASH_MS);
  };

  // Food has no baked-in portion here, so it always asks — same rule the
  // "ask each time" shortcut follows.
  const logQuick = (key: string, type: ActionType) => {
    if (logAction(pet.id, type)) flash(key);
  };

  const runShortcut = (s: Shortcut) => {
    const targets = shortcutPets(s, pets);
    if (targets.length === 0) return;
    // Single-pet fed with no baked-in portion → "ask each time": open the picker.
    if (s.type === "fed" && s.portionFrac == null && targets.length === 1) {
      setPortionShortcut(s);
      return;
    }
    let anyLogged = false;
    for (const target of targets) {
      // Grams are sized to each pet's own cup, so one bulk tap feeds a cat and a
      // dog their own correct amounts.
      const grams = s.type === "fed" ? (s.portionFrac ?? 1) * target.cupGrams : undefined;
      const medId =
        s.type === "meds" ? (target.meds.some((m) => m.id === s.medId) ? s.medId : target.meds[0]?.id) : undefined;
      if (logAction(target.id, s.type, grams, undefined, medId)) anyLogged = true;
    }
    if (anyLogged) flash(s.id);
  };

  const removeShortcut = (s: Shortcut) => {
    deleteShortcut(s.id);
    toast("trash", "Shortcut removed", shortcutTileLabel(s, pets));
  };

  const onGridLayout = (e: LayoutChangeEvent) => setGridW(e.nativeEvent.layout.width);
  const colW = gridW > 0 ? Math.floor((gridW - GAP * (COLS - 1)) / COLS) : 0;

  // Litter is cat-only and walks are dog-only — same split the Logs tab uses.
  // It's the one "bathroom" slot either way.
  const secondary: ActionType = pet.species === "cat" ? "litter" : "walk";
  const secondaryLabel = pet.species === "cat" ? "Litter" : "Walk";
  // Which pet a tap lands on is only in question once there's more than one.
  const badgePet = pets.length > 1 ? pet : undefined;

  const portionPet = portionShortcut ? shortcutPets(portionShortcut, pets)[0] ?? null : null;

  return (
    <View style={{ marginTop: 8 }}>
      <SectionHeader
        trailing={
          shortcuts.length > 0 ? (
            <PressableScale
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => setEditing((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={editing ? "Done editing shortcuts" : "Edit shortcuts"}
              hitSlop={10}
            >
              <Text style={styles.editLabel}>{editing ? "Done" : "Edit"}</Text>
            </PressableScale>
          ) : undefined
        }
      >
        Shortcuts
      </SectionHeader>

      <View style={styles.grid} onLayout={onGridLayout}>
        {colW > 0 ? (
          <>
            <QuickTile
              width={gridW}
              wide
              type="fed"
              label="Food"
              sublabel={`Log a meal for ${pet.name}`}
              badgePet={badgePet}
              justLogged={justLoggedId === "quick:fed"}
              onPress={() => setFeedOpen(true)}
            />
            <QuickTile
              width={colW}
              type={secondary}
              label={secondaryLabel}
              badgePet={badgePet}
              justLogged={justLoggedId === `quick:${secondary}`}
              onPress={() => logQuick(`quick:${secondary}`, secondary)}
            />
            <QuickTile
              width={colW}
              type="groomed"
              label="Groom"
              badgePet={badgePet}
              justLogged={justLoggedId === "quick:groomed"}
              onPress={() => logQuick("quick:groomed", "groomed")}
            />

            {shortcuts.map((s) => (
              <ShortcutTile
                key={s.id}
                shortcut={s}
                pets={pets}
                width={colW}
                editing={editing}
                justLogged={justLoggedId === s.id}
                onPress={() => runShortcut(s)}
                onRemove={() => removeShortcut(s)}
              />
            ))}
          </>
        ) : null}
      </View>

      <PressableScale
        onPress={() => setBuilderOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add a custom shortcut"
        style={{ marginTop: GAP }}
      >
        <View style={styles.addRow}>
          <Icon name="plus" size={14} color={colors.accent} />
          <Text style={styles.addRowLabel}>Add a custom shortcut</Text>
        </View>
      </PressableScale>

      <ShortcutBuilderSheet open={builderOpen} onClose={() => setBuilderOpen(false)} />

      <FeedPortionSheet pet={pet} open={feedOpen} onClose={() => setFeedOpen(false)} onLogged={() => flash("quick:fed")} />

      {portionPet ? (
        <FeedPortionSheet
          pet={portionPet}
          open={portionShortcut != null}
          onClose={() => setPortionShortcut(null)}
          onLogged={() => {
            if (portionShortcut) flash(portionShortcut.id);
          }}
        />
      ) : null}
    </View>
  );
}

/** The green check that sweeps over a tile's icon the moment its log lands. */
function useFlashStyle(justLogged: boolean) {
  const reduceMotion = useReduceMotion();
  const flash = useSharedValue(0);
  useEffect(() => {
    const target = justLogged ? 1 : 0;
    flash.value = reduceMotion
      ? target
      : withTiming(target, { duration: justLogged ? 140 : 260, easing: Easing.out(Easing.quad) });
  }, [justLogged, reduceMotion, flash]);
  return useAnimatedStyle(() => ({ opacity: flash.value }));
}

/** Up to two overlapping pet avatars plus a "+N" chip — who this tile logs for. */
function PetBadges({ covered }: { covered: Pet[] }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const shown = covered.slice(0, 2);
  const extra = covered.length - shown.length;
  return (
    <View style={styles.badgeCluster}>
      {shown.map((p, i) => (
        <View key={p.id} style={[styles.badgeItem, i > 0 && styles.badgeOverlap]}>
          <PetAvatar pet={p} size="xs" showCosmetics={false} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.badgeMore, styles.badgeOverlap]}>
          <Text style={styles.badgeMoreLabel}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** One of the three permanent buttons. `wide` spans both columns (food). */
function QuickTile({
  width,
  wide = false,
  type,
  label,
  sublabel,
  badgePet,
  justLogged,
  onPress,
}: {
  width: number;
  wide?: boolean;
  type: ActionType;
  label: string;
  sublabel?: string;
  badgePet?: Pet;
  justLogged: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const flashStyle = useFlashStyle(justLogged);
  const tone = ACTION_ICON[type];

  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      style={{ width }}
    >
      <View style={styles.tile}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: tone.bg }]}>
            <Icon name={tone.icon} size={wide ? 24 : 21} color={tone.tint} />
          </View>
          {badgePet ? <PetBadges covered={[badgePet]} /> : null}
          <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none">
            <Icon name="check" size={20} color={colors.white} />
          </Animated.View>
        </View>
        <View style={styles.tileText}>
          <Text numberOfLines={1} style={wide ? styles.tileTitleWide : styles.tileTitle}>
            {label}
          </Text>
          {sublabel ? (
            <Text numberOfLines={1} style={styles.tileSub}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        {wide ? <Icon name="chevron-right" size={13} color={colors.label3} /> : null}
      </View>
    </PressableScale>
  );
}

function ShortcutTile({
  shortcut,
  pets,
  width,
  editing,
  justLogged,
  onPress,
  onRemove,
}: {
  shortcut: Shortcut;
  pets: Pet[];
  width: number;
  editing: boolean;
  justLogged: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const flashStyle = useFlashStyle(justLogged);

  const tone = ACTION_ICON[shortcut.type];
  const covered = shortcutPets(shortcut, pets);
  const label = shortcutTileLabel(shortcut, pets);
  const who = covered.length === 1 ? covered[0].name : `${covered.length} pets`;

  return (
    <View style={{ width }}>
      <PressableScale haptic disabled={editing} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${who}`}>
        <View style={styles.tile}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: tone.bg }]}>
              <Icon name={shortcut.icon as IconName} size={21} color={tone.tint} />
            </View>
            <PetBadges covered={covered} />
            <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none">
              <Icon name="check" size={20} color={colors.white} />
            </Animated.View>
          </View>
          <View style={styles.tileText}>
            <Text numberOfLines={2} style={styles.tileTitle}>
              {label}
            </Text>
          </View>
        </View>
      </PressableScale>

      {editing ? (
        <PressableScale
          scaleTo={PRESS_SCALE_SMALL}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label} shortcut`}
          hitSlop={8}
          style={styles.removeBadge}
        >
          <View style={styles.removeBadgeInner}>
            <Icon name="xmark" size={13} color={colors.white} />
          </View>
        </PressableScale>
      ) : null}
    </View>
  );
}

const TILE_H = 76;
const ICON = 44;

const makeStyles = (colors: Colors) => StyleSheet.create({
  editLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    height: TILE_H,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
    ...cardShadow,
  },
  iconWrap: { width: ICON, height: ICON },
  iconCircle: { width: ICON, height: ICON, borderRadius: ICON / 2, alignItems: "center", justifyContent: "center" },
  tileText: { flex: 1, gap: 2 },
  tileTitle: { fontSize: 14, fontFamily: font.semibold, color: colors.label, lineHeight: 18 },
  tileTitleWide: { fontSize: 16, fontFamily: font.bold, color: colors.label, lineHeight: 20 },
  tileSub: { fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 16 },
  badgeCluster: { position: "absolute", right: -4, bottom: -4, flexDirection: "row", alignItems: "center" },
  badgeItem: { borderRadius: 999, borderWidth: 2, borderColor: colors.card, backgroundColor: colors.card },
  badgeOverlap: { marginLeft: -11 },
  badgeMore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeMoreLabel: { fontSize: 11, fontFamily: font.bold, color: colors.white },
  flash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ICON / 2,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  // Deliberately thin — a quiet affordance under the buttons, not a fourth tile
  // competing with them.
  addRow: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: withAlpha(colors.accent, 0.3),
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addRowLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  removeBadge: { position: "absolute", top: -6, left: -6, zIndex: 10, elevation: 10 },
  removeBadgeInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
