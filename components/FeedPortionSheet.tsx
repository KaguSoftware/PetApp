import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { AccentButton, PressableScale, Segmented, SheetFooter, SheetSubtitle, SheetTitle } from "@/components/ui";
import { PORTIONS, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** Opt-in "they drank too" tick that rides along with a feeding — food and
 *  water almost always happen in the same trip to the bowls, and making that a
 *  second trip through the sheet is why water logs go missing. */
function WaterCheck({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tone = ACTION_ICON.water;
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="Drank water too"
    >
      <View style={[styles.waterRow, checked && styles.waterRowOn]}>
        <View style={[styles.waterIcon, { backgroundColor: tone.bg }]}>
          <Icon name={tone.icon} size={17} color={tone.tint} />
        </View>
        <Text style={styles.waterLabel}>Drank water too</Text>
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? <Icon name="check" size={13} color={colors.white} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

/** Portion picker for logging a feeding (plus the "give a treat instead" path).
 *  Shared by the Logs tab and the Care tab's Today checklist. */
export default function FeedPortionSheet({
  pet,
  open,
  onClose,
  onLogged,
  presetGrams,
}: {
  pet: Pet;
  open: boolean;
  onClose: () => void;
  /** Called after a feeding was successfully logged (not for treats). */
  onLogged?: () => void;
  /** Preselect the portion nearest this many grams — the upcoming meal slot's portion. */
  presetGrams?: number;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { logAction, useSupply: consumeSupply, toast } = useStore();
  const [fraction, setFraction] = useState<(typeof PORTIONS)[number]["value"]>("1");
  const [alsoWater, setAlsoWater] = useState(false);
  const treatsSupply = pet.supplies.find((s) => s.icon === "star");

  // Never carries over — an unnoticed sticky tick would log phantom water.
  useEffect(() => {
    if (open) setAlsoWater(false);
  }, [open]);

  // When the sheet opens with a scheduled portion, start from it.
  useEffect(() => {
    if (!open || presetGrams == null || pet.cupGrams <= 0) return;
    const frac = presetGrams / pet.cupGrams;
    const nearest = PORTIONS.reduce((best, p) => (Math.abs(p.frac - frac) < Math.abs(best.frac - frac) ? p : best));
    setFraction(nearest.value);
  }, [open, presetGrams, pet.cupGrams]);

  // A separate water entry, exactly as if it had been logged on its own — same
  // coins, same streak, same schedule tick.
  const logWater = () => {
    if (alsoWater) logAction(pet.id, "water");
  };

  const confirmFeed = () => {
    const frac = PORTIONS.find((p) => p.value === fraction)?.frac ?? 1;
    const logged = logAction(pet.id, "fed", frac * pet.cupGrams);
    logWater();
    onClose();
    if (logged) onLogged?.();
  };

  const confirmTreat = () => {
    if (!treatsSupply) return;
    if (treatsSupply.level <= 0) {
      toast("alert", "Out of stock", `${pet.name}'s ${treatsSupply.name.toLowerCase()} supply is empty — restock before giving another`);
      return;
    }
    consumeSupply(pet.id, treatsSupply.id);
    // The tick is about the pet drinking, not about which bowl you filled —
    // honour it here too rather than silently dropping it on the treat path.
    logWater();
    onClose();
    toast("star", `${pet.name} got a treat`, `${treatsSupply.name} · ${Math.max(0, treatsSupply.level - 15)}% left`);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>How much food?</SheetTitle>
      <SheetSubtitle>
        For {pet.name} · {pet.cupGrams} g per full cup
      </SheetSubtitle>
      <View style={{ marginTop: 20 }}>
        <Segmented options={PORTIONS} value={fraction} onChange={setFraction} />
      </View>
      <View style={{ marginTop: 10 }}>
        <WaterCheck checked={alsoWater} onToggle={() => setAlsoWater((v) => !v)} />
      </View>
      <SheetFooter>
        <AccentButton onPress={confirmFeed}>Log feeding</AccentButton>
      </SheetFooter>
      {treatsSupply ? (
        <View style={styles.treatBlock}>
          <Text style={styles.treatTitle}>Give a treat instead?</Text>
          <SheetSubtitle>
            {treatsSupply.name} · {treatsSupply.level}% left
          </SheetSubtitle>
          <View style={{ marginTop: 12 }}>
            <AccentButton variant="tinted" onPress={confirmTreat}>
              Give treat
            </AccentButton>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    treatBlock: { marginTop: 28, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, paddingTop: 20 },
    treatTitle: { fontSize: 15, fontFamily: font.bold, color: colors.label, paddingHorizontal: 4 },
    waterRow: {
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.fill,
      borderWidth: 1,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 10,
    },
    waterRowOn: { backgroundColor: colors.accentSoft, borderColor: withAlpha(colors.accent, 0.35) },
    waterIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    waterLabel: { flex: 1, fontSize: 15, fontFamily: font.semibold, color: colors.label },
    box: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: withAlpha(colors.label, 0.25),
      alignItems: "center",
      justifyContent: "center",
    },
    boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  });
