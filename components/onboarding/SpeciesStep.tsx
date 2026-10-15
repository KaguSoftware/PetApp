import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { Species } from "@/data";
import { Mascot } from "@/components/mascot";
import { Chip, PressableScale, Text, borderWidth, spacing, useTheme } from "@/ui";
import { isMainSpecies, MAIN_SPECIES, OTHER_SPECIES } from "./species";

interface Props {
  species: Species | null;
  onChange: (s: Species) => void;
}

/** Step 1: big round species choices, each with a small mascot that bounces when picked. */
export function SpeciesStep({ species, onChange }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [tick, setTick] = useState(0);
  const [otherOpen, setOtherOpen] = useState(species !== null && !isMainSpecies(species));

  const disc = Math.min(132, Math.floor((width - spacing.xl * 2 - spacing.md * 2) / 3));
  const activeMain = isMainSpecies(species) ? species : species ? "other" : null;

  function pick(value: "dog" | "cat" | "other") {
    setTick((t) => t + 1);
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
      <Text variant="display" style={styles.center} accessibilityRole="header">
        Who&apos;s joining the family?
      </Text>
      <View style={styles.row}>
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
              style={styles.choice}
            >
              <View
                style={[
                  styles.disc,
                  {
                    width: disc,
                    height: disc,
                    borderRadius: disc / 2,
                    backgroundColor: colors.tones[s.tone].bg,
                    borderColor: selected ? colors.ink : colors.surface,
                  },
                ]}
              >
                <Mascot
                  species={s.value}
                  size={disc * 0.82}
                  mood={selected ? "happy" : "content"}
                  animated={selected}
                  reaction={{ type: "bounce", key: selected ? tick : 0 }}
                />
              </View>
              <Text variant="label">{s.label}</Text>
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
  row: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  choice: { alignItems: "center", gap: spacing.sm, minHeight: 44 },
  disc: { alignItems: "center", justifyContent: "center", borderWidth: borderWidth + 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
