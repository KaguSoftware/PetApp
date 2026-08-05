import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import ShortcutBuilderSheet from "@/components/ShortcutBuilderSheet";
import { PageButton } from "@/components/plan/Chapter";
import { shortcutPets, shortcutTileLabel, type Pet, type Shortcut } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";
import type { IconName } from "@/components/Icons";

/** How long a run stays green before the button says its own name again. */
const FLASH_MS = 1100;

/**
 * The family's own one-tap logs, as buttons.
 *
 * This was a two-column grid of shadowed tiles, each with an icon disc on its
 * left, which gave the page a second hard column and a second container
 * vocabulary. It is now one wrapping row in the page's single button shape —
 * tinted fill, hairline border, no shadow — so a shortcut looks like every
 * other control in the app and nothing else on Home is rounded or filled.
 *
 * The three built-in quick logs are gone rather than moved: the value on each
 * pet's own care line already logs that lever, so a fixed "Groom" tile was a
 * second door to a thing already one tap away. What survives here is what only
 * a family can define — "Feed all", "Evening meds", the combinations no default
 * can guess.
 *
 * Removing is a recolour, not a badge. Edit turns every shortcut red in place
 * and a tap deletes; nothing sprouts a corner cross.
 */
export default function QuickRow() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, logAction, deleteShortcut, toast } = useStore();
  const pets = state.pets;

  const [editing, setEditing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [portionFor, setPortionFor] = useState<{ shortcut: Shortcut; pet: Pet } | null>(null);
  const [portionOpen, setPortionOpen] = useState(false);
  const [flashed, setFlashed] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Only shortcuts that still cover a pet that exists. Deleted pets' rows are
  // pruned server-side, but a stale local/degraded copy can linger.
  const shortcuts = state.shortcuts
    .filter((s) => s.petIds.some((id) => pets.some((p) => p.id === id)))
    .sort((a, b) => a.sort - b.sort);

  // Nothing left to edit once the list empties — drop out, so a freshly pinned
  // shortcut doesn't land straight into a delete-on-tap row.
  useEffect(() => {
    if (shortcuts.length === 0 && editing) setEditing(false);
  }, [shortcuts.length, editing]);

  const flash = (id: string) => {
    setFlashed(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashed(null), FLASH_MS);
  };

  const run = (s: Shortcut) => {
    const targets = shortcutPets(s, pets);
    if (targets.length === 0) return;
    // Single-pet feeding with no baked-in portion is the "ask each time" case.
    if (s.type === "fed" && s.portionFrac == null && targets.length === 1) {
      setPortionFor({ shortcut: s, pet: targets[0] });
      setPortionOpen(true);
      return;
    }
    let logged = false;
    for (const target of targets) {
      // Grams are sized to each pet's own cup, so one bulk tap feeds a cat and
      // a dog their own correct amounts.
      const grams = s.type === "fed" ? (s.portionFrac ?? 1) * target.cupGrams : undefined;
      const medId = s.type === "meds" ? (target.meds.some((m) => m.id === s.medId) ? s.medId : target.meds[0]?.id) : undefined;
      if (logAction(target.id, s.type, grams, undefined, medId)) logged = true;
    }
    if (logged) flash(s.id);
  };

  const remove = (s: Shortcut) => {
    deleteShortcut(s.id);
    toast("trash", "Shortcut removed", shortcutTileLabel(s, pets));
  };

  return (
    <View>
      {shortcuts.length === 0 ? (
        <Text style={styles.teach}>
          Pin the combinations only your family knows — everyone fed at once, the evening dose, the after-work walk.
        </Text>
      ) : null}

      <View style={styles.row}>
        {shortcuts.map((s) => {
          const covered = shortcutPets(s, pets);
          // Who a tile logs for used to be told by avatar badges pinned to its
          // icon disc. With the disc gone the label says it in words, and only
          // when it needs to: a shortcut covering the whole household already
          // reads "Fed all", and a one-pet home has nothing to disambiguate.
          const base = shortcutTileLabel(s, pets);
          const label =
            pets.length > 1 && covered.length < pets.length
              ? `${base} · ${covered.length === 1 ? covered[0].name : `${covered.length} pets`}`
              : base;
          const justRan = flashed === s.id;
          return (
            <PageButton
              key={s.id}
              label={justRan ? "Logged" : label}
              tint={justRan ? colors.green : editing ? colors.red : colors.accent}
              icon={justRan ? "check" : (s.icon as IconName)}
              chevron={false}
              onPress={() => (editing ? remove(s) : run(s))}
            />
          );
        })}

        <PageButton
          label="Pin a log"
          tint={colors.label2}
          icon="plus"
          chevron={false}
          onPress={() => setBuilderOpen(true)}
        />

        {shortcuts.length > 0 ? (
          <PageButton
            label={editing ? "Done" : "Edit"}
            tint={editing ? colors.red : colors.label3}
            size="sm"
            chevron={false}
            onPress={() => setEditing((v) => !v)}
          />
        ) : null}
      </View>

      {editing ? <Text style={styles.editHint}>Tap a shortcut to remove it.</Text> : null}

      <ShortcutBuilderSheet open={builderOpen} onClose={() => setBuilderOpen(false)} />

      {/* The target outlives `open` so the sheet can slide away instead of
          unmounting mid-dismiss and vanishing. */}
      {portionFor ? (
        <FeedPortionSheet
          pet={portionFor.pet}
          open={portionOpen}
          onClose={() => setPortionOpen(false)}
          onLogged={() => flash(portionFor.shortcut.id)}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    teach: { paddingTop: 12, maxWidth: 360, fontSize: 14.5, fontFamily: font.regular, lineHeight: 21, color: colors.label2 },
    row: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    editHint: { marginTop: 10, fontSize: 12.5, fontFamily: font.medium, color: colors.red },
  });
