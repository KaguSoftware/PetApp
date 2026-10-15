import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { borderWidth, spacing, type Tone } from "./tokens";

export interface RoundTileProps {
  icon: IconName;
  label: string;
  tone: Tone;
  onPress: () => void;
  onLongPress?: () => void;
  /** Diameter of the round disc. */
  size?: number;
}

/** Big round icon tile with a label underneath; the log grid is made of these. */
export function RoundTile({ icon, label, tone, onPress, onLongPress, size = 76 }: RoundTileProps) {
  const { colors } = useTheme();
  const t = colors.tones[tone];
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.9}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.tile}
    >
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, borderColor: colors.surface },
        ]}
      >
        <Icon name={icon} size={size * 0.42} color={t.fg} strokeWidth={2.4} />
      </View>
      <Text variant="label" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", gap: spacing.sm, minWidth: 44, minHeight: 44 },
  disc: { alignItems: "center", justifyContent: "center", borderWidth },
  label: { fontSize: 14, lineHeight: 18 },
});
