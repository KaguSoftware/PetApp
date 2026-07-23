import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import PetAvatar from "@/components/PetAvatar";
import ShortcutBuilderSheet from "@/components/ShortcutBuilderSheet";
import { ACTION_ICON, Icon, type IconName } from "@/components/Icons";
import { AccentButton, IconCircle, PressableScale, PRESS_SCALE_SMALL, SectionHeader } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { shortcutPets, shortcutTileLabel, type Pet, type Shortcut } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius, withAlpha } from "@/lib/theme";

const COLS = 3;
const GAP = 10;
const FLASH_MS = 900;

/**
 * Home "Shortcuts" — a launcher grid of one-tap care logs. Each tile pins a
 * (pets, action[, portion/med]) so a repeated log is a single tap; a tile can
 * cover one pet or the whole household ("Fed all"). Tapping logs immediately
 * (single-pet fed "ask each time" opens the portion picker); an Edit toggle
 * reveals per-tile remove badges.
 */
export default function ShortcutsSection() {
  const { state, logAction, deleteShortcut, toast } = useStore();
  const pets = state.pets;

  const [editing, setEditing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
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

  // Nothing left to edit once the list empties (e.g. the last tile was just
  // removed) — drop out of edit mode so a freshly added shortcut doesn't land
  // straight back into it.
  useEffect(() => {
    if (shortcuts.length === 0 && editing) setEditing(false);
  }, [shortcuts.length, editing]);

  // Nothing to pin a shortcut to yet — Home already shows its own empty state.
  if (pets.length === 0) return null;

  const flash = (id: string) => {
    setJustLoggedId(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustLoggedId(null), FLASH_MS);
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
    for (const pet of targets) {
      // Grams are sized to each pet's own cup, so one bulk tap feeds a cat and a
      // dog their own correct amounts.
      const grams = s.type === "fed" ? (s.portionFrac ?? 1) * pet.cupGrams : undefined;
      const medId = s.type === "meds" ? (pet.meds.some((m) => m.id === s.medId) ? s.medId : pet.meds[0]?.id) : undefined;
      if (logAction(pet.id, s.type, grams, undefined, medId)) anyLogged = true;
    }
    if (anyLogged) flash(s.id);
  };

  const removeShortcut = (s: Shortcut) => {
    deleteShortcut(s.id);
    toast("trash", "Shortcut removed", shortcutTileLabel(s, pets));
  };

  const onGridLayout = (e: LayoutChangeEvent) => setGridW(e.nativeEvent.layout.width);
  const tileW = gridW > 0 ? Math.floor((gridW - GAP * (COLS - 1)) / COLS) : 0;

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

      {shortcuts.length === 0 ? (
        <View style={styles.emptyCard}>
          <IconCircle icon="sparkles" tint={colors.accent} bg={colors.accentSoft} size={44} iconSize={22} />
          <Text style={styles.emptyTitle}>One-tap logging</Text>
          <Text style={styles.emptyBody}>
            Pin the things you log every day, a feeding, the litter box, a walk, and they&apos;re a single tap from Home. One
            tile can even cover every pet at once.
          </Text>
          <View style={{ marginTop: 14, alignSelf: "stretch" }}>
            <AccentButton variant="tinted" size="sm" onPress={() => setBuilderOpen(true)}>
              Add a shortcut
            </AccentButton>
          </View>
        </View>
      ) : (
        <View style={styles.grid} onLayout={onGridLayout}>
          {tileW > 0
            ? shortcuts.map((s) => (
                <ShortcutTile
                  key={s.id}
                  shortcut={s}
                  pets={pets}
                  width={tileW}
                  editing={editing}
                  justLogged={justLoggedId === s.id}
                  onPress={() => runShortcut(s)}
                  onRemove={() => removeShortcut(s)}
                />
              ))
            : null}
          {tileW > 0 && !editing ? <AddTile width={tileW} onPress={() => setBuilderOpen(true)} /> : null}
        </View>
      )}

      <ShortcutBuilderSheet open={builderOpen} onClose={() => setBuilderOpen(false)} />

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

/** Up to two overlapping pet avatars plus a "+N" chip — who this tile logs for. */
function PetBadges({ covered }: { covered: Pet[] }) {
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
  const reduceMotion = useReduceMotion();
  const flash = useSharedValue(0);
  useEffect(() => {
    const target = justLogged ? 1 : 0;
    flash.value = reduceMotion ? target : withTiming(target, { duration: justLogged ? 140 : 260, easing: Easing.out(Easing.quad) });
  }, [justLogged, reduceMotion, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

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
              <Icon name={shortcut.icon as IconName} size={24} color={tone.tint} />
            </View>
            <PetBadges covered={covered} />
            <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none">
              <Icon name="check" size={22} color={colors.white} />
            </Animated.View>
          </View>
          <Text numberOfLines={2} style={styles.tileLabel}>
            {label}
          </Text>
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

function AddTile({ width, onPress }: { width: number; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel="Add a shortcut" style={{ width }}>
      <View style={[styles.tile, styles.addTile]}>
        <View style={styles.addCircle}>
          <Icon name="plus" size={22} color={colors.accent} />
        </View>
        <Text numberOfLines={1} style={styles.addLabel}>
          Add
        </Text>
      </View>
    </PressableScale>
  );
}

const TILE_MIN_H = 116;

const styles = StyleSheet.create({
  editLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.accent },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    minHeight: TILE_MIN_H,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 8,
    ...cardShadow,
  },
  iconWrap: { width: 52, height: 52 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
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
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontSize: 12.5, fontFamily: font.semibold, color: colors.label, textAlign: "center", lineHeight: 16 },
  addTile: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: withAlpha(colors.accent, 0.35),
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
  },
  addCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  addLabel: { fontSize: 12.5, fontFamily: font.semibold, color: colors.accent, textAlign: "center" },
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
  emptyCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    ...cardShadow,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontFamily: font.bold, color: colors.label },
  emptyBody: { marginTop: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center", lineHeight: 19 },
});
