import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Sheet from "@/components/Sheet";
import { AccentButton, Segmented, SheetSubtitle, SheetTitle } from "@/components/ui";
import { PORTIONS, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, font } from "@/lib/theme";

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
  const { logAction, useSupply: consumeSupply, toast } = useStore();
  const [fraction, setFraction] = useState<(typeof PORTIONS)[number]["value"]>("1");
  const treatsSupply = pet.supplies.find((s) => s.icon === "star");

  // When the sheet opens with a scheduled portion, start from it.
  useEffect(() => {
    if (!open || presetGrams == null || pet.cupGrams <= 0) return;
    const frac = presetGrams / pet.cupGrams;
    const nearest = PORTIONS.reduce((best, p) => (Math.abs(p.frac - frac) < Math.abs(best.frac - frac) ? p : best));
    setFraction(nearest.value);
  }, [open, presetGrams, pet.cupGrams]);

  const confirmFeed = () => {
    const frac = PORTIONS.find((p) => p.value === fraction)?.frac ?? 1;
    const logged = logAction(pet.id, "fed", frac * pet.cupGrams);
    onClose();
    if (logged) onLogged?.();
  };

  const confirmTreat = () => {
    if (!treatsSupply) return;
    consumeSupply(pet.id, treatsSupply.id);
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
      <View style={{ marginTop: 28 }}>
        <AccentButton onPress={confirmFeed}>Log feeding</AccentButton>
      </View>
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

const styles = StyleSheet.create({
  treatBlock: { marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, paddingTop: 20 },
  treatTitle: { fontSize: 15, fontFamily: font.bold, color: colors.label, paddingHorizontal: 4 },
});
