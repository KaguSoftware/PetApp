import { StyleSheet, View } from "react-native";
import { PressableScale, Text, radius, spacing, useTheme } from "@/ui";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}

/** Flat segmented control for a surface card: bg track, ink pill for the selection. */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: colors.bg, borderRadius: radius.pill }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: colors.ink }]}
          >
            <Text variant="callout" style={{ color: selected ? colors.bg : colors.ink, fontWeight: "600" }}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: spacing.xs },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
