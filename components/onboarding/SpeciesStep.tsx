import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Species } from "@/data";
import { Chip, PressableScale, Text, radius, spacing, useTheme } from "@/ui";
import { isMainSpecies, MAIN_SPECIES, OTHER_SPECIES } from "./species";

interface Props {
  species: Species | null;
  onChange: (s: Species) => void;
}

/** Step 1: three big text choices (Dog, Cat, Other). Phase 2 may add line icons. */
export function SpeciesStep({ species, onChange }: Props) {
  const { colors } = useTheme();
  const [otherOpen, setOtherOpen] = useState(species !== null && !isMainSpecies(species));

  const activeMain = isMainSpecies(species) ? species : species ? "other" : null;

  function pick(value: "dog" | "cat" | "other") {
    if (value === "other") {
      setOtherOpen(true);
      // Keep an already-chosen extra species; otherwise default until they refine it.
      if (isMainSpecies(species) || species === null) onChange("other");
      return;
    }
    setOtherOpen(false);
    onChange(value);
  }

  return (
    <View style={styles.wrap}>
      <Text variant="largeTitle" style={styles.center} accessibilityRole="header">
        Who&apos;s joining the family?
      </Text>
      <View style={styles.col}>
        {MAIN_SPECIES.map((s) => {
          const selected = activeMain === s.value;
          return (
            <PressableScale
              key={s.value}
              onPress={() => pick(s.value)}
              haptic="select"
              accessibilityRole="button"
              accessibilityLabel={s.label}
              accessibilityState={{ selected }}
              style={[styles.choice, { backgroundColor: selected ? colors.ink : colors.surface }]}
            >
              <Text variant="headline" style={{ color: selected ? colors.bg : colors.ink }}>
                {s.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {otherOpen ? (
        <View style={styles.chips}>
          {OTHER_SPECIES.map((o) => (
            <Chip key={o.value} label={o.label} selected={species === o.value} onPress={() => onChange(o.value)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing["2xl"] },
  center: { textAlign: "center" },
  col: { gap: spacing.md },
  choice: { minHeight: 64, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
