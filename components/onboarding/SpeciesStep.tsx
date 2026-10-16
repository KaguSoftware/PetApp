import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Species } from "@/data";
import { Icon, layout, MenuRow, PressableScale, radius, Text, useTheme } from "@/ui";
import { isMainSpecies, MAIN_SPECIES, OTHER_SPECIES } from "./species";

interface Props {
  species: Species | null;
  onChange: (s: Species) => void;
}

/** Step 1: three big rounded choices (Dog, Cat, Other); "Other" adds a native menu for the exact kind. */
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
              <Icon name={s.icon} size={28} color={selected ? colors.bg : colors.ink} />
              <Text variant="title" style={{ color: selected ? colors.bg : colors.ink }}>
                {s.label}
              </Text>
            </PressableScale>
          );
        })}
        {otherOpen ? (
          <MenuRow<Species> label="Kind of pet" placeholder="Choose" options={OTHER_SPECIES} selected={species} onSelect={onChange} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.section },
  center: { textAlign: "center" },
  col: { gap: layout.item },
  choice: {
    minHeight: 72,
    borderRadius: radius.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.item + 4,
    paddingHorizontal: layout.section - 4,
  },
});
